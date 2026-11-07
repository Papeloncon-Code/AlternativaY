-- Foto real del canal (URL pública de la CDN de imágenes). La obtiene el dispositivo con el Puente o la app Android
-- (el servidor no extrae nada) y la comparte para el resto de tus dispositivos. Spec 007 · L3/C1.
ALTER TABLE channels ADD COLUMN avatar TEXT;
