# Avisos en tiempo real: tareas

Ordenadas por dependencia. IDs globales (ver `specs/002-mvp/tasks.md` para las transversales).

- T-007 · [técnico] **Spike WebSub (crítico):** suscribir 20 canales de prueba, medir la latencia de los avisos de vídeo, estreno y directo durante 2 semanas, confirmar en la guía oficial el lease y el formato → CA11.1–11.4
- T-009 · [técnico] Spike: FCM topics + UnifiedPush (ntfy) + Web Push en una app de prueba → CA11.5
- T-035 · [server] **notify-service**: suscripción y renovación WebSub, callback con HMAC, deduplicación por `videoId` → CA11.1, CA11.3 · depende de T-007
- T-036 · [server] Distribuidor de push: FCM topics, UnifiedPush y Web Push (VAPID) → CA11.1, CA11.5, CA11.7 · depende de T-009
- T-037 · [server] Respaldo: sondeo RSS por canal (una vez para todos) → CA11.4
- T-038 · [android] `:core:notifications`: receptor FCM/UnifiedPush, clasificación (vídeo, Short, estreno, directo), alarmas exactas de estrenos, ajustes por canal → CA11.2, CA11.6
- T-039 · [web] Service Worker con Web Push y notificaciones → CA11.1
