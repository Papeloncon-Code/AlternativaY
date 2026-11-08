-- Índices para no recorrer tablas enteras (2026-11-08: se agotó el límite gratuito diario de lecturas de D1,
-- 8,8 M filas: borrado de events sin índice cada 5 min y recuento de vídeos por canal en cada visita).
CREATE INDEX IF NOT EXISTS idx_events_received ON events(received_at);
CREATE INDEX IF NOT EXISTS idx_events_video ON events(video_id, source);
CREATE INDEX IF NOT EXISTS idx_runs_at ON runs(at);
CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published_at);
CREATE INDEX IF NOT EXISTS idx_videos_kind ON videos(kind, published_at);
