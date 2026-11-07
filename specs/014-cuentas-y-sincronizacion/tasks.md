# Cuentas y sincronización: tareas

Ordenadas por dependencia. IDs globales (ver `specs/002-mvp/tasks.md` para las transversales).

- T-012 · [contracts] Especificación del protocolo de sincronización v1 + 20 vectores de conformidad → RF-011, CA8.3
- T-031 · [server] Autenticación con passkeys + enlace por email, sesiones y revocación de dispositivos → CA8.2, CA8.5
- T-032 · [server] Sync push/pull + cursor + WebSocket de avisos → CA8.3/8.4
- T-034 · [server] Borrado de cuenta y exportación → CA8.5
- T-040 · [android] `:core:sync` (HLC, log de operaciones, LWW por campo, OR-Set) que pasa los vectores de T-012 → CA8.1, CA8.3
- T-041 · [web] Motor de sincronización en TS que pasa los mismos vectores → CA8.3, CA8.4
- T-042 · [qa] Tests de propiedades: N dispositivos y órdenes aleatorios → convergencia → R3
- T-057 · [android] Perfil y sincronización → H8
