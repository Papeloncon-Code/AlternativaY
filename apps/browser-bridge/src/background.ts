import type { FetchRequest, FetchResponse, Rule } from './types';

let ruleIdCounter = 4;
const allowedHostSuffixes = [
  'youtube.com',
  'googlevideo.com',
  'googleapis.com',
  'ytimg.com',
  'ggpht.com',
];

function isAllowedUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === 'https:' &&
      allowedHostSuffixes.some((suffix) => url.hostname === suffix || url.hostname.endsWith('.' + suffix));
  } catch {
    return false;
  }
}

async function addNetRequestRules(rules: Rule[]): Promise<number[]> {
  const withIds = rules.map((rule) => ({ ...rule, id: ruleIdCounter++ }));
  await chrome.declarativeNetRequest.updateSessionRules({ addRules: withIds });
  return withIds.map((rule) => rule.id);
}

async function removeNetRequestRules(ids: number[]): Promise<void> {
  if (ids.length) await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ids });
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function handleFetchRequest(request: FetchRequest, sendResponse: (response: FetchResponse) => void): Promise<void> {
  let addedRuleIds: number[] = [];

  try {
    if (!isAllowedUrl(request.url)) {
      throw new Error('TodoTube Bridge bloqueó un destino que no pertenece a los dominios permitidos.');
    }

    const options = request.options ?? {};
    const headers = { ...(options.headers as Record<string, string> | undefined) };
    headers.origin = 'https://www.youtube.com';

    const requestHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] =
      Object.entries(headers).map(([header, value]) => ({ header, operation: 'set', value }));

    addedRuleIds = await addNetRequestRules([{
      action: { type: 'modifyHeaders', requestHeaders },
      condition: {
        urlFilter: request.url,
        resourceTypes: ['xmlhttprequest', 'main_frame'],
      },
      priority: 2,
    }]);

    let body = options.body;
    if (typeof body === 'string' && (options.method || 'POST') !== 'GET') {
      try {
        const binary = atob(body);
        body = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      } catch {
        // Text bodies remain strings.
      }
    }

    const response = await fetch(request.url, {
      method: typeof options.method === 'string' ? options.method : 'GET',
      body: body as BodyInit | null | undefined,
      headers: {},
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow',
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => { responseHeaders[key] = value; });

    const contentType = response.headers.get('content-type') ?? '';
    let data: unknown;
    if (contentType.includes('application/json') || contentType.includes('text/')) {
      data = await response.text();
      if (contentType.includes('application/json')) {
        try { data = JSON.parse(data as string); } catch { /* some ProtoJSON bodies are text */ }
      }
    } else {
      data = encodeBase64(new Uint8Array(await response.arrayBuffer()));
    }

    sendResponse({
      success: true,
      data,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      url: response.url,
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await removeNetRequestRules(addedRuleIds).catch((error) => {
      console.error('[TodoTube Bridge] Failed to remove temporary network rules:', error);
    });
  }
}

chrome.runtime.onMessage.addListener((message: FetchRequest, _sender, sendResponse) => {
  if (message?.action === 'fetch') {
    void handleFetchRequest(message, sendResponse);
    return true;
  }
  return false;
});
