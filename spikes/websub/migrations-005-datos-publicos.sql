-- Datos públicos sin Puente (ADR-006, enmienda 3): del RSS público (visitas, me gusta, descripción)
-- y fecha de la última lectura de la vista previa del canal (foto y nombre, una vez al día).
ALTER TABLE videos ADD COLUMN views INTEGER;
ALTER TABLE videos ADD COLUMN likes INTEGER;
ALTER TABLE videos ADD COLUMN description TEXT;
ALTER TABLE videos ADD COLUMN stats_at INTEGER;
ALTER TABLE channels ADD COLUMN avatar_at INTEGER;
