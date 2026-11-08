const base = new URL(process.env.BASE_URL || 'https://todotube.papelon.workers.dev');
const timeout = AbortSignal.timeout(10_000);

const home = await fetch(base, { signal: timeout, redirect: 'error' });
if (!home.ok) throw new Error(`La portada devolvió HTTP ${home.status}`);
const html = await home.text();
if (!html.includes('<html') && !html.includes('<!doctype html')) {
  throw new Error('La portada no devolvió un documento HTML');
}

const feedUrl = new URL('/api/feed?limit=1', base);
const feedResponse = await fetch(feedUrl, { signal: timeout, redirect: 'error' });
if (!feedResponse.ok) throw new Error(`/api/feed devolvió HTTP ${feedResponse.status}`);
const feed = await feedResponse.json();
if (!feed || !Array.isArray(feed.items)) {
  throw new Error('La API de feed no devolvió el contrato { items: [] }');
}

process.stdout.write(`Smoke OK: ${base.origin} y /api/feed\n`);
