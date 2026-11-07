-- Informe del spike (specs/003-spike-websub/spec.md §4)
-- Latencia de WebSub en vídeos nuevos (minutos)
SELECT COUNT(*) AS n,
       ROUND(AVG((first_seen_at - published_at) / 60000.0), 1) AS media_min
FROM videos WHERE first_source = 'websub' AND published_at IS NOT NULL;
-- Lista para calcular percentiles
SELECT video_id, channel_id, title, ROUND((first_seen_at - published_at) / 60000.0, 2) AS lat_min
FROM videos WHERE first_source IN ('websub','rss') ORDER BY lat_min;
-- Cobertura: quién lo vio primero
SELECT first_source, COUNT(*) FROM videos WHERE first_source <> 'baseline' GROUP BY first_source;
-- Duplicados (avisos WebSub por vídeo)
SELECT video_id, COUNT(*) AS avisos FROM events WHERE source = 'websub' GROUP BY video_id HAVING avisos > 1;
-- Estado de suscripciones
SELECT status, COUNT(*) FROM channels GROUP BY status;
