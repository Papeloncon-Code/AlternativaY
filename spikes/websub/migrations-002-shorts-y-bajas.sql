-- Clasificación Short/vídeo y reactivación de canales descartados por el RSS intermitente.
ALTER TABLE videos ADD COLUMN kind TEXT;
UPDATE channels SET status='pending', last_error=NULL, rss_failures=0 WHERE status='invalid';
