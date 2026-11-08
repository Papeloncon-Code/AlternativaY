# 11 · Triage del informe externo «Arquitectura del reproductor, paridad y marca» (2026-11-08)

| Campo | Valor |
|---|---|
| Entrada | `docs/entrada/2026-11-08/`: informe en PDF y DOCX (14 páginas, corte 2026-11-07) y paquete de la PoC del gateway (ZIP) |
| Método | Cada afirmación se contrastó con el código de la rama `sdd/investigacion-y-especificacion` a 2026-11-08. Cada recomendación se clasifica: **Aceptada**, **Adaptada**, **Hecha**, **Decisión del propietario** o **Rechazada**, con su razón. |
| Ya ejecutado del paquete | PoC del gateway (spec 008, ADR-009): [Papeloncon-Code/AlternativaY#2](https://github.com/Papeloncon-Code/AlternativaY/pull/2), resultados en `specs/008-gateway-multimedia/results.md` |

## 1. Numeración (evitar choques)
El informe propone números que ya están ocupados en el repositorio. Correspondencia adoptada:

| En el informe | Ya existe en el repo | Número asignado |
|---|---|---|
| ADR-008 modos de reproducción y fallback | ADR-008 = nombre y equipo | **ADR-010** |
| ADR-009 contrato proveedor/sesión | ADR-009 = gateway multimedia (paquete) | **ADR-011** |
| ADR-010 atribución y marca | — | **ADR-012** |
| ADR-011 funciones por build | — | **ADR-013** |
| ADR-012 observabilidad con privacidad | — | **ADR-014** |
| Spec 008 fiabilidad de reproducción | 008 = gateway (paquete) | **Spec 009** |
| Spec 009 experiencia del reproductor | 010–016 ocupados | **Spec 017** |
| Spec 010 personalización | — | **Spec 018** |
| Spec 011 paridad | Spec 007 ya es la matriz de paridad | **Spec 007** (se amplía) |

## 2. Afirmaciones del informe contrastadas con el código actual
| Afirmación | Hoy | Evidencia |
|---|---|---|
| Sin Puente, o si falla el reproductor propio, se pasa al reproductor oficial **sin avisar** | ✅ Cierto | `PlayerHost.tsx`: `own = bridge && !s.fallback`; `onFail → patch({ fallback })` |
| El reproductor oficial carga la IFrame Player API de www.youtube.com | ❌ **Ya no** | Desde 2026-11-08 usa el iframe de youtube-nocookie por postMessage (`src/player/embed.ts`), por el hallazgo de cookies de la revisión independiente |
| Los segmentos no pasan por la extensión: Shaka hace `fetch` desde la página y el Puente modifica cabeceras | ✅ Cierto | `ShakaPlayerAdapter.ts`, `rules.json` |
| En VOD el token se genera sin esperar (`void this.mint()`); en directo se espera | ✅ Cierto (hipótesis de carrera, sin probar) | `TodoTubePlayer.ts` |
| `rules.json` no declara `Access-Control-Allow-Headers` | ✅ Cierto (puede afectar a preflight con `Range`; sin probar) | `apps/bridge/rules.json` |
| Shaka sin `retryParameters` ni timeout explícitos | ✅ Cierto | `TodoTubePlayer.ts` |
| «43 pruebas», ninguna de reproducción real | 🟡 Desactualizado | Hoy son 50 en la web, más 36 en la PoC (con reproducción real del vídeo propio). La reproducción real de **YouTube** sigue sin prueba automática: no se automatiza contra YouTube; la valida el propietario con el Puente |
| El progreso ya se guarda (base para «Continuar viendo») | ✅ Cierto | `store.ts` → `progress` |

## 3. Recomendaciones y decisión
### 3.1 Reproducción (P0 del informe → Spec 009)
| ID | Recomendación | Decisión | Razón |
|---|---|---|---|
| PB-01 | Inventario de modos y rutas | **Aceptada** | Imprescindible para cualquier decisión de fallback |
| PB-02 | En `full`, no pasar al reproductor oficial sin avisar | **Decisión del propietario** (ADR-010) | Choca con la experiencia actual: hoy, sin Puente, el propietario no vería nada si se quita el paso automático. Ver §4 |
| PB-03 | Diagnóstico estructurado sin datos sensibles | **Aceptada**, solo en el navegador | Constitución: nada de analítica en el servidor (ADR-014) |
| PB-04 | Matriz CORS/DNR por navegador | **Aceptada** | Incluye añadir `Access-Control-Allow-Headers: Range` si la prueba lo confirma |
| PB-05 | Timeouts y reintentos medidos | **Aceptada** | Primero medir (FreeTube cambió sus constantes tras medir) |
| PB-06 | Ciclo del token (mint tardío) | **Aceptada** | Instrumentar sin registrar el token |
| PB-07 | Recuperar sesión sin perder posición (±2 s) | **Aceptada** | |
| PB-08 | Permisos del Puente para el dominio final | **Aceptada** | Bloquea el lanzamiento en un dominio propio |
| PB-09 | Prueba real de reproducción | **Adaptada** | Automática con vídeo propio (hecha en la PoC). Con YouTube: lista de comprobación manual del propietario, sin automatizar contra YouTube |

### 3.2 Experiencia y personalización (P1 → Specs 017 y 018)
| ID | Recomendación | Decisión |
|---|---|---|
| UX-01 | Interfaz propia del reproductor (estados, calidad, subtítulos, velocidad) | **Aceptada** |
| UX-02 | Modos «propio» y «oficial» visibles y elegibles | **Aceptada** (depende de ADR-010) |
| UX-03 | Continuar viendo | **Aceptada: primera en construir** (datos ya existen) |
| UX-04 | Tu Mix sin aprendizaje automático, con reglas a la vista | **Aceptada** |
| UX-05 | Acciones rápidas en la tarjeta | **Hecha en parte** (⋮ completo); falta cola de reproducción |
| UX-06 | Temas (OLED, carbón) y densidad | **Aceptada** |
| UX-07 | Subtítulos configurables | **Aceptada** (con el Puente) |
| UX-08 | Marcadores y notas por segundo | **Aceptada** |
| UX-09 | Ayuda de atajos con «?» | **Hecha en parte** (en el menú de cuenta); falta la tecla «?» |

### 3.3 Paridad (P2 → Spec 007)
| ID | Recomendación | Estado |
|---|---|---|
| PAR-01 | Capítulos (marcas de tiempo de la descripción) | **Aceptada**: ya hay descripciones sin Puente (RSS) |
| PAR-02 | Duración en tarjetas | 🔌 Solo con Puente (doc 10) |
| PAR-03 | Pestañas de canal y orden | 🟡 Vídeos/Shorts hechas; el resto con Puente |
| PAR-04 | EN VIVO | 🔌 Solo con Puente (comprobado: `/live` no se distingue por el código de estado) |
| PAR-05 | Vista previa al pasar el ratón | Aplazada: medir coste antes |
| PAR-06 | Comentarios | 🔌 Spec propia antes de construir |
| PAR-07 | Búsqueda por voz | **Aceptada** (Web Speech API) |

### 3.4 Riesgos que el informe señala y ya estaban registrados
- SponsorBlock y DeArrow (CC BY-NC-SA 4.0, uso no comercial): coincide con doc 07 §10. Pendiente de ADR-004 (licencia y modelo).
- Cambios de YouTube: aislar el proveedor (ADR-011), pruebas canario y poder desactivar funciones.
- Copiar código de alternativas: solo con licencia revisada (ya es norma desde la sesión de BotGuard).

## 4. Contradicciones con lo pedido por el propietario (requieren su decisión)
1. **«Copia exacta, píxel a píxel» frente al informe (§9.1).** El informe no recomienda copiar cada píxel: imitar la imagen hasta confundir al usuario aumenta el riesgo de marca. Opciones:
   - **(a) Recomendada:** copiar **estructura, medidas, comportamiento y funciones** al detalle (rejilla, tamaños, espaciados, menús, atajos, estados), manteniendo **elementos de marca propios** (logo, nombre, color de acento, iconos dibujados por nosotros).
   - **(b)** Copia visual total. Más riesgo de reclamación por imagen comercial (*trade dress*) [I: sin dictamen legal].
2. **Paso automático al reproductor oficial (PB-02).** El informe pide quitarlo en `full`, y el propietario pidió que no se vea la marca de YouTube. Pero sin Puente (situación actual del propietario y de cualquier visitante) quitarlo deja el vídeo en blanco. Opciones:
   - **(a)** Mantener el paso automático, pero **avisando** («Reproductor de YouTube: instala el Puente para ver sin anuncios»).
   - **(b)** Sin paso automático: un botón «Ver con el reproductor de YouTube» en cada vídeo.
   - **(c)** Que lo elija cada usuario en Ajustes (por defecto, a).

## 5. Orden de trabajo propuesto (SDD)
1. ADR-010 (modos y fallback) tras la decisión del propietario sobre §4.2.
2. Spec 018: «Continuar viendo» y «Tu Mix» (sin dependencias; valor inmediato).
3. Spec 009: instrumentación (PB-03), matriz CORS (PB-04), timeouts y token (PB-05/06), sin cambiar el comportamiento visible.
4. Spec 017: interfaz del reproductor y modos visibles.
5. Spec 007: capítulos y búsqueda por voz.
