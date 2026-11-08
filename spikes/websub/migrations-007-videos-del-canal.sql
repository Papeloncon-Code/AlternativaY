-- Pestaña pública «Vídeos» del canal (ADR-006, enmienda 5): duración de cada vídeo y vídeos anteriores al RSS.
ALTER TABLE videos ADD COLUMN duration INTEGER;   -- segundos
ALTER TABLE videos ADD COLUMN approx INTEGER;     -- 1 = fecha aproximada («hace 3 semanas»)
