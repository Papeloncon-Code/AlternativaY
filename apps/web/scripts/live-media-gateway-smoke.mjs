import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const gatewayUrl = (process.env.GATEWAY_URL || 'https://todotube-media-gateway.papelon.workers.dev').replace(/\/$/, '');
const webUrl = (process.env.WEB_URL || 'https://todotube.papelon.workers.dev').replace(/\/$/, '');
const mediaId = process.env.MEDIA_ID;
const mediaFile = process.env.MEDIA_FILE;
const expectedOrigin = process.env.EXPECTED_ORIGIN;
const outputDir = resolve(process.env.EVIDENCE_DIR || 'test-results/live-media-gateway');

assert.ok(mediaId && /^[A-Za-z0-9_-]{1,80}$/.test(mediaId), 'MEDIA_ID is missing or invalid');
assert.ok(mediaFile, 'MEDIA_FILE is missing');
assert.ok(['primary', 'replica-1'].includes(expectedOrigin), 'EXPECTED_ORIGIN must be primary or replica-1');

const url = gatewayUrl + '/v1/media/' + encodeURIComponent(mediaId);
const originHeaders = { Origin: webUrl };
const fileBytes = await readFile(mediaFile);
const fileHash = createHash('sha256').update(fileBytes).digest('hex');
await mkdir(outputDir, { recursive: true });

function check(condition, message) {
  assert.ok(condition, message);
  console.log('PASS ' + message);
}

async function checkHttpContract() {
  const healthResponse = await fetch(gatewayUrl + '/health');
  assert.equal(healthResponse.status, 200, 'Gateway health must be HTTP 200');
  const health = await healthResponse.json();
  assert.deepEqual(health, {
    ok: true,
    service: 'todotube-media-gateway',
    originsConfigured: 2,
    originsAvailable: 2,
    degraded: false,
  });
  check(true, 'health confirms both R2 bindings are available');

  const catalogResponse = await fetch(gatewayUrl + '/v1/catalog', { headers: originHeaders });
  assert.equal(catalogResponse.status, 200, 'Catalog must return HTTP 200');
  assert.equal(catalogResponse.headers.get('access-control-allow-origin'), webUrl, 'Catalog CORS must allow the production web origin');
  const catalog = await catalogResponse.json();
  assert.deepEqual(catalog.origins, { configured: 2, available: 2, degraded: false });
  const item = catalog.items.find((entry) => entry.id === mediaId);
  assert.ok(item, 'The production catalog must expose the public test media');
  assert.equal(item.title, 'TodoTube Live Gateway Test');
  assert.equal(item.contentType, 'video/webm');
  assert.equal(item.size, fileBytes.byteLength);
  check(true, 'catalog lists the same test asset from the configured R2 origins');

  const unauthorizedUpload = await fetch(gatewayUrl + '/v1/admin/media/' + mediaId + '_unauthorized', {
    method: 'PUT',
    headers: { 'Content-Type': 'video/webm' },
  });
  assert.equal(unauthorizedUpload.status, 401, 'Administrative uploads must reject requests without the production bearer token');
  check(true, 'administrative upload endpoint rejects unauthenticated requests');

  const head = await fetch(url, { method: 'HEAD', headers: originHeaders });
  assert.equal(head.status, 200, 'HEAD must return HTTP 200');
  assert.equal(head.headers.get('content-type')?.split(';')[0], 'video/webm');
  assert.equal(Number(head.headers.get('content-length')), fileBytes.byteLength);
  assert.equal(head.headers.get('accept-ranges'), 'bytes');
  assert.ok(head.headers.get('etag'), 'HEAD must expose an ETag');
  assert.equal(head.headers.get('x-media-origin'), expectedOrigin);
  check(true, 'HEAD returns correct MIME type, length, ETag and source origin');

  const full = await fetch(url, { headers: originHeaders });
  assert.equal(full.status, 200, 'Full media GET must return HTTP 200');
  assert.equal(full.headers.get('x-media-origin'), expectedOrigin);
  const downloaded = Buffer.from(await full.arrayBuffer());
  assert.equal(downloaded.byteLength, fileBytes.byteLength);
  assert.equal(createHash('sha256').update(downloaded).digest('hex'), fileHash, 'Full GET must be byte-for-byte identical to the uploaded video');
  check(true, 'GET delivers the complete original file without byte changes');

  const start = Math.min(128, Math.max(0, fileBytes.byteLength - 1024));
  const end = Math.min(start + 1023, fileBytes.byteLength - 1);
  const ranged = await fetch(url, { headers: { ...originHeaders, Range: `bytes=${start}-${end}` } });
  assert.equal(ranged.status, 206, 'A valid Range request must return HTTP 206');
  assert.equal(ranged.headers.get('content-range'), `bytes ${start}-${end}/${fileBytes.byteLength}`);
  assert.equal(ranged.headers.get('x-media-origin'), expectedOrigin);
  const rangedBytes = Buffer.from(await ranged.arrayBuffer());
  assert.deepEqual(rangedBytes, fileBytes.subarray(start, end + 1), 'Range response bytes must match the exact file interval');
  check(true, 'Range returns the exact requested byte interval (206 Partial Content)');

  const invalidRange = await fetch(url, { headers: { ...originHeaders, Range: `bytes=${fileBytes.byteLength + 100}-` } });
  assert.equal(invalidRange.status, 416, 'An impossible Range request must return HTTP 416');
  check(true, 'Unsatisfiable Range is rejected with HTTP 416');

  const notModified = await fetch(url, { headers: { ...originHeaders, 'If-None-Match': head.headers.get('etag') } });
  assert.equal(notModified.status, 304, 'If-None-Match must return HTTP 304');
  check(true, 'ETag conditional request returns HTTP 304');

  const options = await fetch(url, { method: 'OPTIONS', headers: originHeaders });
  assert.equal(options.status, 204);
  assert.match(options.headers.get('access-control-allow-methods') || '', /GET/);
  check(true, 'CORS preflight accepts the production web origin');
}

async function checkBrowserPlayer() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const mediaResponses = [];
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', async (response) => {
    try {
      const responseUrl = new URL(response.url());
      if (responseUrl.origin === gatewayUrl && responseUrl.pathname === `/v1/media/${mediaId}`) {
        mediaResponses.push({
          status: response.status(),
          headers: await response.allHeaders(),
          range: response.request().headers()['range'] || null,
        });
      }
    } catch { /* Ignore non-HTTP browser responses. */ }
  });

  try {
    await page.goto(`${webUrl}/medios/${encodeURIComponent(mediaId)}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const video = page.locator('video.gateway-video');
    await video.waitFor({ state: 'visible', timeout: 45_000 });
    await page.waitForFunction(() => {
      const element = document.querySelector('video.gateway-video');
      return !!element && element.readyState >= 1 && Number.isFinite(element.duration) && element.duration > 0;
    }, null, { timeout: 60_000 });

    const initial = await video.evaluate((element) => ({
      currentSrc: element.currentSrc,
      duration: element.duration,
      readyState: element.readyState,
      hasNativeControls: element.controls,
    }));
    assert.ok(initial.currentSrc.startsWith(url), 'The page player must use the production Gateway URL');
    assert.ok(initial.duration >= 5, 'The browser must read the test video's real duration');
    assert.equal(initial.hasNativeControls, false, 'The page must use TodoTube custom controls, not browser-native controls');
    assert.equal(await page.locator('iframe').count(), 0, 'The media page must not embed a third-party iframe');
    check(true, 'production /medios page loads an HTML5 video from the Gateway with TodoTube controls');

    await page.waitForFunction(() => document.querySelector('video.gateway-video')?.currentSrc.length > 0);
    await page.waitForTimeout(250);
    const matchingOrigin = mediaResponses.find((item) => item.headers['x-media-origin'] === expectedOrigin);
    assert.ok(matchingOrigin, `The browser's media request must report X-Media-Origin=${expectedOrigin}; got ${JSON.stringify(mediaResponses.map((item) => ({ status: item.status, origin: item.headers['x-media-origin'], range: item.range })))}`);
    check(true, `browser media request is served by ${expectedOrigin}`);

    await page.screenshot({ path: resolve(outputDir, `${expectedOrigin}-01-loaded.png`), fullPage: true });
    await video.evaluate((element) => { element.muted = true; });
    await page.getByRole('button', { name: 'Reproducir' }).click();
    await page.waitForFunction(() => (document.querySelector('video.gateway-video')?.currentTime || 0) > 0.75, null, { timeout: 20_000 });
    await page.screenshot({ path: resolve(outputDir, `${expectedOrigin}-02-playing.png`), fullPage: true });
    check(true, 'custom Play control starts the real video and time advances');

    const duration = await video.evaluate((element) => element.duration);
    const target = Math.min(2.5, duration - 0.75);
    const seek = page.getByRole('slider', { name: 'Posición del vídeo' });
    await seek.evaluate((element, value) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (!setter) throw new Error('Native range value setter is unavailable');
      setter.call(element, String(value));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, target);
    await page.waitForFunction((goal) => Math.abs((document.querySelector('video.gateway-video')?.currentTime || 0) - goal) < 0.35, target, { timeout: 15_000 });
    await page.screenshot({ path: resolve(outputDir, `${expectedOrigin}-03-seek.png`), fullPage: true });
    check(true, 'TodoTube seek control changes the playback position');

    await page.getByRole('button', { name: 'Pausar' }).click();
    await page.waitForFunction(() => document.querySelector('video.gateway-video')?.paused === true);
    await page.getByLabel('Velocidad de reproducción').selectOption('1.25');
    const playbackRate = await video.evaluate((element) => element.playbackRate);
    assert.equal(playbackRate, 1.25);
    await page.screenshot({ path: resolve(outputDir, `${expectedOrigin}-04-controls.png`), fullPage: true });
    check(true, 'Pause and playback-speed controls work');
    assert.deepEqual(pageErrors, [], 'Production media page must not throw uncaught JavaScript errors');
  } finally {
    await browser.close();
  }
}

await checkHttpContract();
await checkBrowserPlayer();
const summary = {
  passed: true,
  mediaId,
  expectedOrigin,
  fileBytes: fileBytes.byteLength,
  sha256: fileHash,
  webUrl: `${webUrl}/medios/${mediaId}`,
  gatewayUrl: url,
  tests: [
    'health/readiness for both origins',
    'catalog visibility and CORS',
    'HEAD metadata',
    'full GET byte integrity',
    'GET Range 206 byte integrity',
    'unsatisfiable Range 416',
    'ETag 304',
    'CORS preflight',
    'production browser HTML5 video playback',
    'custom play/pause controls',
    'custom seek control',
    'playback-speed control',
    `source selection: ${expectedOrigin}`,
  ],
};
await writeFile(resolve(outputDir, `${expectedOrigin}-summary.json`), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
