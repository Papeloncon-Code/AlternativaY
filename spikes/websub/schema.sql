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
  rss_failures   INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS videos (
  video_id      TEXT PRIMARY KEY,
  channel_id    TEXT NOT NULL,
  title         TEXT,
  published_at  INTEGER,          -- <published> del Atom (ms)
  first_source  TEXT NOT NULL,    -- websub | rss | baseline
  first_seen_at INTEGER NOT NULL,
  kind          TEXT              -- short | video | NULL (sin clasificar)
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
