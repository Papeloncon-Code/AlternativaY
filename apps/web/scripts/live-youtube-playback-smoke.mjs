import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = String(process.env.BASE_URL || 'https://todotube.papelon.workers.dev').replace(/\/$/, '');
const videoId = process.env.PLAYBACK_SMOKE_VIDEO_ID || 'dQw4w9WgXcQ';
const outputDir = process.env.PLAYBACK_SMOKE_OUTPUT || join(process.cwd(), 'playback-smoke-artifacts');

mkdirSync(outputDir, { recursive: true });

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  let proxyRequests = 0;

  page.on('request', (request) => {
    try {
      if (new URL(request.url()).pathname === '/api/youtube/proxy') proxyRequests += 1;
    } catch { /* ignore malformed browser request URLs */ }
  });
  page.on('console', (message) => {
    const text = message.text();
    const isRuntimeWarning = message.type() === 'warning' &&
      /^\[(TodoTube|ShakaPlayerAdapter|SABRPlayer|BotguardService)\]/.test(text);
    if (message.type() === 'error' || isRuntimeWarning) {
      const safeText = text
        .replace(/https?:\/\/[^\s"'<>]+/g, (value) => {
          try {
            const url = new URL(value);
            return url.origin + url.pathname;
          } catch {
            return '[URL redactada]';
          }
        })
        .replace(/((?:po.?token|visitor.?data|integrity.?token|client.?key|encrypted.?key)=)[^&\s]+/gi, '$1[redactado]')
        .slice(0, 1200);
      process.stderr.write('[browser:' + message.type() + '] ' + safeText + '\n');
    }
  });
  page.on('pageerror', (error) => process.stderr.write('[pageerror] ' + error.message + '\n'));
  await page.addInitScript(() => {
    const key = 'todotube:v1';
    const state = JSON.parse(localStorage.getItem(key) || '{}');
    state.promptDismissed = { ...(state.promptDismissed || {}), push: Date.now() };
    localStorage.setItem(key, JSON.stringify(state));
  });

  await page.goto(baseUrl + '/ver/' + videoId, { waitUntil: 'domcontentloaded', timeout: 45_000 });

  const extensionState = await page.evaluate(() => ({
    installed: window.ytcBridge?.installed === true,
    injectedFetch: typeof window.proxyFetch === 'function',
  }));
  if (extensionState.installed || extensionState.injectedFetch) {
    throw new Error('The production playback smoke must run without a browser extension.');
  }

  await page.waitForFunction(() => {
    const video = document.querySelector('.youtube-sabr-player video');
    return !!video && ((video.readyState >= 2 && video.videoWidth > 0) ||
      !!document.querySelector('.youtube-sabr-player .gateway-error'));
  }, null, { timeout: 120_000 });

  const initial = await page.evaluate(() => {
    const video = document.querySelector('.youtube-sabr-player video');
    const error = document.querySelector('.youtube-sabr-player .gateway-error');
    return {
      readyState: video?.readyState ?? 0,
      width: video?.videoWidth ?? 0,
      height: video?.videoHeight ?? 0,
      duration: video?.duration ?? 0,
      muted: video?.muted ?? true,
      volume: video?.volume ?? 0,
      audioTrackCount: video?.audioTracks?.length ?? null,
      error: error?.textContent?.trim() ?? '',
      iframes: document.querySelectorAll('.player-dock iframe').length,
    };
  });

  if (initial.error || initial.readyState < 2 || initial.width <= 0 ||
      initial.height <= 0 || !Number.isFinite(initial.duration) || initial.duration <= 10) {
    await page.screenshot({ path: join(outputDir, 'youtube-playback-failed.png'), fullPage: true });
    throw new Error('YouTube playback did not reach decoded video metadata: ' + JSON.stringify(initial));
  }
  if (initial.iframes !== 0) throw new Error('The TodoTube player inserted an iframe.');
  if (proxyRequests === 0) throw new Error('Playback did not use the same-origin TodoTube relay.');

  const play = page.locator('.youtube-sabr-player .gateway-play');
  if (await play.getAttribute('aria-label') === 'Reproducir') await play.click();
  await page.waitForFunction(() => {
    const video = document.querySelector('.youtube-sabr-player video');
    return !!video && !video.paused && video.currentTime > 2 &&
      (video.getVideoPlaybackQuality?.().totalVideoFrames ?? 0) > 0;
  }, null, { timeout: 30_000 });

  const seek = page.locator('.youtube-sabr-player .gateway-seek');
  const seekTo = async (target) => {
    await seek.evaluate((slider, value) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (!setter) throw new Error('Native range input setter is unavailable.');
      setter.call(slider, String(value));
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    }, target);
    await page.waitForFunction((value) => {
      const video = document.querySelector('.youtube-sabr-player video');
      return !!video && Math.abs(video.currentTime - value) < 2;
    }, target, { timeout: 30_000 });
  };

  const seekForward = Math.min(15, Math.floor(initial.duration - 2));
  await seekTo(seekForward);
  await seekTo(5);

  const audio = await page.locator('.youtube-sabr-player video').evaluate(async (element) => {
    const video = element;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) throw new Error('Web Audio is unavailable for audio verification.');
    const context = new AudioContextConstructor();
    try {
      const source = context.createMediaElementSource(video);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyser.connect(context.destination);
      await context.resume();
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const samples = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(samples);
      let sumSquares = 0;
      for (const sample of samples) {
        const normalized = (sample - 128) / 128;
        sumSquares += normalized * normalized;
      }
      return { rms: Math.sqrt(sumSquares / samples.length), state: context.state };
    } finally {
      await context.close();
    }
  });

  const final = await page.locator('.youtube-sabr-player video').evaluate((element) => {
    const video = element;
    return {
      currentTime: video.currentTime,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      paused: video.paused,
      muted: video.muted,
      volume: video.volume,
      readyState: video.readyState,
      decodedFrames: video.getVideoPlaybackQuality?.().totalVideoFrames ?? null,
      audioTrackCount: video.audioTracks?.length ?? null,
    };
  });
  if (final.width <= 0 || final.decodedFrames === null || final.decodedFrames <= 0 ||
      final.muted || final.volume <= 0 || audio.rms < 0.001) {
    throw new Error('Video frames or audible audio signal were not confirmed: ' +
      JSON.stringify({ final, audio }));
  }

  await page.screenshot({ path: join(outputDir, 'youtube-playback-success.png'), fullPage: false });
  process.stdout.write(JSON.stringify({
    ok: true,
    videoId,
    extensionState,
    proxyRequests,
    initial,
    final,
    audio,
  }) + '\n');
} finally {
  if (browser) await browser.close();
}
