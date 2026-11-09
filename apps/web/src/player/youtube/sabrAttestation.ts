import { shouldStopClientFallback } from './failurePolicy';

export interface SabrAttestationClient {
  getAttestationChallenge: (
    engagementType: 'ENGAGEMENT_TYPE_UNBOUND',
  ) => Promise<unknown>;
}

export interface SabrAttestationOptions {
  attempts?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
  delay?: (milliseconds: number) => Promise<void>;
}

/**
 * Prime YouTube.js' normal, same-session attestation state before SABR starts.
 * This is the public InnerTube attestation endpoint, not a token bypass,
 * alternate identity, proxy, or remote minting service.
 */
export async function primeSabrAttestation(
  client: SabrAttestationClient,
  options: SabrAttestationOptions = {},
): Promise<void> {
  const attempts = options.attempts ?? 3;
  const timeoutMs = options.timeoutMs ?? 4_000;
  const retryDelayMs = options.retryDelayMs ?? 500;
  const delay = options.delay ?? ((milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        client.getAttestationChallenge('ENGAGEMENT_TYPE_UNBOUND'),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => {
              const error = new Error('SABR attestation challenge timed out.');
              error.name = 'TimeoutError';
              reject(error);
            },
            timeoutMs,
          );
        }),
      ]);
      return;
    } catch (error) {
      lastError = error;
      // Do not retry an HTTP denial or a server-side rejection by changing
      // client identity. The caller can report the failure or use a different
      // transport from the already-resolved, same-client response.
      if (shouldStopClientFallback(error) || (error instanceof Error && error.name === 'TimeoutError')) throw error;
      if (attempt + 1 < attempts) {
        await delay(retryDelayMs * (attempt + 1));
      }
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  throw new Error(
    'No se pudo preparar la attestation requerida por la ruta SABR.',
    { cause: lastError },
  );
}

export function isSabrAttestationRefreshRequired(status: number): boolean {
  return status === 3;
}
