# Spike T-007 · Latencia real de los avisos WebSub de YouTube

Estado: **En ejecución** · 2026-11-06 · Requisitos: RF-035, ADR-006, CA11.1–11.4.

## 1. Pregunta que debe responder
¿Cuánto tarda en llegar a nuestro servidor el aviso oficial de YouTube (WebSub) desde que un creador publica, y es fiable para vídeos, estrenos y directos? La ventaja principal del producto depende de la respuesta.

## 2. Hipótesis
- **H1:** el p90 de latencia (publicación → llegada del aviso) es ≤ 3 min para vídeos normales.
- **H2:** WebSub avisa de ≥ 95 % de los vídeos nuevos. Se mide comparando con el respaldo RSS: si el RSS ve un vídeo antes que WebSub, cuenta como fallo de WebSub.
- **H3:** los estrenos y directos programados generan un aviso al programarse. El inicio real no está garantizado (ADR-006).

## 3. Diseño
- **Infraestructura:** Cloudflare Worker `alternativay-websub` (cuenta del propietario, plan gratis) + D1 `alternativay-websub` + cron cada 5 min.
- **Notificación al propietario:** app ntfy (topic privado aleatorio) para comprobar la latencia a simple vista.
- **Endpoints:**
  - `GET /websub/:channelId`: verificación del hub (`hub.challenge`); comprueba que `hub.topic` coincide con el canal.
  - `POST /websub/:channelId`: aviso del hub. Verifica `X-Hub-Signature` (HMAC-SHA1 con el secreto del canal), extrae `videoId`, `published` y `updated`, y lo registra. Si el vídeo es nuevo, envía un aviso a ntfy.
  - `GET /health`.
- **Cron (cada 5 min):**
  1. suscribe los canales pendientes y renueva los leases que caducan en < 24 h (lease solicitado: 5 días);
  2. respaldo RSS: consulta el RSS público de hasta 7 canales por ejecución, por rotación. Con 20 canales, cada uno se revisa unas cada 15 min. La rotación respeta el límite de 10 ms de CPU del plan gratis.
- **Datos:** el servidor solo usa WebSub y el RSS público (constitución §I.2). No extrae nada de YouTube.

## 4. Métricas (consultas SQL en `report.sql`)
| Métrica | Definición |
|---|---|
| `latencia_websub` | `received_at − published` del primer aviso WebSub de cada vídeo nuevo |
| `cobertura_websub` | vídeos nuevos detectados primero por WebSub / vídeos nuevos totales |
| `ventaja_rss` | casos en que el RSS detectó el vídeo antes (minutos de diferencia) |
| `duplicados` | avisos WebSub por vídeo (ediciones de título) |

## 5. Criterios de aceptación del spike
- **CA-S1:** la verificación del hub funciona y la suscripción queda verificada en D1 para ≥ 18 de 20 canales.
- **CA-S2:** al menos 30 vídeos nuevos observados en 14 días.
- **CA-S3:** el informe da p50, p90 y cobertura. Con eso se acepta, se ajusta o se rechaza ADR-006.
- **CA-S4:** un POST sin firma válida se rechaza con 403 y no se registra.

## 6. Limitaciones conocidas
- `published` en Atom es la fecha que declara YouTube. En estrenos y directos puede ser la de creación, no la de emisión. Se registran ambos campos y se analizan aparte.
- Plan gratis: si se supera el límite de CPU, alguna ejecución del cron puede fallar. Queda registrado en `runs`.
