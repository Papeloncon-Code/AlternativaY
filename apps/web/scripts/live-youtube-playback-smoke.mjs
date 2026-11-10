import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = String(process.env.BASE_URL || 'https://todotube.papelon.workers.dev').replace(/\/$/, '');
const videoId = process.env.PLAYBACK_SMOKE_VIDEO_ID || 'dQw4w9WgXcQ';
const outputDir = process.env.PLAYBACK_SMOKE_OUTPUT || join(process.cwd(), 'playback-smoke-artifacts');

mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
});
let context;
try {
  context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
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
  await page.waitForFunction(() => {
    const video = document.querySelector('.youtube-sabr-player video');
    return !!video && ((video.readyState >= 1 && video.videoWidth > 0) || !!document.querySelector('.youtube-sabr-player .gateway-error'));
  }, null, { timeout: 120_000 });

  const initial = await page.evaluate(() => {
    const video = document.querySelector('.youtube-sabr-player video');
    const error = document.querySelector('.youtube-sabr-player .gateway-error');
    return {
      readyState: video?.readyState ?? 0,
      width: video?.videoWidth ?? 0,
      height: video?.videoHeight ?? 0,
      duration: video?.duration ?? 0,
      error: error?.textContent?.trim() ?? '',
      iframes: document.querySelectorAll('.player-dock iframe').length,
    };
  });

  if (initial.error || initial.width <= 0 || !Number.isFinite(initial.duration) || initial.duration <= 10) {
    await page.screenshot({ path: join(outputDir, 'youtube-playback-failed.png'), fullPage: true });
    throw new Error('YouTube playback did not reach decoded video metadata: ' + JSON.stringify(initial));
  }
  if (initial.iframes !== 0) throw new Error('The TodoTube player inserted an iframe.');

  const play = page.locator('.youtube-sabr-player .gateway-play');
  if (await play.getAttribute('aria-label') === 'Reproducir') await play.click();
  await page.waitForFunction(() => {
    const video = document.querySelector('.youtube-sabr-player video');
    return !!video && !video.paused && video.currentTime > 2;
  }, null, { timeout: 20_000 });

  // Chromium exposes the count of audio bytes decoded by the media element.
  // This is stronger than a manifest's audio declaration, but does not replace
  // a human listening check for audibility and lip-sync.
  await page.waitForFunction(() => {
    const video = document.querySelector('.youtube-sabr-player video');
    return !!video && Number(video.webkitAudioDecodedByteCount || 0) > 0;
  }, null, { timeout: 20_000 });

  const seekTarget = Math.min(15, Math.floor(initial.duration - 2));
  await page.locator('.youtube-sabr-player .gateway-seek').evaluate((element, target) => {
    const slider = element;
    slider.value = String(target);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  }, seekTarget);
  await page.waitForFunction((target) => {
    const video = document.querySelector('.youtube-sabr-player video');
    return !!video && Math.abs(video.currentTime - target) < 2;
  }, seekTarget, { timeout: 20_000 });

  const final = await page.locator('.youtube-sabr-player video').evaluate((element) => {
    const video = element;
    return {
      currentTime: video.currentTime,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      paused: video.paused,
      readyState: video.readyState,
      audioDecodedBytes: Number(video.webkitAudioDecodedByteCount || 0),
    };
  });
  await page.screenshot({ path: join(outputDir, 'youtube-playback-success.png'), fullPage: false });
  process.stdout.write(JSON.stringify({ ok: true, videoId, initial, final }) + '\n');
} finally {
  if (context) await context.close();
  await browser.close();
}
