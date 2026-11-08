import http from 'node:http';

const PORT = Number(process.env.E2E_API_PORT || 4174);
const now = Math.floor(Date.now() / 1000);
const nowMs = Date.now();
const channelIds = [
  'UCNye-wNBqNL5ZzHSJj3l8Bg',
  'UCaaaaaaaaaaaaaaaaaaaaaa',
  'UCbbbbbbbbbbbbbbbbbbbbbb',
  'UCcccccccccccccccccccccc',
];

const svg = (width, height, fill) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${fill}"/></svg>`
)}`;

const videos = Array.from({ length: 400 }, (_, i) => {
  const channelIndex = Math.floor(i / 100);
  const id = i === 0 ? 'dQw4w9WgXcQ' : `TD${String(i).padStart(9, '0')}`;
  const isLong = (i % 50) < 36;
  const title = i % 3 === 0
    ? `News briefing ${i + 1}: actualidad y tecnología`
    : `Noticias y análisis del canal ${channelIndex + 1} · episodio ${i + 1}`;
  return {
    id,
    title: i === 0 ? 'Rick Astley - Never Gonna Give You Up' : title,
    publishedAt: now - i * 3600,
    channelId: channelIds[channelIndex],
    channel: ['Canal Noticias Uno', 'Canal Tecnología Dos', 'Canal Cultura Tres', 'Canal Ciencia Cuatro'][channelIndex],
    source: i % 3 === 0 ? 'rss' : i % 3 === 1 ? 'websub' : 'baseline',
    // La app compara seenAt con Date.now() en milisegundos; publishedAt, en cambio, son segundos Unix.
    seenAt: nowMs - i * 1_800_000,
    kind: isLong ? 'video' : 'short',
    views: 100000 - i * 97,
    likes: 5000 - i * 3,
    duration: isLong ? 180 + (i % 3600) : 35 + (i % 25),
  };
});

const channels = channelIds.map((id, i) => ({
  id,
  name: ['Canal Noticias Uno', 'Canal Tecnología Dos', 'Canal Cultura Tres', 'Canal Ciencia Cuatro'][i],
  status: 'verified',
  verifiedAt: nowMs,
  lastError: null,
  notify: 'all',
  avatar: svg(96, 96, ['#345b78', '#47684c', '#795c8a', '#8a6546'][i]),
  videos: 100,
  header: i === 0 ? {
    title: 'Canal Noticias Uno',
    verified: true,
    handle: '@canalnoticiasuno',
    subs: '125 mil suscriptores',
    videos: '100 vídeos',
    about: 'Canal de pruebas de integración de TodoTube. Noticias, tecnología y análisis.',
    link: { text: 'Sitio web', url: 'https://example.com', more: null },
    banner: svg(2560, 400, '#345b78'),
    featured: { id: videos.find(v => v.channelId === id && v.kind === 'video').id, title: 'Vídeo destacado', about: 'Descripción de prueba', views: '100 mil visualizaciones', ago: 'hace 1 día' },
  } : null,
}));

const descriptions = videos.map(v => ({
  id: v.id,
  d: `Descripción de prueba para ${v.title}. Este contenido se usa exclusivamente en las pruebas automatizadas de TodoTube.`,
  v: v.views,
  l: v.likes,
}));

const json = (res, data, status = 200) => {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok');
  }

  if (req.method === 'GET' && url.pathname === '/api/feed') {
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 60, 1), 1000);
    const before = Number(url.searchParams.get('before'));
    const list = Number.isFinite(before) && before > 0
      ? videos.filter(v => v.publishedAt < before)
      : videos;
    return json(res, { items: list.slice(0, limit) });
  }

  if (req.method === 'GET' && url.pathname === '/api/channels') {
    return json(res, { items: channels });
  }

  if (req.method === 'GET' && url.pathname === '/api/descriptions') {
    return json(res, { items: descriptions });
  }

  if (req.method === 'GET' && url.pathname === '/api/push/key') {
    return json(res, { publicKey: 'BIFVJaAidSzR22FLmskgIC4fdsAfCNPnsHMVAWeSVyNi_P7mddVhRjMuzqbjOBmnykA5OgGZNIy8SFkXol2P0' });
  }

  if (url.pathname === '/api/channels' && req.method === 'POST') {
    let body = {};
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { return json(res, { error: 'JSON inválido' }, 400); }
    const match = String(body.input || '').match(/(UC[A-Za-z0-9_-]{22})/);
    if (!match) return json(res, { error: 'ID de canal inválido' }, 400);
    return json(res, { error: 'Clave de propietario incorrecta' }, 401);
  }

  if (url.pathname.startsWith('/api/channels/') || url.pathname.startsWith('/api/push/')) {
    return json(res, { error: 'Clave de propietario incorrecta' }, 401);
  }

  return json(res, { error: 'No encontrado' }, 404);
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`E2E API fixture listening on 127.0.0.1:${PORT}\n`);
});
