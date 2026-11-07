-- Migración: reintentos de RSS antes de marcar un canal como inválido.
ALTER TABLE channels ADD COLUMN rss_failures INTEGER NOT NULL DEFAULT 0;
-- Los canales marcados inválidos por un único 404 vuelven a pendiente.
UPDATE channels SET status='pending', last_error=NULL WHERE status='invalid' AND last_error='RSS 404';
