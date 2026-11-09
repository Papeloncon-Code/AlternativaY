export type PlaybackSourceMode = 'sabr-dash' | 'dash' | 'hls' | 'direct' | 'r2';

export type PlaybackCandidate = {
  providerId: string;
  mode: PlaybackSourceMode;
  uri: string;
  mimeType?: string;
  live?: boolean;
  expiresAt?: number;
  /** Opaque provider data. The broker never interprets provider-specific payloads. */
  metadata?: unknown;
};

export type PlaybackResolveContext = {
  videoId: string;
  resumeAt: number;
  signal: AbortSignal;
  excludeProviderIds?: ReadonlySet<string>;
};

export interface PlaybackProvider {
  readonly id: string;
  /** Lower values are attempted first. */
  readonly priority: number;
  supports(videoId: string): boolean;
  resolve(context: PlaybackResolveContext): Promise<PlaybackCandidate[]>;
}

export type ProviderHealth = {
  failures: number;
  successes: number;
  coolingDownUntil: number;
  lastError?: string;
};

export class ProviderHealthRegistry {
  private readonly states = new Map<string, ProviderHealth>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly baseCooldownMs = 15_000,
    private readonly maxCooldownMs = 5 * 60_000,
  ) {}

  get(providerId: string): ProviderHealth {
    return { ...(this.states.get(providerId) ?? { failures: 0, successes: 0, coolingDownUntil: 0 }) };
  }

  isCoolingDown(providerId: string): boolean {
    return this.get(providerId).coolingDownUntil > this.now();
  }

  recordSuccess(providerId: string): void {
    const old = this.get(providerId);
    this.states.set(providerId, {
      failures: 0,
      successes: old.successes + 1,
      coolingDownUntil: 0,
    });
  }

  recordFailure(providerId: string, error: unknown): void {
    const old = this.get(providerId);
    const failures = old.failures + 1;
    const cooldown = Math.min(this.maxCooldownMs, this.baseCooldownMs * 2 ** Math.min(failures - 1, 8));
    this.states.set(providerId, {
      failures,
      successes: old.successes,
      coolingDownUntil: this.now() + cooldown,
      lastError: error instanceof Error ? error.message : String(error),
    });
  }
}

export type PlaybackResolution = {
  candidates: PlaybackCandidate[];
  failures: Array<{ providerId: string; error: string }>;
  skippedProviders: string[];
};

function abortError(): Error {
  const error = new Error('Playback resolution was aborted.');
  error.name = 'AbortError';
  return error;
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class PlaybackBroker {
  constructor(
    private readonly providers: PlaybackProvider[],
    readonly health = new ProviderHealthRegistry(),
    private readonly providerTimeoutMs = 8_000,
  ) {}

  reportSuccess(providerId: string): void {
    this.health.recordSuccess(providerId);
  }

  reportFailure(providerId: string, error: unknown): void {
    this.health.recordFailure(providerId, error);
  }

  async resolve(context: PlaybackResolveContext): Promise<PlaybackResolution> {
    if (context.signal.aborted) throw abortError();

    const failures: PlaybackResolution['failures'] = [];
    const skippedProviders: string[] = [];
    const candidates: PlaybackCandidate[] = [];
    const seen = new Set<string>();

    const eligible = this.providers
      .filter((provider) => provider.supports(context.videoId))
      .filter((provider) => {
        if (context.excludeProviderIds?.has(provider.id)) {
          skippedProviders.push(provider.id);
          return false;
        }
        if (this.health.isCoolingDown(provider.id)) {
          skippedProviders.push(provider.id);
          return false;
        }
        return true;
      })
      .sort((a, b) => a.priority - b.priority ||
        this.health.get(b.id).successes - this.health.get(a.id).successes);

    for (const provider of eligible) {
      if (context.signal.aborted) throw abortError();

      const controller = new AbortController();
      const relayAbort = () => controller.abort();
      context.signal.addEventListener('abort', relayAbort, { once: true });
      let timeout: ReturnType<typeof setTimeout> | undefined;

      try {
        const result = await Promise.race([
          provider.resolve({ ...context, signal: controller.signal }),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => {
              controller.abort();
              reject(new Error(`Provider timed out after ${this.providerTimeoutMs} ms.`));
            }, this.providerTimeoutMs);
          }),
        ]);

        if (context.signal.aborted) throw abortError();
        if (!Array.isArray(result)) throw new Error('Provider returned an invalid candidate list.');

        const valid = result.filter((candidate) =>
          candidate && candidate.providerId === provider.id &&
          typeof candidate.uri === 'string' && candidate.uri.length > 0,
        );

        if (valid.length === 0) {
          const error = new Error('Provider returned no playable sources.');
          failures.push({ providerId: provider.id, error: error.message });
          this.health.recordFailure(provider.id, error);
          continue;
        }

        this.health.recordSuccess(provider.id);
        for (const candidate of valid) {
          const key = [candidate.providerId, candidate.mode, candidate.uri].join('|');
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push(candidate);
          }
        }
      } catch (error) {
        if (context.signal.aborted) throw abortError();
        const message = asErrorMessage(error);
        failures.push({ providerId: provider.id, error: message });
        this.health.recordFailure(provider.id, error);
      } finally {
        if (timeout) clearTimeout(timeout);
        context.signal.removeEventListener('abort', relayAbort);
        controller.abort();
      }
    }

    return { candidates, failures, skippedProviders };
  }
}

export type PlaybackActivationContext = {
  resumeAt: number;
  wasPlaying: boolean;
  signal: AbortSignal;
};

/**
 * Tries already-resolved transport modes in order. The caller owns the single
 * media element/player instance and must use resumeAt when loading each source.
 */
export async function activateWithFallback<T>(
  candidates: PlaybackCandidate[],
  context: PlaybackActivationContext,
  activate: (candidate: PlaybackCandidate, context: PlaybackActivationContext) => Promise<T>,
  onFailure?: (candidate: PlaybackCandidate, error: unknown) => void,
): Promise<{ candidate: PlaybackCandidate; result: T }> {
  const failures: string[] = [];

  for (const candidate of candidates) {
    if (context.signal.aborted) throw abortError();
    try {
      const result = await activate(candidate, context);
      return { candidate, result };
    } catch (error) {
      if (context.signal.aborted) throw abortError();
      failures.push(`${candidate.providerId}/${candidate.mode}: ${asErrorMessage(error)}`);
      onFailure?.(candidate, error);
    }
  }

  throw new Error(failures.length
    ? `All playback sources failed: ${failures.join(' | ')}`
    : 'No playable source was found.');
}
