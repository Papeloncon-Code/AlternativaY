const base = new URL(process.env.BASE_URL || 'https://todotube.papelon.workers.dev');
const timeout = AbortSignal.timeout(10_000);

async function check(path, validate) {
  const url = new URL(path, base);
  const response = await fetch(url, { signal: timeout, redirect: 'error' });
  if (!response.ok) throw new Error(`${url.pathname} devolvió HTTP ${response.status}`);
  return validate ? validate(await response.json()) : response;
}

await check('/', async () => undefined).catch(async error => {
  // La portada es HTML, no JSON. Se vuelve a consultar de forma explícita abajo.
  if (!String(error).includes('Unexpected end') && !String(error).includes('JSON')) throw error;
});
const home = await fetch(base, { signal: timeout, redirect: 'error' });
if (!home.ok) throw new Error(`La portada devolvió HTTP ${home.status}`);
const html = await home.text();
if (!html.includes('<html') && !html.includes('<!doctype html')) {
  throw new Error('La portada no devolvió un documento HTML');
}

await check('/api/feed?limit=1', data => {
  if (!data || !Array.isArray(data.items)) {
    throw new Error('La API de feed no devolvió el contrato { items: [] }');
  }
});
process.stdout.write(`Smoke OK: ${base.origin} y /api/feed\n`);
