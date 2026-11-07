-- Campanita por canal (all | noshorts | none) y suscripciones Web Push de los navegadores.
ALTER TABLE channels ADD COLUMN notify TEXT NOT NULL DEFAULT 'all';
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint   TEXT PRIMARY KEY,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_ok_at INTEGER,
  failures   INTEGER NOT NULL DEFAULT 0
);
