import shaka from 'shaka-player/dist/shaka-player.ui';
import type { ApiResponse, Types } from 'youtubei.js/web';
import {
  ClientType,
  Constants,
  Innertube,
  Platform,
  UniversalCache,
  Utils,
  YT,
} from 'youtubei.js/web';
import { SabrStreamingAdapter } from 'googlevideo/sabr-streaming-adapter';
import { buildSabrFormat } from 'googlevideo/utils';
import { checkExtension, fetchFunction, fetchOnesieHotConfig, type OnesieHotConfig } from './helpers';
import { makePlayerRequest } from './onesie';
import type { ReloadPlaybackContext } from 'googlevideo/protos';
import { botguardService } from './BotguardService';
import { ShakaPlayerAdapter } from './ShakaPlayerAdapter';
import { shouldStopClientFallback, shouldStopSourceFallback } from './failurePolicy';
import {
  PLAYBACK_STALL_TIMEOUT_MS,
  shouldRecoverPlaybackStall,
} from './stallWatchdog';

type YouTubeClient =
  | 'MWEB'
  | 'WEB'
  | 'TV'
  | 'TV_EMBEDDED'
  | 'WEB_EMBEDDED'
  | 'ANDROID_CREATOR'
  | 'ANDROID';

type SourceMode = 'sabr-dash' | 'dash' | 'hls' | 'direct';

type SourceCandidate = {
  mode: SourceMode;
  uri: string;
  info: InstanceType<typeof YT.VideoInfo>;
  innertube: Innertube;
  client: YouTubeClient;
  isLive: boolean;
};

type RuntimeCallbacks = {
  onStatus?: (status: 'loading' | 'playing' | 'switching' | 'error', detail?: string) => void;
  onFatal?: (error: Error) => void;
  onSource?: (mode: SourceMode, client: YouTubeClient) => void;
};

const CLIENT_TYPES: Record<YouTubeClient, ClientType> = {
  MWEB: ClientType.MWEB,
  WEB: ClientType.WEB,
  TV: ClientType.TV,
  TV_EMBEDDED: ClientType.TV_EMBEDDED,
  WEB_EMBEDDED: ClientType.WEB_EMBEDDED,
  ANDROID_CREATOR: ClientType.ANDROID_CREATOR,
  ANDROID: ClientType.ANDROID,
};

/**
 * Ordered client ladder limited to ClientType values exposed by the
 * pinned youtubei.js runtime. Every rung has its own Innertube session.
 */
const CLIENT_FALLBACK_ORDER: YouTubeClient[] = [
  'MWEB',
  'WEB',
  'TV',
  'TV_EMBEDDED',
  'WEB_EMBEDDED',
  'ANDROID_CREATOR',
  'ANDROID',
];

const PLAYER_REQUEST_TIMEOUT_MS = 10_000;

function timeout<T>(promise: Promise<T>, milliseconds: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(label + ' timed out after ' + milliseconds + ' ms.')), milliseconds);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

function toDataUri(xml: string): string {
  const bytes = new TextEncoder().encode(xml);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return 'data:application/dash+xml;base64,' + btoa(binary);
}

function isWebClient(client: YouTubeClient): boolean {
  return client === 'MWEB' || client === 'WEB';
}

/**
 * One TodoTube player, one source broker, several independent InnerTube
 * client sessions and several media transports. Switching a source reloads
 * Shaka with the last observed playback position instead of replacing the UI.
 *
 * No TodoTube Cloudflare Worker is used to relay YouTube media.
 */
export class YouTubeSabrRuntime {
  private readonly sessions = new Map<YouTubeClient, Promise<Innertube>>();
  private onesieConfigPromise: Promise<OnesieHotConfig | null> | null = null;
  private player: shaka.Player | null = null;
  private sabrAdapter: SabrStreamingAdapter | null = null;
  private video: HTMLVideoElement | null = null;
  private candidates: SourceCandidate[] = [];
  private candidateIndex = -1;
  private nextClientIndex = 0;
  private refreshedClients = new Set<YouTubeClient>();
  private currentClient: YouTubeClient | null = null;
  private videoId = '';
  private playbackToken = '';
  private coldStartToken = '';
  private tokenLock = false;
  private loading = false;
  private switching = false;
  private destroyed = false;
  private callbacks: RuntimeCallbacks;
  private lastError = '';
  private stallWatchdogInterval: number | null = null;
  private stallWatchdogLastTime = 0;
  private stallWatchdogLastProgress = 0;
  private stallRecoveryAttempts = 0;
  private stallRecoveryInProgress = false;
  private stallRecoveryExhausted = false;
  private lastStallRecoveryAt = 0;

  constructor(callbacks: RuntimeCallbacks = {}) {
    this.callbacks = callbacks;
  }

  private async getClientSession(client: YouTubeClient): Promise<Innertube> {
    const cached = this.sessions.get(client);
    if (cached) return cached;

    const pending = Innertube.create({
      cache: new UniversalCache(true),
      fetch: fetchFunction,
      client_type: CLIENT_TYPES[client],
    });
    this.sessions.set(client, pending);
    try {
      return await pending;
    } catch (error) {
      this.sessions.delete(client);
      throw error;
    }
  }

  async attach(video: HTMLVideoElement): Promise<void> {
    this.video = video;
    this.destroyed = false;

    if (!checkExtension()) {
      throw new Error('Falta TodoTube Bridge. Instala y activa la extensión en este navegador y vuelve a cargar TodoTube.');
    }

    Platform.shim.eval = async (data: Types.BuildScriptResult) => new Function(data.output)();

    shaka.polyfill.installAll();
    if (!shaka.Player.isBrowserSupported()) {
      throw new Error('Este navegador no es compatible con Shaka Player.');
    }

    const player = new shaka.Player();
    player.configure({
      abr: { enabled: true },
      streaming: {
        bufferingGoal: 90,
        rebufferingGoal: 2,
        bufferBehind: 90,
        retryParameters: {
          maxAttempts: 3,
          timeout: 12_000,
          fuzzFactor: 0.35,
        },
      },
    });

    await player.attach(video);
    player.addEventListener('error', this.handlePlayerError);
    this.player = player;

    // Start BotGuard in parallel. Only MWEB/WEB SABR sessions request a WebPO token.
    void botguardService.init().catch((error) => {
      console.warn('[TodoTube] No se pudo inicializar el servicio de integridad:', error);
    });

    this.startStallWatchdog();
  }

  private startStallWatchdog(): void {
    if (this.stallWatchdogInterval !== null || !this.video) return;
    this.stallWatchdogLastTime = this.video.currentTime || 0;
    this.stallWatchdogLastProgress = Date.now();
    this.stallWatchdogInterval = window.setInterval(() => this.checkForStall(), 1_000);
  }

  private checkForStall(): void {
    const video = this.video;
    if (
      this.destroyed ||
      !video ||
      !this.player ||
      this.candidateIndex < 0 ||
      this.loading ||
      this.switching ||
      this.stallRecoveryInProgress
    ) return;

    const now = Date.now();
    const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const visible = document.visibilityState === 'visible';
    const online = navigator.onLine !== false;

    if (video.paused || video.seeking || video.ended || !visible || !online) {
      this.stallWatchdogLastTime = currentTime;
      this.stallWatchdogLastProgress = now;
      return;
    }

    if (Math.abs(currentTime - this.stallWatchdogLastTime) > 0.05) {
      this.stallWatchdogLastTime = currentTime;
      this.stallWatchdogLastProgress = now;
      if (now - this.lastStallRecoveryAt > 10_000) {
        this.stallRecoveryAttempts = 0;
        this.stallRecoveryExhausted = false;
      }
      return;
    }

    let bufferedAhead = 0;
    for (let index = 0; index < video.buffered.length; index++) {
      const start = video.buffered.start(index);
      const end = video.buffered.end(index);
      if (currentTime >= start - 0.15 && currentTime <= end + 0.05) {
        bufferedAhead = Math.max(0, end - currentTime);
        break;
      }
    }

    const stalled = shouldRecoverPlaybackStall({
      now,
      lastProgressAt: this.stallWatchdogLastProgress,
      currentTime,
      lastCurrentTime: this.stallWatchdogLastTime,
      bufferedAhead,
      paused: video.paused,
      seeking: video.seeking,
      ended: video.ended,
      visible,
      online,
    }, PLAYBACK_STALL_TIMEOUT_MS);

    if (stalled) void this.recoverFromStall();
  }

  private async recoverFromStall(): Promise<void> {
    if (
      this.stallRecoveryInProgress ||
      this.stallRecoveryExhausted ||
      this.destroyed ||
      !this.video
    ) return;
    if (this.stallRecoveryAttempts >= 3) {
      this.stallRecoveryExhausted = true;
      const error = new Error('La reproducción no logró recuperarse después de varios intentos.');
      this.callbacks.onStatus?.('error', error.message);
      this.callbacks.onFatal?.(error);
      return;
    }

    this.stallRecoveryInProgress = true;
    this.stallRecoveryAttempts += 1;
    this.lastStallRecoveryAt = Date.now();
    this.stallWatchdogLastProgress = this.lastStallRecoveryAt;
    console.warn('[TodoTube] Playback stalled; attempting recovery', this.stallRecoveryAttempts);

    try {
      const recovered = await this.switchToNextSource(
        'El vídeo dejó de avanzar. TodoTube está recuperando la reproducción…',
      );
      if (!recovered) this.stallRecoveryExhausted = true;
    } finally {
      this.stallRecoveryInProgress = false;
      this.stallWatchdogLastTime = this.video?.currentTime ?? 0;
      this.stallWatchdogLastProgress = Date.now();
    }
  }

  async load(videoId: string, startAt = 0, autoplay = true): Promise<void> {
    if (!this.player || !this.video) {
      throw new Error('El runtime de reproducción no está inicializado.');
    }
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      throw new Error('El identificador del vídeo no tiene un formato válido.');
    }

    this.videoId = videoId;
    this.playbackToken = '';
    this.coldStartToken = '';
    this.tokenLock = false;
    this.candidates = [];
    this.candidateIndex = -1;
    this.nextClientIndex = 0;
    this.refreshedClients.clear();
    this.currentClient = null;
    this.lastError = '';
    this.stallRecoveryAttempts = 0;
    this.stallRecoveryExhausted = false;
    this.stallRecoveryInProgress = false;
    this.lastStallRecoveryAt = 0;
    this.stallWatchdogLastProgress = Date.now();
    this.stallWatchdogLastTime = startAt;
    this.callbacks.onStatus?.('loading', 'Iniciando la cadena redundante de clientes…');

    const found = await this.loadNextClient(startAt, autoplay);
    if (!found) {
      throw new Error(this.lastError || 'Ninguno de los clientes y transportes disponibles pudo entregar este vídeo.');
    }
  }

  private async getOnesieConfig(): Promise<OnesieHotConfig | null> {
    if (!this.onesieConfigPromise) {
      this.onesieConfigPromise = fetchOnesieHotConfig();
    }
    return this.onesieConfigPromise;
  }

  private async fetchPlayerInfo(
    innertube: Innertube,
    client: YouTubeClient,
    reloadContext?: ReloadPlaybackContext,
  ): Promise<ApiResponse> {
    const requestParams: Record<string, unknown> = {
      videoId: this.videoId,
      contentCheckOk: true,
      racyCheckOk: true,
      playbackContext: {
        contentPlaybackContext: {
          signatureTimestamp: innertube.session.player?.signature_timestamp,
        },
      },
    };
    if (reloadContext) {
      (requestParams.playbackContext as Record<string, unknown>).reloadPlaybackContext = reloadContext;
    }

    const request = (async () => {
      // Onesie is the primary WEB player-request path. If its config is expired,
      // unavailable or the request fails, fall back to normal InnerTube on the
      // same client before the client ladder moves to its next rung.
      if (client === 'WEB') {
        const clientConfig = await this.getOnesieConfig();
        if (clientConfig) {
          try {
            return await makePlayerRequest({
              clientConfig,
              innertubeRequest: {
                context: innertube.session.context,
                ...requestParams,
              },
            });
          } catch (error) {
            if (shouldStopSourceFallback(error)) throw error;
            console.warn('[TodoTube] Onesie request failed; falling back to InnerTube on the same client:', error);
            this.onesieConfigPromise = null;
          }
        }
      }

      return innertube.actions.execute('/player', {
        ...requestParams,
        client,
        parse: false,
      });
    })();

    return timeout(request, PLAYER_REQUEST_TIMEOUT_MS, 'InnerTube/Onesie ' + client);
  }

  private async buildCandidates(
    response: ApiResponse,
    client: YouTubeClient,
    innertube: Innertube,
  ): Promise<SourceCandidate[]> {
    const info = new YT.VideoInfo([response], innertube.actions, Utils.generateRandomString(16));
    const streaming = info.streaming_data;
    if (!streaming) return [];

    const isLive = !!info.basic_info.is_live;
    const isPostLiveDvr = !!info.basic_info.is_post_live_dvr ||
      (info.basic_info.is_live_content && !!(streaming.dash_manifest_url || streaming.hls_manifest_url));
    const candidates: SourceCandidate[] = [];

    // Primary transport when the selected client exposes the server ABR session.
    if (!isLive && !isPostLiveDvr &&
        streaming.server_abr_streaming_url &&
        streaming.adaptive_formats?.length &&
        info.player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config) {
      const manifest = await info.toDash({
        manifest_options: {
          is_sabr: true,
          captions_format: 'vtt',
          include_thumbnails: false,
        },
      });
      if (manifest) candidates.push({
        mode: 'sabr-dash',
        uri: toDataUri(manifest),
        info,
        innertube,
        client,
        isLive,
      });
    }

    // DASH/HLS are independent transports from the same client response.
    if (streaming.dash_manifest_url) {
      candidates.push({
        mode: 'dash',
        uri: isLive ? streaming.dash_manifest_url + '/mpd_version/7' : streaming.dash_manifest_url,
        info,
        innertube,
        client,
        isLive,
      });
    }
    if (streaming.hls_manifest_url) {
      candidates.push({
        mode: 'hls',
        uri: streaming.hls_manifest_url,
        info,
        innertube,
        client,
        isLive,
      });
    }

    // Progressive direct URLs are a last-resort mode. Cipher-only entries
    // are ignored instead of pretending they are playable.
    const formats = (streaming.formats ?? []) as Array<{
      url?: string;
      mime_type?: string;
      height?: number;
      bitrate?: number;
    }>;
    const progressive = formats
      .filter((format) => typeof format.url === 'string' &&
        format.url.startsWith('https://') &&
        typeof format.mime_type === 'string' &&
        format.mime_type.startsWith('video/'))
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.bitrate ?? 0) - (a.bitrate ?? 0));

    for (const format of progressive.slice(0, 2)) {
      candidates.push({
        mode: 'direct',
        uri: format.url!,
        info,
        innertube,
        client,
        isLive,
      });
    }

    // A client without a dedicated DASH URL may still expose valid adaptive
    // URLs that youtubei.js can put into an ordinary DASH manifest.
    if (!isLive && !isPostLiveDvr && streaming.adaptive_formats?.length) {
      try {
        const manifest = await info.toDash({
          manifest_options: {
            is_sabr: false,
            captions_format: 'vtt',
            include_thumbnails: false,
          },
        });
        if (manifest) candidates.push({
          mode: 'dash',
          uri: toDataUri(manifest),
          info,
          innertube,
          client,
          isLive,
        });
      } catch (error) {
        console.warn('[TodoTube] No se pudo construir el manifiesto DASH alternativo:', error);
      }
    }

    return candidates;
  }

  private async loadNextClient(resumeAt: number, autoplay: boolean): Promise<boolean> {
    while (this.nextClientIndex < CLIENT_FALLBACK_ORDER.length && !this.destroyed) {
      const client = CLIENT_FALLBACK_ORDER[this.nextClientIndex++];
      this.callbacks.onStatus?.('switching', 'Probando cliente ' + client + '…');

      try {
        const innertube = await this.getClientSession(client);
        const response = await this.fetchPlayerInfo(innertube, client);
        const info = new YT.VideoInfo([response], innertube.actions, Utils.generateRandomString(16));
        if (info.playability_status?.status !== 'OK') {
          const reason = info.playability_status?.reason || ('YouTube rechazó el cliente ' + client + '.');
          this.lastError = reason;
          if (shouldStopClientFallback({
            playabilityStatus: info.playability_status?.status,
            reason,
          })) {
            this.lastError = 'La fuente no autorizó esta reproducción. TodoTube no probará otros perfiles.';
            return false;
          }
          continue;
        }

        const candidates = await this.buildCandidates(response, client, innertube);
        if (!candidates.length) {
          this.lastError = 'El cliente ' + client + ' no devolvió ningún transporte reproducible.';
          continue;
        }

        this.candidates = candidates;
        this.candidateIndex = -1;
        this.currentClient = client;

        for (let index = 0; index < candidates.length && !this.destroyed; index++) {
          try {
            await this.activateCandidate(candidates[index], index, resumeAt, autoplay);
            return true;
          } catch (error) {
            this.lastError = error instanceof Error ? error.message : String(error);
            console.warn('[TodoTube] Falló la ruta ' + client + '/' + candidates[index].mode + ':', error);
          }
        }
      } catch (error) {
        if (shouldStopClientFallback(error)) {
          this.lastError = 'La fuente rechazó la solicitud. TodoTube no probará otros perfiles.';
          return false;
        }
        this.lastError = error instanceof Error ? error.message : String(error);
        console.warn('[TodoTube] Falló el cliente ' + client + ':', error);
      }
    }
    return false;
  }

  private async attachSabr(candidate: SourceCandidate): Promise<void> {
    if (!this.player) throw new Error('El reproductor no está disponible.');
    this.sabrAdapter?.dispose();

    const { innertube, info, client } = candidate;
    const adapter = new SabrStreamingAdapter({
      playerAdapter: new ShakaPlayerAdapter(),
      clientInfo: {
        osName: innertube.session.context.client.osName,
        osVersion: innertube.session.context.client.osVersion,
        clientName: parseInt(Constants.CLIENT_NAME_IDS[
          innertube.session.context.client.clientName as keyof typeof Constants.CLIENT_NAME_IDS
        ]),
        clientVersion: innertube.session.context.client.clientVersion,
      },
    });

    adapter.onMintPoToken(async () => {
      if (!isWebClient(client)) return '';
      if (!this.playbackToken && !this.tokenLock) {
        if (info.basic_info.is_live) await this.mintPlaybackToken();
        else void this.mintPlaybackToken();
      }
      return this.playbackToken || this.coldStartToken || '';
    });

    adapter.onReloadPlayerResponse(async (reloadContext) => {
      const refreshed = await this.fetchPlayerInfo(innertube, client, reloadContext as ReloadPlaybackContext);
      const refreshedInfo = new YT.VideoInfo([refreshed], innertube.actions, Utils.generateRandomString(16));
      const streamingUrl = refreshedInfo.streaming_data?.server_abr_streaming_url;
      if (!streamingUrl) throw new Error('YouTube no devolvió una URL SABR de renovación.');
      adapter.setStreamingURL(await innertube.session.player!.decipher(streamingUrl));
      adapter.setUstreamerConfig(
        refreshedInfo.player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config,
      );
    });

    adapter.attach(this.player);

    const serverUrl = info.streaming_data?.server_abr_streaming_url;
    if (!serverUrl) throw new Error('El cliente ya no ofrece un endpoint SABR.');
    adapter.setStreamingURL(await innertube.session.player!.decipher(serverUrl));
    adapter.setUstreamerConfig(
      info.player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config,
    );
    adapter.setServerAbrFormats(info.streaming_data?.adaptive_formats?.map(buildSabrFormat) ?? []);
    this.sabrAdapter = adapter;
  }

  private async mintPlaybackToken(): Promise<void> {
    if (!this.videoId || this.tokenLock) return;
    this.tokenLock = true;
    try {
      this.coldStartToken = botguardService.mintColdStartToken(this.videoId);
      if (!botguardService.isInitialized()) await botguardService.reinit();
      if (botguardService.integrityTokenBasedMinter) {
        this.playbackToken = await botguardService.integrityTokenBasedMinter.mintAsWebsafeString(this.videoId);
      }
    } catch (error) {
      console.warn('[TodoTube] No se pudo obtener el token web de reproducción:', error);
    } finally {
      this.tokenLock = false;
    }
  }

  private async activateCandidate(
    candidate: SourceCandidate,
    index: number,
    resumeAt: number,
    autoplay: boolean,
  ): Promise<void> {
    if (!this.player || !this.video) throw new Error('El reproductor no está disponible.');
    this.loading = true;
    this.callbacks.onStatus?.('switching', 'Cambiando a ' + candidate.mode + ' (' + candidate.client + ')…');

    try {
      await this.player.unload();
      if (candidate.mode === 'sabr-dash') {
        await this.attachSabr(candidate);
      } else {
        this.sabrAdapter?.dispose();
        this.sabrAdapter = null;
      }

      await this.player.load(candidate.uri, candidate.isLive ? undefined : Math.max(0, resumeAt));
      this.candidateIndex = index;
      this.currentClient = candidate.client;
      this.lastError = '';
      this.callbacks.onSource?.(candidate.mode, candidate.client);
      this.callbacks.onStatus?.('playing', candidate.mode + ' · ' + candidate.client);

      if (autoplay) {
        await this.video.play().catch((error) => {
          if (error instanceof DOMException && error.name === 'NotAllowedError') return;
          throw error;
        });
      }
    } finally {
      this.loading = false;
    }
  }

  private reportRestrictedFailure(): false {
    this.stallRecoveryExhausted = true;
    const error = new Error('La fuente no autorizó esta reproducción. TodoTube no intentará otras rutas de YouTube.');
    this.lastError = error.message;
    this.callbacks.onStatus?.('error', error.message);
    this.callbacks.onFatal?.(error);
    return false;
  }

  private handlePlayerError = (event: Event): void => {
    if (this.destroyed || this.loading || this.switching || this.candidateIndex < 0) return;
    const detail = (event as CustomEvent).detail;
    if (shouldStopSourceFallback(detail)) {
      this.reportRestrictedFailure();
      return;
    }
    const error = detail?.message || 'El transporte activo dejó de funcionar.';
    void this.switchToNextSource(error);
  };

  async switchToNextSource(reason = 'El transporte activo falló.'): Promise<boolean> {
    if (this.destroyed || this.switching || !this.video) return false;
    this.switching = true;
    const resumeAt = Number.isFinite(this.video.currentTime) ? this.video.currentTime : 0;
    const autoplay = !this.video.paused && !this.video.ended;
    this.callbacks.onStatus?.('switching', reason + ' Probando otra ruta…');

    try {
      for (let index = this.candidateIndex + 1; index < this.candidates.length; index++) {
        try {
          await this.activateCandidate(this.candidates[index], index, resumeAt, autoplay);
          return true;
        } catch (error) {
          if (shouldStopSourceFallback(error)) return this.reportRestrictedFailure();
          this.lastError = error instanceof Error ? error.message : String(error);
        }
      }

      // Renew the current client's signed URLs once before moving to the next
      // client. This handles expiring URLs and transient failures mid-stream.
      if (this.currentClient && !this.refreshedClients.has(this.currentClient)) {
        const client = this.currentClient;
        this.refreshedClients.add(client);
        try {
          const innertube = await this.getClientSession(client);
          const response = await this.fetchPlayerInfo(innertube, client);
          const info = new YT.VideoInfo([response], innertube.actions, Utils.generateRandomString(16));
          if (info.playability_status?.status === 'OK') {
            const refreshedCandidates = await this.buildCandidates(response, client, innertube);
            this.candidates = refreshedCandidates;
            this.candidateIndex = -1;
            for (let index = 0; index < refreshedCandidates.length; index++) {
              try {
                await this.activateCandidate(refreshedCandidates[index], index, resumeAt, autoplay);
                return true;
              } catch (error) {
                if (shouldStopSourceFallback(error)) return this.reportRestrictedFailure();
                this.lastError = error instanceof Error ? error.message : String(error);
              }
            }
          } else {
            const reason = info.playability_status?.reason || info.playability_status?.status || '';
            if (shouldStopClientFallback({
              playabilityStatus: info.playability_status?.status,
              reason,
            })) return this.reportRestrictedFailure();
          }
        } catch (error) {
          if (shouldStopSourceFallback(error) || shouldStopClientFallback(error)) {
            return this.reportRestrictedFailure();
          }
          this.lastError = error instanceof Error ? error.message : String(error);
        }
      }

      const found = await this.loadNextClient(resumeAt, autoplay);
      if (found) return true;

      const error = new Error(this.lastError || 'Se agotaron los clientes y transportes de reproducción.');
      this.callbacks.onStatus?.('error', error.message);
      this.callbacks.onFatal?.(error);
      return false;
    } finally {
      this.switching = false;
    }
  }

  async dispose(): Promise<void> {
    this.destroyed = true;
    if (this.stallWatchdogInterval !== null) {
      window.clearInterval(this.stallWatchdogInterval);
      this.stallWatchdogInterval = null;
    }
    this.video?.pause();
    this.sabrAdapter?.dispose();
    this.sabrAdapter = null;

    if (this.player) {
      this.player.removeEventListener('error', this.handlePlayerError);
      try { await this.player.unload(); } catch { /* player may already be unloaded */ }
      try { await this.player.detach(); } catch { /* player may already be detached */ }
      await this.player.destroy();
      this.player = null;
    }
    this.sessions.clear();
    this.video = null;
    this.candidates = [];
    this.currentClient = null;
    botguardService.dispose();
  }
}
