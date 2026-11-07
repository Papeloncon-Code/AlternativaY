# Cuentas y sincronización: especificación

| Campo | Valor |
|---|---|
| Estado | Borrador (reorganizado el 2026-11-07 desde `002-mvp/spec.md`) |
| Requisitos | RF-011 |
| Decisiones | — |
| Plataformas | Servidor + Android + web |
| Plan técnico | [plan.md](plan.md) |
| Tareas | [tasks.md](tasks.md) |

## Objetivo
Continuar en cualquier dispositivo (Android ↔ web) sin cuenta de Google, con la app plenamente usable sin cuenta.

## Historias y criterios de aceptación
### H8. Cuenta y sincronización (RF-011)
- **CA8.1:** la app funciona al 100 % sin cuenta.
- **CA8.2:** registro e inicio de sesión con passkey o enlace por email. Vincular un segundo dispositivo sube el estado local completo y lo fusiona.
- **CA8.3:** convergencia:
  - *dados* dos dispositivos que editan sin conexión la misma colección (A añade X, B añade Y y borra Z),
  - *cuando* ambos se reconectan,
  - *entonces* los dos muestran {X, Y} sin Z en < 10 s (RNF-005).
- **CA8.4:** el progreso de reproducción iniciado en Android se puede continuar en la web desde la posición sincronizada.
- **CA8.5:** borrar la cuenta elimina los datos del servidor en ≤ 30 días (inmediato en el log activo) y conserva los datos locales.

## Aclaraciones pendientes ([NECESITA ACLARACIÓN])
Resolver antes de cerrar el plan (paso *clarify*):
- [ ] ¿Cifrado de extremo a extremo desde el principio u opcional en fase 5?
- [ ] ¿Biblioteca de autenticación (Better Auth o SimpleWebAuthn)? Falta evaluar madurez
