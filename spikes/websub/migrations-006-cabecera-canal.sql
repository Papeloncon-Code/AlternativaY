-- Cabecera pública del canal (ADR-006, enmienda 4): banner, @usuario, suscriptores, vídeos, verificado,
-- descripción y primer enlace, como JSON. Se lee en la misma petición diaria de la foto.
ALTER TABLE channels ADD COLUMN header TEXT;
