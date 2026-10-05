# Renderer HDR para Portal Room V.05

Implementación sobre `da3384b`: 62 salas, mismo juego y mismos contratos de física, input, guardado, layouts y cámara. Rama `feat/hdr-browser-renderer`. Se priorizan iluminación vinculada a las luminarias, escala del material, bordes estables y degradación utilizable. No se acredita equivalencia visual con una producción AAA ni 60 FPS universales.

## Diagnóstico y decisiones

**Observado:** el renderer original dibuja un SDF procedural con un triángulo, GLSL ES 1.00, PBR, normales de relieve, AO, sombras, reflejos por ray marching y niebla localizada. High/Cinematic ya separan superficie y sombreado. El compilador del driver es un cuello de botella importante. Había salida directa de color, sin targets HDR ni acumulación de muestras.

**Inferencia de diseño:** unas salas interiores con un cubo jugable se benefician más de continuidad de materiales, luminarias coherentes y antialiasing que de streaming de mundo, ciudades, vegetación o multitudes. No se introducen esos contenidos para justificar técnicas. El detalle de madera demasiado grueso y la luz puntual desligada de la tira visible se corrigieron tras inspección de capturas.

**Límite de evidencia:** todas las medidas GPU proceden de un único PC Windows 10 / NVIDIA RTX 3060 Ti / ANGLE D3D11. Chrome 154 se usó para perfiles. Las pruebas de interfaz con un contexto simulado se identifican separadamente. Un viewport de teléfono no sustituye un teléfono físico.

La selección previa y los contratos están en [PHOTOREAL-PLAN.md](PHOTOREAL-PLAN.md). El sistema de motion de la base, incluida la matriz de las 16 técnicas, permanece documentado en [MOTION-SEMANTICO.md](MOTION-SEMANTICO.md).

| Necesidad | Decisión | Resultado y coste |
|---|---|---|
| WebGPU principal | Aplicar | Render SDF real en WGSL; sin WebGL dentro de esta ruta. Shaders preconvertidos locales; preparación aún costosa. |
| WebGL2 fallback | Aplicar | GLSL ES 3.00 y HDR cuando el framebuffer float es válido. WebGL1 conserva salida directa. |
| Color lineal HDR | Aplicar | Sombreado en RGBA16F; ACES y gamma al presentar, una sola vez. Es precisión interna HDR, no una promesa de pantalla HDR. |
| Reconstrucción temporal durante juego | Omitir por ahora | No hay vectores por objeto que permitan reproyección fiable. No se mezcla historia de gameplay; se evita introducir ghosting por una TAA incompleta. |
| Bordes en movimiento | Adaptar | Resolve espacial inspirado en FXAA, con umbral de contraste y recorrido acotado a cuatro píxeles. Puede suavizar detalle fino. |
| Foto en reposo | Aplicar | 32 muestras Halton, media en HDR, sin modificar dominio ni esperar para reanudar. |
| Madera y luminarias | Adaptar | Tablas de 0,22 × 1,65 m en coordenadas del juego; veta filtrada. Dos muestras BRDF en la tira izquierda y emisores representativos en las otras luces; visibilidad aproximada. No son mediciones fotométricas ni integración completa de luz de área. |
| Contacto, PBR, reflejos, atmósfera | Conservar | Se mantiene el sistema existente; no se reetiqueta como GI completa, hardware ray tracing o path tracing. |
| Compute/culling/instancing/LOD | No corresponde al cambio | Un triángulo SDF no necesita una infraestructura de miles de meshes. |
| Outdoor/streaming/vegetación/personajes | No corresponde | No pertenecen al producto observado. |
| Física/audio/cámara/input | Preservar | Archivos originales fijados por hashes y rutas de regresión. |

## Pipeline y propiedad del estado

```text
Estado real del juego → snapshot de presentación → Worker gráfico
  ├─ WebGPU: WGSL SDF → color rgba16float → resolve → bitmap
  └─ WebGL2: GLSL300 SDF → RGBA16F válido → resolve → bitmap
       └─ Sin float / WebGL1: sombreado y presentación directa
bitmap → canvas visible + guías existentes de manos y tela
```

WebGPU se intenta dentro de una superficie candidata. Si falla el adaptador, shader, pipeline o primera imagen, se destruye ese candidato y se prepara WebGL en una superficie nueva. Sólo una primera imagen válida publica `ready`. La pérdida de un dispositivo provisional permite completar ese fallback. Después de publicar, una pérdida activa la recuperación/error existente; no hay migración automática invisible de toda la partida entre motores.

Los uniforms originales se extraen a `scene-uniforms.js`; ambos backends reciben exactamente el mismo contrato. Cinco fixtures comparan el packing anterior para salas simples, obstáculos, plataformas, portal y showcase. La geometría y la función de cámara original siguen fijadas por sus pruebas.

La cola del Worker posee los recursos de dibujo y serializa cada operación, incluido el buffer de timestamps. La cancelación se procesa inmediatamente fuera de la cola y aumenta una versión. Un dibujo antiguo puede terminar físicamente, pero no confirmar una muestra de una foto nueva. La inspección también encontró que el botón de Foto necesitaba espacio respecto del briefing en móvil: una prueba reprodujo una separación de 0 px; el margen local y el grid adaptable conservaron el texto y el contorno de foco. La inspección encontró texto de preparación residual al cancelar por resize: la nueva regresión falló antes de corregirlo, luego pasó junto con el foco durante captura y su devolución al terminar/cancelar. Los bitmaps descartados se cierran; la retirada de sesión termina el Worker. La presentación nunca concluye una operación del juego ni modifica el guardado.

## Recorrido Foto y contratos

Intención de guardar una imagen → pausar → pulsar Guardar foto → congelar la última presentación válida → acumular 32 muestras → descargar PNG → seguir en pausa o reanudar.

- Entrada válida: partida pausada, sesión Worker HDR disponible y presentación válida. La acción no comienza una nueva partida ni cambia calidad, cámara o física.
- Geometría: jitter subpíxel Halton bases 2/3 dentro de ±0,5 píxel, misma escena y mismo anclaje de cámara. La muestra `n` pesa `1/n`; no hay motion blur ni mezcla entre entidades de frames distintos.
- Tiempo: depende de 32 dibujos reales; el texto anuncia 25/50/75/100 %. No se ofrece una demora fija ficticia ni un porcentaje de carga del driver.
- Interrupciones: Cancelar, Escape/reanudar, navegación, resize, cambio de calidad, pestaña oculta y pagehide abortan la solicitud y resetean la acumulación. Una intención nueva invalida la anterior. Se puede repetir inmediatamente.
- Accesibilidad: botones nativos, nombres visibles, estado `aria-live="polite"`, siguiente acción disponible. No hay zoom, giro ni cámara nueva; el packet conserva la preferencia reducida vigente. El resultado esencial también es textual.
- Ciclo de vida: un AbortController por petición, un watchdog por trabajo pendiente, limpieza de listeners/timers y revocación del object URL. Resize elimina los targets anteriores antes de preparar los nuevos.
- Alcance del archivo: se exporta el canvas de la sala. No incluye interfaz DOM, manos ni las telas dibujadas en su canvas independiente; la pausa lo informa. Usa la resolución de la calidad seleccionada, no una resolución de exportación inventada.
- Degradación: sin targets HDR o sin la ruta Worker, el juego sigue con su renderer compatible y el botón Foto queda deshabilitado con explicación. No se afirma acumulación HDR en WebGL1.

## Presupuesto y perfiles

Se conservan los valores de settings `low`, `medium`, `high`, `cinematic` y `auto`. Los nombres visibles son Rendimiento, Equilibrada, Calidad y Ultra. Foto es una modalidad de acumulación sobre el perfil seleccionado, no un quinto perfil de juego con un presupuesto ficticio.

| Perfil | Límite de píxeles / DPR | Marcha primaria | Uso |
|---|---|---|---|
| Rendimiento | 360.000 / 1 | 88 pasos | Entrada y equipos con menos margen |
| Equilibrada | 760.000 / 1,4 | 112 pasos | Mayor resolución con coste moderado |
| Calidad | 1.500.000 / 1,8 | 136 pasos | Superficie + sombreado, relieve/reflejos más detallados |
| Ultra | 2.200.000 / 2 | 176 pasos | Coste manual mayor; no se promete 60 Hz |
| Auto | Adaptación existente | Según tier | Medición y promoción candidata, conserva la preferencia guardada |

El objetivo de 16,7 ms corresponde a un presupuesto de 60 Hz, no al resultado garantizado del juego completo. En WebGPU se usan timestamps si la feature existe; en su ausencia, se espera la cola y se registra coste wall. Los snapshots de adaptación conservan la política original. Los targets WebGPU ocupan aproximadamente 28 bytes por píxel: color actual + dos historias RGBA16F + superficie RGBA8. A 1280 × 720 son 25.804.800 bytes; es un cálculo de esos targets, **no memoria GPU medida ni el total del proceso**. Las historias sólo se combinan para foto.

## Evidencia ejecutada

Datos definitivos en [render-final.json](photoreal-evidence/render-final.json). Chrome, viewport 1280 × 720, escenas 1/7/15/22, portal en seq=3. Cada escena: 15 dibujos de calentamiento y 60 medidos. Se espera cada dibujo; se mide el renderer, no toda la latencia de input ni FPS sostenidos. Sin flags que habiliten WebGPU inseguro. La [sonda de capacidades](photoreal-evidence/capabilities.json) fue repetida sin esos flags; informa adaptador real y features, no requisitos universales.

| WebGPU | Buffer | Preparación | GPU p95 escenas 1 / 7 / 15 / 22 |
|---|---|---|---|
| Rendimiento | 800 × 450 | 25,06 s | 3,21 / 3,01 / 2,95 / 3,60 ms |
| Equilibrada | 1162 × 653 | 26,18 s | 7,86 / 7,67 / 7,47 / 9,37 ms |
| Calidad | 1280 × 720 | 49,18 s | 14,42 / 15,73 / 15,40 / 18,94 ms |
| Ultra | 1280 × 720 | 56,28 s | 19,07 / 20,12 / 19,60 / 24,44 ms |

El JSON incluye media, p95, p99 y peor muestra de coste GPU y wall. Ultra supera el presupuesto de 60 Hz, especialmente con portal. Calidad también lo supera en portal. La preparación sigue siendo lenta incluso en WebGPU; WGSL offline elimina la conversión en la carga, no la compilación del driver.

La referencia anterior está en [baseline.json](photoreal-evidence/baseline.json): misma GPU, base `da3384b`, 640 × 360, sólo 20 dibujos medidos por escena. Baja preparó en 39,96 s y Media en 56,18 s. Son resoluciones y métodos de muestra distintos: no se deduce de ello un porcentaje de aceleración ni una comparación de FPS.

WebGL se mide con `gl.finish` **más readback de un píxel**, porque la entrega de comandos rápida no demuestra que la imagen terminó. [El informe de fallback](photoreal-evidence/gl/render-final.json) identifica los tiempos wall y el límite de preparación ampliado usado para diagnóstico. Una prueba inicial de GL2 superó 60 s y fue rechazada correctamente; una repetición preparó Baja en 42,37 s y Calidad en 174,56 s. El límite de producción sigue siendo 60/90/180 s según tier. Si se excede al cambiar calidad, se conserva la anterior; no se convierte una preparación lenta en un éxito silencioso.

| Fallback Chrome | Preparación | Wall p95 escenas 1 / 7 / 15 / 22 |
|---|---|---|
| WebGL2 Rendimiento | 42,37 s | 4,50 / 3,90 / 4,00 / 4,20 ms |
| WebGL2 Calidad | 174,56 s | 19,30 / 19,90 / 19,00 / 20,40 ms |
| WebGL1 Rendimiento | 39,62 s | 4,00 / 4,00 / 4,00 / 4,20 ms |
| WebGL1 Calidad | 171,38 s | 34,70 / 33,40 / 32,60 / 38,40 ms |

GL2 también completó una foto de 32 muestras y resize portrait, sin errores GL. No se ejecutaron Medium/Ultra en GL ni todos los perfiles en Edge; no se extrapola esa cobertura.

Pruebas de CPU/mock: packing original, conversión GLSL/WGSL, hashes de shaders publicados, calidad, color, 32 muestras, versiones obsoletas, cancelación durante draw pendiente, fallback provisional, asignación HDR parcial y veinte ciclos resize/foto con limpieza. La revisión adicional confirmó pérdida durante el primer draw candidato y foto después de resize. Estas pruebas no son ejecución GPU.

Resultados finales: **819/819 pruebas** (`npm test`), generación de seis WGSL reproducible, `npm run check` (47 módulos, 161 IDs) y `verify-static.py` (56 archivos HTTP, incluidos los seis WGSL y manifest, igualdad de bytes). Se actualizan sólo las huellas de los archivos de presentación autorizadamente cambiados. Las de física, input, cámara, catálogo y guardado conservan el contrato de base.

La suite DOM de motion pasó **22/22 en Chrome y 22/22 en Edge**. Hubo timeouts intermitentes al iniciar una página de Edge en ejecuciones anteriores (20/21 y 21/22); la última repetición completa pasó. Se añadió diagnóstico y cierre del contexto fallido, sin ampliar el timeout de inicio. No se atribuye una causa que no se pudo demostrar.

El [playtest real Chrome](photoreal-evidence/journey/report.json) recorre pausa, captura, cancelación al principio/medio/final, veinte ciclos, descarga, Escape durante captura, resize y reposo sin RAF. El [mismo recorrido en Edge](photoreal-evidence/edge-journey/report.json) pasó con WebGPU y el [recorrido forzado WebGL2](photoreal-evidence/gl-journey/report.json) pasó en Chrome (arranque 42,86 s). La selección WebGL se fuerza sólo en el harness; la pérdida provisional de GPU se verifica por separado en CPU/mock. Los costes de Worker en GL pueden ser sólo entrega de comandos: no sustituyen al readback sincronizado del benchmark.

Durante un tramo corto con cámara dinámica se observaron 48 imágenes Worker, cambio real de posición y tiempo de física, y cero entradas de `longtask` en el hilo principal. Se excluye la preparación y no se extrapola a una partida sostenida. Las peticiones del recorrido fueron todas locales. Las pruebas de motion con WebGL simulado comprueban navegación/foco/reducido/ausencia de soporte; se mantienen separadas de las capturas reales.

Capturas inspeccionadas: [foto WebGPU Ultra](photoreal-evidence/webgpu-photo.png), [portal](photoreal-evidence/webgpu-cinematic-portal.png) y [portrait](photoreal-evidence/webgpu-portrait.png). Las capturas del [inicio](photoreal-evidence/journey/moving-start.png), [movimiento](photoreal-evidence/journey/moving-middle.png) y [liberación](photoreal-evidence/journey/moving-release.png) también se inspeccionaron. Las fotos finales se compararon con los previews durante el refinamiento: sin inversión vertical, clipping del cubo ni deformación de texto. La inspección de imágenes no demuestra continuidad temporal; el recorrido dinámico y las interrupciones se prueban aparte.

## Entrega y ejecución

Archivos principales: `renderer-webgpu.js`, `gpu-post.js`, `gpu-uniform-layout.js`, `gl-post.js`, `gl-formats.js`, `photo-sequence.js`, `scene-uniforms.js`; integración en `renderer.js`, `renderer-worker.js`, `renderer-client.js`, `app.js`, `shaders.js` e `index.html`. Generador en `scripts/build-webgpu.mjs`/`shader-source.mjs`, seis WGSL y manifest en `assets/shaders/`. Fixtures y suites en `tests/photoreal*`, `scene-uniforms.test.js`, `photo-journey-browser.mjs`.

Nueva dependencia **sólo de desarrollo**: `naga-wasi-cli@0.1.0` (MIT OR Apache-2.0), fijada por lockfile; WASM aproximadamente 2,2 MB. No se sirve al navegador. Los seis WGSL suman aproximadamente 1.645.044 bytes sin comprimir; se carga la variante requerida, no las seis al arrancar. Todos son locales, sin nueva petición a CDN. La conversión abre únicamente este repositorio al compilador WASI. [Naga](https://github.com/gfx-rs/wgpu/tree/trunk/naga) / [wrapper WASI](https://github.com/ihasq/naga-wasi-cli).

```sh
npm ci
npm run build:shaders    # Sólo necesario si cambia src/shaders.js
npm test
npm run check
python -m http.server 8086
```

En otra terminal, con Playwright instalado y Chrome/Edge disponible:

```powershell
$env:PORTAL_TEST_URL='http://127.0.0.1:8086'
$env:PORTAL_BACKENDS='webgpu'
npm run test:photoreal
npm run test:photo-journey
npm run test:motion
```

`PORTAL_PLAYWRIGHT` y `CHROME_PATH` permiten indicar el módulo/navegador disponibles; no se descargan navegadores automáticamente. `PORTAL_TIERS`, `PORTAL_TEST_OUT` y el override diagnóstico `PORTAL_PREPARE_TIMEOUT` acotan pruebas. Para GL usar `PORTAL_BACKENDS=webgl2,webgl1`; para verificar límites de producción, omitir el override. Abrir la aplicación, jugar, pausar y usar Guardar foto. Las opciones de calidad guardadas siguen compatibles.

## Límites pendientes

No se midieron GPU integrada, móvil físico, Safari/Firefox, pantalla HDR, VRAM, consumo energético ni proceso de navegador completo. Tampoco se acredita una auditoría normativa completa, GI de múltiples rebotes, RT por hardware, TAA con reproyección, path tracing o una equivalencia AAA. La base de ruido y el filtro espacial son aproximaciones; sólo la tira izquierda integra dos muestras y las demás luces conservan emisores representativos. No hay ajuste automático de exposición. El render de manos/telas conserva su pipeline separado y no forma parte del PNG.

Las escenas de benchmark son congeladas. El movimiento real se comprueba en Rendimiento en el recorrido browser; las calidades superiores quedan pendientes de ese playtest dinámico específico, pero queda pendiente una métrica cuantitativa de shimmer/ghosting y una auditoría de todas las 62 salas en todos los perfiles y motores. Los tiempos de compilación y el presupuesto de Ultra son límites conocidos que deben evaluarse en equipos objetivo antes de prometer calidad o carga.
