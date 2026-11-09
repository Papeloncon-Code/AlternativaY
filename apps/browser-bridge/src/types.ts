export type Rule = Omit<chrome.declarativeNetRequest.Rule, 'id'>;

export interface FetchRequest {
  action: string;
  url: string;
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | Uint8Array;
    [key: string]: unknown;
  };
}

export interface FetchResponse {
  success: boolean;
  data?: unknown;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  url?: string;
  error?: string;
}

export interface PendingRequest {
  resolve: (value: ProxyResponse) => void;
  reject: (reason?: unknown) => void;
}

export interface ProxyResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export interface ProxyFetchRequest {
  type: string;
  requestId: number;
  url: string;
  options?: Record<string, unknown>;
}

export interface ProxyResponseData extends FetchResponse {
  type: string;
  requestId: number;
}
