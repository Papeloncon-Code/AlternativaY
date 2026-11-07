// TodoTube Puente · derivado de ytc-bridge (MIT, © 2025 LuanRT), endurecido: solo hosts permitidos y solo para TodoTube.
const api = globalThis.browser ?? globalThis.chrome;

const ALLOWED_HOSTS = [
  /^(www\.)?youtube\.com$/,
  /^youtubei\.googleapis\.com$/,
  /^jnn-pa\.googleapis\.com$/,
  /^[a-z0-9-]+\.googlevideo\.com$/,
];
const ALLOWED_SENDERS = [/^https:\/\/todotube\.papelon\.workers\.dev\//, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//];

function isAllowedUrl(raw) {
  try {
    const u = new URL(raw);
    // Nunca licencias DRM (constitución §I): el Puente no las transporta aunque se le pidan.
    if (/drm|license/i.test(u.pathname)) return false;
    return u.protocol === 'https:' && ALLOWED_HOSTS.some((re) => re.test(u.hostname));
  } catch { return false; }
}

let ruleId = 1000;
async function withHeaders(url, headers, run) {
  const requestHeaders = Object.entries(headers).map(([header, value]) => ({ header, operation: 'set', value: String(value) }));
  const id = ruleId++ > 1e9 ? (ruleId = 1000) : ruleId;
  await api.declarativeNetRequest.updateSessionRules({
    addRules: [{ id, priority: 2, action: { type: 'modifyHeaders', requestHeaders }, condition: { urlFilter: url, resourceTypes: ['xmlhttprequest'] } }],
  });
  try { return await run(); }
  finally { await api.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id] }); }
}

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function handle(req) {
  const { url, options = {} } = req;
  if (!isAllowedUrl(url)) return { success: false, error: 'Host no permitido por TodoTube Puente' };
  const headers = { ...(options.headers || {}), origin: 'https://www.youtube.com' };
  let body = options.body;
  if (typeof body === 'string' && options.bodyIsBase64) body = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const res = await withHeaders(url, headers, () => fetch(url, {
    method: options.method || (body ? 'POST' : 'GET'), body, headers: {}, credentials: 'omit', redirect: 'follow',
  }));
  const outHeaders = {};
  res.headers.forEach((v, k) => { outHeaders[k] = v; });
  const buf = new Uint8Array(await res.arrayBuffer());
  return { success: true, status: res.status, statusText: res.statusText, headers: outHeaders, url: res.url, body: toBase64(buf) };
}

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action !== 'todotube-fetch') return;
  const from = sender?.url || sender?.origin || '';
  if (!ALLOWED_SENDERS.some((re) => re.test(from))) { sendResponse({ success: false, error: 'Origen no permitido' }); return; }
  handle(msg).then(sendResponse, (e) => sendResponse({ success: false, error: String(e?.message || e) }));
  return true;
});
