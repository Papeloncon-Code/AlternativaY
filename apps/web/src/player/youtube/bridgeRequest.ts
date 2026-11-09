export type BridgeFetchInput = string | Request | URL;

export interface BridgePreparedRequest {
  url: URL;
  init: RequestInit;
}

/**
 * Convert fetch(input, init) semantics into a serializable request for the
 * browser extension bridge. A Request body is a stream, so clone it before
 * reading to avoid consuming the caller's original Request.
 */
export async function prepareBridgeRequest(
  input: BridgeFetchInput,
  init?: RequestInit,
): Promise<BridgePreparedRequest> {
  const request = input instanceof Request ? input : undefined;
  const url = input instanceof URL
    ? new URL(input.toString())
    : new URL(typeof input === 'string' ? input : input.url);
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers ?? request?.headers);
  const requestInit: RequestInit = { ...init, method, headers };

  if (init?.body === undefined && request && method !== 'GET' && method !== 'HEAD' && request.body) {
    requestInit.body = await request.clone().arrayBuffer();
  }

  return { url, init: requestInit };
}
