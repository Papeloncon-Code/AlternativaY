// Control del reproductor oficial incrustado SIN cargar el script de www.youtube.com (iframe_api).
// Ese script fija cookies de seguimiento en .youtube.com nada más cargarse (hallazgo G1 de la revisión independiente).
// Aquí se usa solo el iframe de youtube-nocookie.com y se habla con él por postMessage, el mismo canal que usa el
// script oficial por dentro: “listening” para suscribirse y “command” para las órdenes.
const ORIGIN = 'https://www.youtube-nocookie.com';

export type EmbedInfo = { currentTime: number; duration: number; playerState: number; muted: boolean; playbackRate: number };
export type EmbedEvents = {
  onReady?: () => void;
  onStateChange?: (state: number) => void; // -1 sin empezar · 0 terminado · 1 reproduciendo · 2 pausa · 3 cargando · 5 en cola
  onError?: (code: number) => void;
};
type Vars = Record<string, string | number>;

let seq = 0;

export class EmbedPlayer {
  readonly iframe: HTMLIFrameElement;
  private id = ++seq;
  private info: EmbedInfo = { currentTime: 0, duration: 0, playerState: -1, muted: false, playbackRate: 1 };
  private ready = false;
  private ping?: number;
  private onMsg: (e: MessageEvent) => void;

  constructor(host: HTMLElement, videoId: string, vars: Vars, private ev: EmbedEvents) {
    const q = new URLSearchParams({ enablejsapi: '1', origin: location.origin, widgetid: String(this.id), ...Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)])) });
    const f = document.createElement('iframe');
    f.src = `${ORIGIN}/embed/${encodeURIComponent(videoId)}?${q}`;
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.title = 'Reproductor de vídeo';
    f.style.cssText = 'width:100%;height:100%;border:0;display:block';
    this.iframe = f;
    this.onMsg = (e) => this.handle(e);
    window.addEventListener('message', this.onMsg);
    // Hasta que el reproductor confirma que está listo, se le avisa de que escuchamos (como hace el script oficial).
    f.addEventListener('load', () => { this.listen(); this.ping = window.setInterval(() => (this.ready ? window.clearInterval(this.ping) : this.listen()), 250); });
    host.replaceChildren(f);
  }

  private post(data: object) { this.iframe.contentWindow?.postMessage(JSON.stringify({ ...data, id: this.id, channel: 'widget' }), ORIGIN); }
  private listen() { this.post({ event: 'listening' }); }
  private command(func: string, args: unknown[] = []) { this.post({ event: 'command', func, args }); }

  private handle(e: MessageEvent) {
    if (e.origin !== ORIGIN || e.source !== this.iframe.contentWindow) return;
    let d: { event?: string; info?: unknown };
    try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    if (d.event === 'onReady' && !this.ready) {
      this.ready = true;
      window.clearInterval(this.ping);
      for (const name of ['onStateChange', 'onError']) this.command('addEventListener', [name]);
      this.ev.onReady?.();
    } else if ((d.event === 'infoDelivery' || d.event === 'initialDelivery') && d.info && typeof d.info === 'object') {
      const i = d.info as Partial<EmbedInfo>;
      const prev = this.info.playerState;
      this.info = { ...this.info, ...pick(i) };
      if (i.playerState != null && i.playerState !== prev) this.ev.onStateChange?.(i.playerState);
    } else if (d.event === 'onStateChange' && typeof d.info === 'number') {
      if (d.info !== this.info.playerState) { this.info.playerState = d.info; this.ev.onStateChange?.(d.info); }
    } else if (d.event === 'onError' && typeof d.info === 'number') {
      this.ev.onError?.(d.info);
    }
  }

  getCurrentTime() { return this.info.currentTime; }
  getDuration() { return this.info.duration; }
  getPlayerState() { return this.info.playerState; }
  isMuted() { return this.info.muted; }
  getPlaybackRate() { return this.info.playbackRate; }
  playVideo() { this.command('playVideo'); }
  pauseVideo() { this.command('pauseVideo'); }
  seekTo(sec: number) { this.info.currentTime = sec; this.command('seekTo', [sec, true]); }
  mute() { this.info.muted = true; this.command('mute'); }
  unMute() { this.info.muted = false; this.command('unMute'); }
  setPlaybackRate(r: number) { this.info.playbackRate = r; this.command('setPlaybackRate', [r]); }
  destroy() { window.clearInterval(this.ping); window.removeEventListener('message', this.onMsg); this.iframe.remove(); }
}

function pick(i: Partial<EmbedInfo>): Partial<EmbedInfo> {
  const o: Partial<EmbedInfo> = {};
  if (typeof i.currentTime === 'number') o.currentTime = i.currentTime;
  if (typeof i.duration === 'number' && i.duration > 0) o.duration = i.duration;
  if (typeof i.muted === 'boolean') o.muted = i.muted;
  if (typeof i.playbackRate === 'number') o.playbackRate = i.playbackRate;
  return o;
}
