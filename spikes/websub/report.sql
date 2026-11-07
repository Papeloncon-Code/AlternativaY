-- Informe del spike (specs/003-spike-websub/spec.md §4). SQLite/D1 con funciones de ventana.
-- Base: vídeos nuevos reales (no línea base). La latencia de WebSub se mide con el PRIMER evento
-- WebSub de cada vídeo, aunque el RSS lo haya visto antes, para no sesgar el resultado a favor de WebSub.

-- 1) Latencia de WebSub: n, media, p50 y p90 (minutos)
WITH nuevos AS (
  SELECT video_id, published_at FROM videos
  WHERE first_source IN ('websub','rss') AND published_at IS NOT NULL
),
ws AS (
  SELECT n.video_id, (MIN(e.received_at) - n.published_at) / 60000.0 AS lat_min
  FROM nuevos n JOIN events e ON e.video_id = n.video_id AND e.source = 'websub'
  GROUP BY n.video_id
),
ranked AS (
  SELECT lat_min, ROW_NUMBER() OVER (ORDER BY lat_min) AS rn, COUNT(*) OVER () AS total FROM ws
)
SELECT MAX(total) AS n,
       ROUND(AVG(lat_min), 2) AS media_min,
       ROUND(MIN(CASE WHEN rn >= 0.5 * total THEN lat_min END), 2) AS p50_min,
       ROUND(MIN(CASE WHEN rn >= 0.9 * total THEN lat_min END), 2) AS p90_min
FROM ranked;

-- 2) Cobertura de WebSub: vídeos nuevos con al menos un aviso WebSub / vídeos nuevos totales
SELECT COUNT(*) AS nuevos,
       SUM(EXISTS (SELECT 1 FROM events e WHERE e.video_id = v.video_id AND e.source = 'websub')) AS con_websub,
       ROUND(100.0 * SUM(EXISTS (SELECT 1 FROM events e WHERE e.video_id = v.video_id AND e.source = 'websub')) / COUNT(*), 1) AS cobertura_pct
FROM videos v WHERE v.first_source IN ('websub','rss');

-- 3) Ventaja del RSS: vídeos que el RSS vio antes que WebSub (minutos de diferencia; NULL = WebSub nunca avisó)
SELECT v.video_id, v.title,
       ROUND(((SELECT MIN(received_at) FROM events WHERE video_id = v.video_id AND source = 'websub') - v.first_seen_at) / 60000.0, 2) AS ws_tarde_min
FROM videos v WHERE v.first_source = 'rss';

-- 4) Duplicados (avisos WebSub por vídeo)
SELECT video_id, COUNT(*) AS avisos FROM events WHERE source = 'websub' GROUP BY video_id HAVING avisos > 1;

-- 5) Estado de suscripciones
SELECT status, COUNT(*) FROM channels GROUP BY status;
