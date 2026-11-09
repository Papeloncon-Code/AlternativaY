import shaka from 'shaka-player/dist/shaka-player.ui';
import type { ApiResponse, Types } from 'youtubei.js/web';
import { Constants, Innertube, Platform, UniversalCache, Utils, YT } from 'youtubei.js/web';
import { SabrStreamingAdapter } from 'googlevideo/sabr-streaming-adapter';
import { buildSabrFormat } from 'googlevideo/utils';
import { checkExtension, fetchFunction } from './helpers';
import { botguardService } from './BotguardService';
import { ShakaPlayerAdapter } from './ShakaPlayerAdapter';

type YouTubeClient = 'VISIONOS' | 'WEB' | 'ANDROID_VR';
type SourceMode = 'sabr-dash' | 'dash' | 'hls' | 'direct';

type SourceCandidate = {
  mode: SourceMode;
  uri: string;
  info: InstanceType<typeof YT.VideoInfo>;
  client: YouTubeClient;
  isLive: boolean;
};

type RuntimeCallbacks = {
  onStatus?: (status: 'loading' | 'playing' | 'switching' | 'error', detail?: string) => void;
  onFatal?: (error: Error) => void;
  onSource?: (mode: SourceMode, client: YouTubeClient) => void;
};

const CLIENT_FALLBACK_ORDER: YouTubeClient[] = ['VISIONOS', 'WEB', 'ANDROID_VR'];
const PLAYER_REQUEST_TIMEOUT_MS = 7_000;

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

/**
 * Browser-side YouTube playback runtime based on the MIT-licensed
 * googlevideo + Shaka integration demonstrated by Kira.
 *
 * This runtime never sends media through the TodoTube Cloudflare Worker.
 * The browser bridge handles InnerTube/CORS requests; Shaka fetches media
 * segments from their returned source URLs in the browser.
 */
export class YouTubeSabrRuntime {
  private innertube: Innertube | null = null;
  private player: shaka.Player | null = null;
  private sabrAdapter: SabrStreamingAdapter | null = null;
  private video: HTMLVideoElement | null = null;
  private candidates: SourceCandidate[] = [];
  private candidateIndex = -1;
  private nextClientIndex = 0;
  private videoId = '';
  private playbackToken = '';
  private coldStartToken = '';
  private tokenLock = false;
  private loading = false;
  private switching = false;
  private destroyed = false;
  private callbacks: RuntimeCallbacks;
  private lastError = '';

  constructor(callbacks: RuntimeCallbacks = {}) {
    this.callbacks = callbacks;
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

    this.innertube = await Innertube.create({
      cache: new UniversalCache(true),
      fetch: fetchFunction,
    });

    // Token setup is deliberately started in the background. Playback resolution
    // is attempted first and the adapter waits for it only when the stream needs it.
    void botguardService.init().catch((error) => {
      console.warn('[TodoTube] No se pudo inicializar el servicio de integridad:', error);
    });

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
  }

  async load(videoId: string, startAt = 0, autoplay = true): Promise<void> {
    if (!this.player || !this.innertube || !this.video) {
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
    this.lastError = '';
    this.callbacks.onStatus?.('loading', 'Resolviendo proveedores de reproducción…');

    const found = await this.loadNextClient(startAt, autoplay);
    if (!found) {
      throw new Error(this.lastError || 'Ninguna de las rutas de reproducción disponibles pudo entregar este vídeo.');
    }
  }

  private async fetchPlayerInfo(client: YouTubeClient) {
    if (!this.innertube) throw new Error('InnerTube no está inicializado.');
    const request = this.innertube.actions.execute('/player', {
      videoId: this.videoId,
      contentCheckOk: true,
      racyCheckOk: true,
      client,
      playbackContext: {
        contentPlaybackContext: {
          signatureTimestamp: this.innertube.session.player?.signature_timestamp,
        },
      },
    });
    return timeout(request, PLAYER_REQUEST_TIMEOUT_MS, 'InnerTube ' + client);
  }

  private async buildCandidates(response: ApiResponse, client: YouTubeClient): Promise<SourceCandidate[]> {
    if (!this.innertube) return [];
    const info = new YT.VideoInfo([response], this.innertube.actions, Utils.generateRandomString(16));
    const streaming = info.streaming_data;
    if (!streaming) return [];

    const isLive = !!info.basic_info.is_live;
    const isPostLiveDvr = !!info.basic_info.is_post_live_dvr ||
      (info.basic_info.is_live_content && !!(streaming.dash_manifest_url || streaming.hls_manifest_url));
    const candidates: SourceCandidate[] = [];

    // Primary: SABR/UMP delivered to Shaka through googlevideo's streaming adapter.
    if (!isLive && !isPostLiveDvr && streaming.server_abr_streaming_url &&
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
        client,
        isLive,
      });
    }

    // Independent transport fallbacks from the same player response.
    if (streaming.dash_manifest_url) {
      candidates.push({
        mode: 'dash',
        uri: isLive ? streaming.dash_manifest_url + '/mpd_version/7' : streaming.dash_manifest_url,
        info,
        client,
        isLive,
      });
    }
    if (streaming.hls_manifest_url) {
      candidates.push({
        mode: 'hls',
        uri: streaming.hls_manifest_url,
        info,
        client,
        isLive,
      });
    }

    // Direct progressive is a last-resort path. Only formats that already
    // contain a concrete URL are used; no DRM licence path is attempted.
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
        client,
        isLive,
      });
    }

    // Some clients return adaptive video/audio formats but no server DASH URL.
    // VideoInfo builds a regular DASH manifest from the exposed format URLs.
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
      this.callbacks.onStatus?.('switching', 'Probando ruta ' + client + '…');

      try {
        const response = await this.fetchPlayerInfo(client);
        const info = new YT.VideoInfo([response], this.innertube!.actions, Utils.generateRandomString(16));
        if (info.playability_status?.status !== 'OK') {
          this.lastError = info.playability_status?.reason || ('YouTube rechazó el cliente ' + client + '.');
          continue;
        }

        const candidates = await this.buildCandidates(response, client);
        if (!candidates.length) {
          this.lastError = 'El cliente ' + client + ' no devolvió ningún transporte reproducible.';
          continue;
        }

        this.candidates = candidates;
        this.candidateIndex = -1;

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
        this.lastError = error instanceof Error ? error.message : String(error);
        console.warn('[TodoTube] Falló la resolución con ' + client + ':', error);
      }
    }
    return false;
  }

  private async attachSabr(info: InstanceType<typeof YT.VideoInfo>, client: YouTubeClient): Promise<void> {
    if (!this.player || !this.innertube) throw new Error('El reproductor no está disponible.');
    this.sabrAdapter?.dispose();

    const adapter = new SabrStreamingAdapter({
      playerAdapter: new ShakaPlayerAdapter(),
      clientInfo: {
        osName: this.innertube.session.context.client.osName,
        osVersion: this.innertube.session.context.client.osVersion,
        clientName: parseInt(Constants.CLIENT_NAME_IDS[
          this.innertube.session.context.client.clientName as keyof typeof Constants.CLIENT_NAME_IDS
        ]),
        clientVersion: this.innertube.session.context.client.clientVersion,
      },
    });

    adapter.onMintPoToken(async () => {
      if (!this.playbackToken && !this.tokenLock) {
        if (info.basic_info.is_live) {
          await this.mintPlaybackToken();
        } else {
          void this.mintPlaybackToken();
        }
      }
      return this.playbackToken || this.coldStartToken || '';
    });

    adapter.onReloadPlayerResponse(async (reloadContext) => {
      if (!this.innertube) return;
      const refreshed = await this.innertube.actions.execute('/player', {
        videoId: this.videoId,
        contentCheckOk: true,
        racyCheckOk: true,
        client,
        playbackContext: {
          contentPlaybackContext: {
            signatureTimestamp: this.innertube.session.player?.signature_timestamp,
          },
          reloadPlaybackContext: reloadContext,
        },
      });
      const refreshedInfo = new YT.VideoInfo([refreshed], this.innertube.actions, Utils.generateRandomString(16));
      adapter.setStreamingURL(await this.innertube.session.player!.decipher(
        refreshedInfo.streaming_data?.server_abr_streaming_url,
      ));
      adapter.setUstreamerConfig(
        refreshedInfo.player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config,
      );
    });

    adapter.attach(this.player);
    adapter.setStreamingURL(await this.innertube.session.player!.decipher(
      info.streaming_data?.server_abr_streaming_url,
    ));
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
      console.warn('[TodoTube] No se pudo obtener el token de reproducción:', error);
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
        await this.attachSabr(candidate.info, candidate.client);
      } else {
        this.sabrAdapter?.dispose();
        this.sabrAdapter = null;
      }

      await this.player.load(candidate.uri, candidate.isLive ? undefined : Math.max(0, resumeAt));
      this.candidateIndex = index;
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

  private handlePlayerError = (event: Event): void => {
    if (this.destroyed || this.loading || this.switching || this.candidateIndex < 0) return;
    const detail = (event as CustomEvent).detail;
    const error = detail?.message || 'El transporte activo dejó de funcionar.';
    void this.switchToNextSource(error);
  };

  async switchToNextSource(reason = 'El transporte activo falló.'): Promise<boolean> {
    if (this.destroyed || this.switching || !this.video) return false;
    this.switching = true;
    const resumeAt = Number.isFinite(this.video.currentTime) ? this.video.currentTime : 0;
    const autoplay = !this.video.paused && !this.video.ended;
    this.callbacks.onStatus?.('switching', reason + ' Probando una ruta alternativa…');

    try {
      for (let index = this.candidateIndex + 1; index < this.candidates.length; index++) {
        try {
          await this.activateCandidate(this.candidates[index], index, resumeAt, autoplay);
          return true;
        } catch (error) {
          this.lastError = error instanceof Error ? error.message : String(error);
        }
      }

      const found = await this.loadNextClient(resumeAt, autoplay);
      if (found) return true;

      const error = new Error(this.lastError || 'Se agotaron las rutas de reproducción.');
      this.callbacks.onStatus?.('error', error.message);
      this.callbacks.onFatal?.(error);
      return false;
    } finally {
      this.switching = false;
    }
  }

  async dispose(): Promise<void> {
    this.destroyed = true;
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
    this.innertube = null;
    this.video = null;
    this.candidates = [];
    botguardService.dispose();
  }
}
