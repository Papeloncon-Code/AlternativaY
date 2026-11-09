import { BotGuardClient } from 'bgutils-js/botguard';
import { WebPoMinter } from 'bgutils-js/webpo';
import {
  buildURL,
  getHeaders,
  parseLooseJSON,
  USER_AGENT,
} from 'bgutils-js/utils';
import type { WebPoSignalOutput } from 'bgutils-js/shared-types';
import type { IRawResponse } from 'youtubei.js';
import { fetchFunction } from './helpers';

const REQUEST_KEY = 'O43z0dpjhgX20SCx4KAo';
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

interface InnerTubeChallenge {
  ytConfig: string;
  challengeResponse: IRawResponse;
  interpreterJavascript: string;
}

type IntegrityTokenResponse = [
  integrityToken: string,
  estimatedTtlSecs: number,
  mintRefreshThreshold: number,
  websafeFallbackToken: string,
];

type ChallengePagePayload = {
  R?: IRawResponse;
};

let cachedChallenge: { fetchedAt: number; challenge: InnerTubeChallenge } | undefined;

/**
 * Obtain the same first-party attestation challenge used by Materialious'
 * current local PoToken flow. The old BotGuard Create endpoint is no longer
 * a reliable source of this challenge.
 */
async function fetchInnerTubeChallenge(): Promise<InnerTubeChallenge> {
  if (cachedChallenge && Date.now() - cachedChallenge.fetchedAt < CHALLENGE_TTL_MS) {
    return cachedChallenge.challenge;
  }

  const pageResponse = await fetchFunction('https://www.youtube.com/', {
    method: 'GET',
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.7',
      'user-agent': USER_AGENT,
    },
  });

  if (!pageResponse.ok) {
    throw new Error('No se pudo obtener la página de challenge de YouTube (HTTP ' + pageResponse.status + ').');
  }

  const pageHtml = await pageResponse.text();
  const ytConfig = pageHtml.match(/ytcfg\\.set\\(({.+?})\\);/s)?.[1];
  if (!ytConfig) {
    throw new Error('La página de YouTube no incluyó ytcfg.');
  }

  const initialAttestationData = pageHtml.match(/window\\.ytAtN\\(\\s*({[\\s\\S]*?})\\s*\\)/);
  if (!initialAttestationData) {
    throw new Error('La página de YouTube no incluyó el challenge de attestation.');
  }

  const parsed = parseLooseJSON(initialAttestationData[1]) as ChallengePagePayload;
  const challengeResponse = parsed.R;
  if (!challengeResponse?.bgChallenge) {
    throw new Error('YouTube no devolvió un challenge BotGuard válido.');
  }

  const interpreterUrl =
    challengeResponse.bgChallenge.interpreterUrl
      ?.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;

  if (!interpreterUrl) {
    throw new Error('El challenge BotGuard no incluyó la URL del intérprete.');
  }

  const interpreterResponse = await fetchFunction(
    new URL(interpreterUrl, 'https://www.youtube.com').href,
    { method: 'GET' },
  );

  if (!interpreterResponse.ok) {
    throw new Error('No se pudo cargar el intérprete BotGuard (HTTP ' + interpreterResponse.status + ').');
  }

  const interpreterJavascript = await interpreterResponse.text();
  if (!interpreterJavascript) {
    throw new Error('YouTube devolvió un intérprete BotGuard vacío.');
  }

  const challenge = { ytConfig, challengeResponse, interpreterJavascript };
  cachedChallenge = { fetchedAt: Date.now(), challenge };
  return challenge;
}

export class BotguardService {
  public botguardClient?: BotGuardClient;
  public initializationPromise?: Promise<BotGuardClient> | null = null;
  public integrityTokenBasedMinter?: WebPoMinter;

  private async createClient(): Promise<BotGuardClient> {
    const challenge = await fetchInnerTubeChallenge();
    const runtimeGlobal = globalThis as typeof globalThis & {
      yt?: { config_?: unknown };
    };

    runtimeGlobal.yt = { config_: JSON.parse(challenge.ytConfig) };
    new Function(challenge.interpreterJavascript)();

    const botguardClient = await BotGuardClient.create({
      program: challenge.challengeResponse.bgChallenge!.program,
      globalName: challenge.challengeResponse.bgChallenge!.globalName,
      globalObject: globalThis,
    });

    try {
      const webPoSignalOutput: WebPoSignalOutput = [];
      const botguardResponse = await botguardClient.snapshot({ webPoSignalOutput });
      const integrityTokenResponse = await fetchFunction(buildURL('GenerateIT', true), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify([REQUEST_KEY, botguardResponse]),
      });

      if (!integrityTokenResponse.ok) {
        throw new Error(
          'BotGuard GenerateIT falló con HTTP ' + integrityTokenResponse.status + '.',
        );
      }

      const tokenData = await integrityTokenResponse.json() as IntegrityTokenResponse;
      const [
        integrityToken,
        estimatedTtlSecs,
        mintRefreshThreshold,
        websafeFallbackToken,
      ] = tokenData;

      if (typeof integrityToken !== 'string' || integrityToken.length === 0) {
        throw new Error('BotGuard GenerateIT no devolvió el integrity token.');
      }

      this.integrityTokenBasedMinter = await WebPoMinter.create(
        {
          integrityToken,
          estimatedTtlSecs,
          mintRefreshThreshold,
          websafeFallbackToken,
        },
        webPoSignalOutput,
      );

      return botguardClient;
    } catch (error) {
      await botguardClient.shutdown().catch(() => undefined);
      throw error;
    }
  }

  public async init(): Promise<BotGuardClient> {
    if (this.botguardClient && this.integrityTokenBasedMinter) {
      return this.botguardClient;
    }
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    const pending = this.createClient();
    this.initializationPromise = pending;
    try {
      const client = await pending;
      this.botguardClient = client;
      return client;
    } finally {
      if (this.initializationPromise === pending) {
        this.initializationPromise = null;
      }
    }
  }

  public async mintPlaybackToken(videoId: string): Promise<string> {
    await this.init();
    if (!this.integrityTokenBasedMinter) {
      throw new Error('BotGuard no está listo para generar el PoToken.');
    }
    return this.integrityTokenBasedMinter.mintAsWebsafeString(decodeURIComponent(videoId));
  }

  public isInitialized(): boolean {
    return !!this.botguardClient && !!this.integrityTokenBasedMinter;
  }

  public dispose(): void {
    const client = this.botguardClient;
    this.botguardClient = undefined;
    this.integrityTokenBasedMinter = undefined;

    if (client) {
      void client.shutdown().catch((error) => {
        console.warn('[TodoTube] No se pudo cerrar BotGuard limpiamente:', error);
      });
    }
  }

  public async reinit(): Promise<BotGuardClient> {
    const pending = this.initializationPromise;
    if (pending) {
      await pending.catch(() => undefined);
    }
    this.dispose();
    return this.init();
  }
}

export const botguardService = new BotguardService();
