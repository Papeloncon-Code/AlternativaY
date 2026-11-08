# Tareas 017 · Auditoría de paridad de interfaz

## A. Navegación global
- [ ] A1 Capturar referencia y TodoTube: topbar desktop, tablet y mobile.
- [ ] A2 Medir menú lateral expandido y rail colapsado.
- [x] A3 Barra inferior móvil: Inicio, Shorts, Crear y Tú; safe area comprobada por Playwright.
- [x] A7 Pestañas móviles Inicio/Subs bajo la topbar en los feeds Home y Suscripciones.
- [x] A8 Auto-ocultación inicial de tabs y reaparición al desplazarse hacia arriba; validar con E2E y capturas responsive.
- [ ] A4 Auditar menú de cuenta, aspecto, datos y atajos.
- [ ] A5 Eliminar rutas muertas, enlaces a Puente y labels heredados.
- [ ] A6 Probar foco, teclado, Escape y click fuera.

## B. Inicio/feed
- [ ] B1 Comparar grids 1–6 columnas y breakpoints.
- [ ] B2 Comparar miniaturas 16:9, radios, título, avatar y metadatos.
- [ ] B3 Comparar acciones ⋮, hover y menú contextual.
- [ ] B4 Comparar chips, filtros, scroll infinito y loading/empty/error.
- [x] B5 Comparar tabs superiores Inicio/Subs y estados activos en móvil.
- [ ] B6 Comparar shelf de Shorts y navegación horizontal.

## C. Shorts
- [ ] C1 Comparar geometría vertical desktop/mobile.
- [ ] C2 Comparar captions, avatar, metadatos y acciones.
- [ ] C3 Probar flechas, wheel, touch y bloqueo de doble salto.
- [ ] C4 Alinear navegación móvil con bottom nav sin solapamiento.
- [ ] C5 Mostrar solo controles operativos para la fuente disponible.

## D. Watch y minirreproductor
- [ ] D1 Medir player frame y ancho del contenido.
- [ ] D2 Alinear título, canal, acciones y descripción.
- [ ] D3 Alinear recomendaciones y separación de columnas.
- [ ] D4 Comparar modo cine y fullscreen.
- [ ] D5 Probar miniplayer desktop/mobile: posición, tamaño, retorno y cierre.
- [ ] D6 Diferenciar origen externo de medios propios/licenciados.

## E. Búsqueda, canal y suscripciones
- [ ] E1 Sugerencias y recientes.
- [ ] E2 Resultados, filtros y estados.
- [ ] E3 Cabecera/tabs de canal.
- [x] E4 Separar el feed de Suscripciones de la gestión de canales: `/suscripciones` muestra publicaciones; `/suscripciones/gestionar` conserva altas, bajas, avisos y grupos.
- [ ] E5 Ajustar el feed de Suscripciones con estados vacío/error, filtros de canal/grupo, Shorts e infinite scroll en desktop y móvil.

## F. Biblioteca y ajustes
- [ ] F1 Historial, Ver más tarde, Me gusta y listas.
- [ ] F2 Biblioteca de medios propios y fallos del Gateway.
- [ ] F3 Tema, preferencias, privacidad y datos locales.
- [ ] F4 Teclas, lectores de pantalla y contraste.

## G. Cierre
- [ ] G1 Playwright por todos los viewports.
- [ ] G2 Build y TypeScript sin errores.
- [ ] G3 Screenshots comparables y diferencias resueltas o justificadas.
- [ ] G4 Producción desplegada y smoke test verificado.
