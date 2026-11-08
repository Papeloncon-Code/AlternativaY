-- Spike T-007 (specs/003-spike-websub/spec.md)
CREATE TABLE IF NOT EXISTS channels (
  channel_id     TEXT PRIMARY KEY,
  label          TEXT,
  secret         TEXT,            -- hub.secret por canal (HMAC)
  status         TEXT NOT NULL DEFAULT 'pending', -- pending | requested | verified | invalid
  requested_at   INTEGER,
  verified_at    INTEGER,
  lease_expires  INTEGER,
  last_polled_at INTEGER,
  last_error     TEXT,
  rss_failures   INTEGER NOT NULL DEFAULT 0,
  notify         TEXT NOT NULL DEFAULT 'all',  -- campanita: all | noshorts | none
  avatar         TEXT,                         -- foto del canal (CDN pública): vista previa diaria o un dispositivo con Puente
  avatar_at      INTEGER,                      -- última lectura de la vista previa (una vez al día como mucho)
  header         TEXT                          -- cabecera pública del canal (JSON: banner, handle, subs, videos, verified, about, link)
);
CREATE TABLE IF NOT EXISTS videos (
  video_id      TEXT PRIMARY KEY,
  channel_id    TEXT NOT NULL,
  title         TEXT,
  published_at  INTEGER,          -- <published> del Atom (ms)
  first_source  TEXT NOT NULL,    -- websub | rss | baseline
  first_seen_at INTEGER NOT NULL,
  kind          TEXT,             -- short | video | NULL (sin clasificar)
  views         INTEGER,          -- del RSS público (media:statistics)
  likes         INTEGER,          -- del RSS público (media:starRating count)
  description   TEXT,             -- del RSS público (media:description)
  stats_at      INTEGER,
  duration      INTEGER,          -- segundos (pestaña pública «Vídeos» del canal)
  approx        INTEGER           -- 1 = fecha aproximada (vídeo anterior al RSS, «hace 3 semanas»)
);
CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source        TEXT NOT NULL,    -- websub | rss | websub-deleted
  video_id      TEXT,
  channel_id    TEXT,
  title         TEXT,
  published_at  INTEGER,
  updated_at    INTEGER,
  received_at   INTEGER NOT NULL,
  is_new        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS events_video ON events(video_id);
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  subscribed INTEGER, renewed INTEGER, polled INTEGER, new_from_rss INTEGER,
  error TEXT
);
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint   TEXT PRIMARY KEY,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_ok_at INTEGER,
  failures   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_events_received ON events(received_at);
CREATE INDEX IF NOT EXISTS idx_events_video ON events(video_id, source);
CREATE INDEX IF NOT EXISTS idx_runs_at ON runs(at);
CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published_at);
CREATE INDEX IF NOT EXISTS idx_videos_kind ON videos(kind, published_at);
