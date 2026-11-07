// Reproductor propio de TodoTube: Shaka Player + SABR (googlevideo) + YouTube.js + BotGuard en el navegador (bgutils-js).
// Lógica derivada de googlevideo/examples/sabr-shaka-example/src/main.ts (MIT, © LuanRT). Spec: specs/006-spike-reproductor-propio.
import shaka from 'shaka-player/dist/shaka-player.ui';
import type { Types } from 'youtubei.js/web';
import { Constants, Innertube, Platform, Utils, YT } from 'youtubei.js/web';
import { getInnertube } from './innertube';
import { SabrStreamingAdapter } from 'googlevideo/sabr-streaming-adapter';
import { buildSabrFormat } from 'googlevideo/utils';
import { ShakaPlayerAdapter } from './ShakaPlayerAdapter';
import { checkExtension } from './helpers';
import { botguardService } from './BotguardService';
import 'shaka-player/dist/controls.css';

// YouTube.js necesita evaluar el código del reproductor de YouTube para descifrar las URL (igual que hace youtube.com).
Platform.shim.eval = async (data: Types.BuildScriptResult) => new Function(data.output)();

export type LoadInfo = { title: string; author: string; isLive: boolean; views?: number; description?: string; lengthSeconds?: number };

// ---- Carga rápida (docs/research/08): todo lo que se puede preparar antes del clic ----
type Cached = { at: number; response: Awaited<ReturnType<Innertube['actions']['execute']>> };
const responseCache = new Map<string, Cached>();
const pending = new Map<string, Promise<Cached['response']>>();
const FRESH_MS = 5 * 60_000;

/** Al abrir la web: sesión de YouTube.js (en caché entre visitas) + BotGuard (token de integridad). */
export function prewarm(): void {
  void getInnertube().catch(() => {});
  botguardService.init().catch(() => {});
}

function preconnect(url?: string) {
  try {
    if (!url) return;
    const origin = new URL(url).origin;
    if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'preconnect'; l.href = origin; l.crossOrigin = 'anonymous';
    document.head.appendChild(l);
  } catch { /* URL inválida */ }
}

async function requestPlayer(videoId: string) {
  const cached = responseCache.get(videoId);
  if (cached && Date.now() - cached.at < FRESH_MS) return cached.response;
  const inflight = pending.get(videoId);
  if (inflight) return inflight;
  const p = (async () => {
    const innertube = await getInnertube();
    const response = await innertube.actions.execute('/player', {
      videoId, contentCheckOk: true, racyCheckOk: true, client: 'VISIONOS',
      playbackContext: { contentPlaybackContext: { signatureTimestamp: innertube.session.player?.signature_timestamp } },
    });
    responseCache.set(videoId, { at: Date.now(), response });
    const sd = (response as { data?: { streamingData?: { serverAbrStreamingUrl?: string } } }).data?.streamingData;
    preconnect(sd?.serverAbrStreamingUrl);
    return response;
  })();
  pending.set(videoId, p);
  try { return await p; } finally { pending.delete(videoId); }
}

/** Al pasar el ratón o el dedo por un vídeo: pide sus datos de reproducción por adelantado. */
export function prefetch(videoId: string): void {
  void requestPlayer(videoId).catch(() => {});
}

export class TodoTubePlayer {
  private player?: shaka.Player;
  private ui?: shaka.ui.Overlay;
  private sabr?: SabrStreamingAdapter;
  private poToken?: string;
  private coldStart?: string;
  private binding?: string;
  private minting = false;

  static available(): boolean {
    return checkExtension() && shaka.Player.isBrowserSupported();
  }

  async attach(video: HTMLVideoElement, container: HTMLElement): Promise<void> {
    shaka.polyfill.installAll();
    const it = getInnertube();
    botguardService.init().catch((e) => console.warn('[TodoTube] BotGuard no disponible todavía', e));
    this.player = new shaka.Player();
    this.player.configure({ abr: { enabled: true, defaultBandwidthEstimate: 5_000_000 }, streaming: { bufferingGoal: 60, rebufferingGoal: 1.5 } });
    await this.player.attach(video);
    this.ui = new shaka.ui.Overlay(this.player, container, video);
    this.ui.configure({
      addBigPlayButton: false,
      overflowMenuButtons: ['captions', 'quality', 'language', 'chapter', 'picture_in_picture', 'playback_rate'],
      seekBarColors: { base: 'rgba(255,255,255,.25)', buffered: 'rgba(255,255,255,.45)', played: '#C8F169' },
      customContextMenu: true,
    });
    await it;
  }

  async load(videoId: string, startTime = 0): Promise<LoadInfo> {
    const player = this.player;
    if (!player) throw new Error('Reproductor no inicializado');
    const innertube = await getInnertube();
    this.poToken = undefined;
    this.binding = videoId;
    await player.unload();
    this.sabr?.dispose();

    const playerResponse = await requestPlayer(videoId);
    responseCache.delete(videoId); // un uso por respuesta: la siguiente reproducción pide datos frescos
    const cpn = Utils.generateRandomString(16);
    const info = new YT.VideoInfo([playerResponse], innertube.actions, cpn);
    if (info.playability_status?.status !== 'OK') {
      throw new Error(info.playability_status?.reason || 'No se puede reproducir este vídeo.');
    }

    const isLive = !!info.basic_info.is_live;
    const isPostLiveDVR = !!info.basic_info.is_post_live_dvr ||
      (!!info.basic_info.is_live_content && !!(info.streaming_data?.dash_manifest_url || info.streaming_data?.hls_manifest_url));

    const client = innertube.session.context.client;
    const sabr = new SabrStreamingAdapter({
      playerAdapter: new ShakaPlayerAdapter(),
      clientInfo: {
        osName: client.osName,
        osVersion: client.osVersion,
        clientName: parseInt(Constants.CLIENT_NAME_IDS[client.clientName as keyof typeof Constants.CLIENT_NAME_IDS]),
        clientVersion: client.clientVersion,
      },
    });
    this.sabr = sabr;

    sabr.onMintPoToken(async () => {
      if (!this.poToken) {
        if (isLive) await this.mint();
        else void this.mint();
      }
      return this.poToken || this.coldStart || '';
    });

    sabr.onReloadPlayerResponse(async (reloadContext) => {
      const reloaded = await innertube.actions.execute('/player', {
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
        playbackContext: {
          adPlaybackContext: { pyv: true },
          contentPlaybackContext: { signatureTimestamp: innertube.session.player?.signature_timestamp },
          reloadPlaybackContext: reloadContext,
        },
      });
      const parsed = new YT.VideoInfo([reloaded], innertube.actions, cpn);
      sabr.setStreamingURL(await innertube.session.player!.decipher(parsed.streaming_data?.server_abr_streaming_url));
      sabr.setUstreamerConfig(info.player_config?.media_common_config.media_ustreamer_request_config?.video_playback_ustreamer_config);
    });

    sabr.attach(player);

    if (info.streaming_data && !isPostLiveDVR && !isLive) {
      sabr.setStreamingURL(await innertube.session.player!.decipher(info.streaming_data.server_abr_streaming_url));
      sabr.setUstreamerConfig(info.player_config?.media_common_config.media_ustreamer_request_config?.video_playback_ustreamer_config);
      sabr.setServerAbrFormats(info.streaming_data.adaptive_formats.map(buildSabrFormat));
    }

    let manifest: string | undefined;
    if (info.streaming_data) {
      if (isLive) {
        manifest = info.streaming_data.dash_manifest_url ? `${info.streaming_data.dash_manifest_url}/mpd_version/7` : info.streaming_data.hls_manifest_url;
      } else if (isPostLiveDVR) {
        manifest = info.streaming_data.hls_manifest_url || `${info.streaming_data.dash_manifest_url}/mpd_version/7`;
      } else {
        const dash = await info.toDash({ manifest_options: { is_sabr: true, captions_format: 'vtt', include_thumbnails: false } });
        manifest = `data:application/dash+xml;base64,${btoa(dash)}`;
      }
    }
    if (!manifest) throw new Error('No se encontró una forma de reproducir este vídeo.');

    await player.load(manifest, startTime > 0 ? startTime : undefined);
    const bi = info.basic_info as { view_count?: number; short_description?: string; duration?: number };
    return { title: info.basic_info.title ?? '', author: info.basic_info.author ?? '', isLive, views: bi.view_count, description: bi.short_description, lengthSeconds: bi.duration };
  }

  private async mint(): Promise<void> {
    if (!this.binding || this.minting) return;
    this.minting = true;
    try {
      this.coldStart = botguardService.mintColdStartToken(this.binding);
      if (!botguardService.isInitialized()) await botguardService.reinit();
      if (botguardService.integrityTokenBasedMinter) {
        this.poToken = await botguardService.integrityTokenBasedMinter.mintAsWebsafeString(decodeURIComponent(this.binding));
      }
    } catch (e) {
      console.error('[TodoTube] Error generando el token de reproducción', e);
    } finally {
      this.minting = false;
    }
  }

  getVideo(): HTMLMediaElement | null {
    return this.player?.getMediaElement() ?? null;
  }

  async destroy(): Promise<void> {
    this.sabr?.dispose();
    await this.ui?.destroy();
    await this.player?.destroy();
  }
}
