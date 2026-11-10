export type FetchInput = string | Request | URL;

export interface PreparedFetchRequest {
  url: URL;
  init: RequestInit;
}

/** Normalize fetch(input, init) without consuming the caller's original Request. */
export async function prepareFetchRequest(
  input: FetchInput,
  init?: RequestInit,
): Promise<PreparedFetchRequest> {
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
