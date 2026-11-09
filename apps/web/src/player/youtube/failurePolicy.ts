export class InnerTubePlayerHttpError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(status: number, responseBody: string) {
    super('YouTube rejected the player request with HTTP ' + status + '.');
    this.name = 'InnerTubePlayerHttpError';
    this.status = status;
    this.responseBody = responseBody.slice(0, 1600);
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function collectFailureFacts(value: unknown, depth = 0, visited = new Set<unknown>()): {
  statuses: number[];
  text: string[];
} {
  const facts = { statuses: [] as number[], text: [] as string[] };
  if (depth > 4 || value == null || visited.has(value)) return facts;
  if (typeof value === 'string') {
    facts.text.push(value.slice(0, 2000));
    return facts;
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) facts.statuses.push(value);
    return facts;
  }
  if (Array.isArray(value)) {
    visited.add(value);
    for (const item of value.slice(0, 12)) {
      const nested = collectFailureFacts(item, depth + 1, visited);
      facts.statuses.push(...nested.statuses);
      facts.text.push(...nested.text);
    }
    return facts;
  }
  if (!isRecord(value)) return facts;
  visited.add(value);

  for (const key of ['status', 'statusCode', 'httpStatus', 'code']) {
    const item = value[key];
    if (typeof item === 'number' && Number.isInteger(item)) facts.statuses.push(item);
    if (typeof item === 'string') facts.text.push(item);
  }
  for (const key of ['message', 'reason', 'playabilityStatus', 'responseBody', 'statusText']) {
    const item = value[key];
    if (typeof item === 'string') facts.text.push(item.slice(0, 2000));
    else if (isRecord(item)) {
      const nested = collectFailureFacts(item, depth + 1, visited);
      facts.statuses.push(...nested.statuses);
      facts.text.push(...nested.text);
    }
  }
  for (const key of ['data', 'cause', 'error']) {
    const item = value[key];
    if (item !== undefined) {
      const nested = collectFailureFacts(item, depth + 1, visited);
      facts.statuses.push(...nested.statuses);
      facts.text.push(...nested.text);
    }
  }

  return facts;
}

const STOP_CLIENT_HTTP_STATUSES = new Set([400, 401, 403, 407, 429]);
const STOP_ALL_HTTP_STATUSES = new Set([401, 403, 407, 429]);

const RESTRICTED_ACCESS_PATTERN =
  /LOGIN_REQUIRED|AGE_CHECK_REQUIRED|CONTENT_CHECK_REQUIRED|GEO_RESTRICTED|REGION_RESTRICTED|UNPLAYABLE|SIGN.?IN.?REQUIRED|SIGN.?IN.?TO.?CONFIRM|NOT\s+A\s+BOT|AUTOMATED\s+QUER|UNUSUAL\s+TRAFFIC|CONSENT_REQUIRED|FAILED_PRECONDITION/i;

/**
 * True when the response says the request itself is rejected or access is
 * restricted. TodoTube must not rotate client identities to work around it.
 */
export function shouldStopClientFallback(failure: unknown): boolean {
  const facts = collectFailureFacts(failure);
  return facts.statuses.some((status) => STOP_CLIENT_HTTP_STATUSES.has(status)) ||
    facts.text.some((value) => RESTRICTED_ACCESS_PATTERN.test(value));
}

/**
 * 401/403/429 and explicit access/anti-bot responses are not transport
 * failures. Do not retry the same video through another YouTube URL/profile.
 * An independently authorized provider (for example, a verified local asset)
 * may still be handled by PlayerHost outside this YouTube runtime.
 */
export function shouldStopSourceFallback(failure: unknown): boolean {
  const facts = collectFailureFacts(failure);
  return facts.statuses.some((status) => STOP_ALL_HTTP_STATUSES.has(status)) ||
    facts.text.some((value) => RESTRICTED_ACCESS_PATTERN.test(value));
}
