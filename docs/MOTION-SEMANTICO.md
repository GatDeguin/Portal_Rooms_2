# Motion semántico en Portal Room V.05

La interfaz conserva la identidad de las salas al filtrar, muestra los cambios de contexto sin esperar a una animación y devuelve el foco al control que abrió un panel. La victoria añade un trazo breve sobre la marca existente. El contenido y los controles describen siempre el estado funcional final, incluso si el movimiento se cancela.

## Contexto y alcance observado

Esta integración parte de `main` en `5358645e1c755861acc02992e16266bd4463a7a5`: versión 5.0.0, 62 salas y doce capítulos. La aplicación activa carga `index.html`, `src/`, `styles/` y `assets/`; usa módulos ES, WebGL procedural, un worker de render y diálogos HTML nativos. Conserva `SaveStore` v2, controles manuales y el modo opcional de manos. No hay dependencia nueva de ejecución, fuentes nuevas ni peticiones externas del sistema de motion.

La copia local donde se diseñó inicialmente el movimiento tenía otro catálogo y otros recorridos. Se integraron sólo los patrones que corresponden a V.05. No se añadieron archivo narrativo, importación de partidas, panel de pistas, traducciones ni pantallas ajenas a esta versión. Tampoco se publicaron los binarios de aquella copia como una entrega V.05.

Hechos observados: `LevelTransition` ya representa entrada y salida del cubo; la entrada dura 900 ms y la salida 1050 ms, con pausa/reanudación y alternativa inmediata al reducir movimiento o desactivar efectos. El intento se guarda antes de la entrada; la victoria se guarda antes de la salida. Se mantiene ese contrato existente, incluida su separación entre reloj de presentación y tiempo de simulación. Las cinco regresiones de ese recorrido pasaron con WebGL y worker reales.

Inferencia de diseño: inspeccionar varias salas y alternar ajustes son acciones frecuentes que necesitan respuesta breve y referencias estables. La interfaz oscura y los planos del selector justifican un movimiento discreto, sin rebote ni secuencias de introducción para las colecciones. No se midieron frecuencias de uso de usuarios reales.

Supuesto de entrega: se integra el código web actual y su documentación; no se crea una nueva versión Windows, release ni despliegue de GitHub Pages. El modo de manos conserva su descarga bajo demanda de MediaPipe y sus recursos anteriores.

## Mapa semántico

| Intención → acción | Cambio real | Respuesta → reposo → siguiente acción |
| --- | --- | --- |
| Ajustar → abrir Ajustes | Cambia el panel activo; la simulación se pausa | Llega el diálogo nativo; los controles ya funcionan → panel estable → cambiar un ajuste o volver |
| Confirmar una acción → abrir confirmación | Se abre un único diálogo de confirmación | Llega el panel → decisión disponible → cancelar devuelve el foco a su invocador visible |
| Comparar → filtrar capítulo | Cambian las salas visibles y, si corresponde, la preselección | Las tarjetas conservadas cercanas se trasladan → colección final sin transformaciones → inspeccionar o entrar |
| Inspeccionar → elegir tarjeta | Cambia la sala preseleccionada, el plano y la disponibilidad de entrada | Selección, textos y bloqueo inmediatos; aparece el plano actualizado → detalle estable → elegir otra sala o entrar |
| Ajustar → cambiar pestaña | Cambia el panel de ajustes visible | Panel anterior oculto inmediatamente; llegada por opacidad del nuevo → una pestaña accesible activa → editar |
| Completar → resolver el objetivo real | `store.complete` guarda resultado y desbloqueo | Se conserva la salida 3D existente; después aparece la victoria y se dibuja la marca → resultado guardado → siguiente sala o reintento |

Dominio: física, intentos, progreso, récords y ajustes. Interfaz: fase, diálogo, pestaña, filtro y selección. Presentación: rectángulos transitorios y objetos `Animation` de `UIMotion`. La presentación no escribe datos del dominio. Cancelar una animación de UI no cambia el resultado, la selección ni el guardado.

Invariantes comprobadas: una sala conserva el mismo botón al filtrar; sólo una tarjeta representa la selección; sólo un diálogo está abierto; los controles nuevos se pueden pulsar inmediatamente; el foco regresa a un invocador visible o al filtro activo si desapareció su tarjeta; no quedan transforms ni promesas de cancelación rechazadas sin manejar. El escenario y sus controles de juego permanecen quietos durante el movimiento de menús.

## Evaluación de las 16 técnicas

Cada decisión se refiere a esta integración de UI; los efectos previos del escenario se conservan.

| Técnica | Decisión y ubicación | Necesidad y beneficio | Riesgo principal | Alternativa reducida | Verificación |
| --- | --- | --- | --- | --- | --- |
| Morph | Omitir; no corresponde | Los paneles y las tarjetas tienen roles diferentes; no hay una transformación de forma necesaria | Sugerir identidad entre entidades distintas | Estado final directo | Revisión de recorridos y roles |
| Stagger | Omitir; selector de 62 salas | La agrupación ya se expresa mediante capítulos y posición | Espera acumulada y controles inicialmente ocultos | Colección completa inmediata | Filtros rápidos y hit testing de tarjetas nuevas |
| Spring | Omitir; controles y cifras | Las acciones repetidas necesitan asentamiento breve y exacto | Rebote que altere objetivos o sugiera datos inexistentes | Actualización directa | Selección y récords estables |
| Easing | Aplicar; llegada y controles | La desaceleración breve comunica que un contexto se asienta | Cola lenta o curvas superpuestas | Sin interpolación | Tiempos conocidos 0/90/180 ms y cancelación |
| Crossfade | Adaptar; pestaña y plano | Explica sustitución en el mismo contexto; sólo aparece el contenido nuevo, sin doble lectura | Dos estados interactivos o pérdida de contraste | Contenido completo inmediato | Panel anterior oculto, selección sincronizada y capturas |
| Shared element | Omitir; no corresponde | El plano y la escena son representaciones diferentes; no se añade un viaje entre vistas | Clones, doble identidad interactiva y geometría falsa | Navegación existente | Un único diálogo y ninguna entidad clonada |
| Magnification | Omitir en UI; se conserva la escala 3D previa | Tarjetas y botones ya tienen tamaño y foco visibles | Colisiones o cambios del objetivo pulsable | Área activa estable | Puntero/tacto simulado y manos sintéticas |
| Blur | Adaptar; backdrop del diálogo | Separa el panel del escenario mediante oscurecimiento estático; se retira el blur de pantalla completa | Pintura extensa y contexto ilegible | Mismo fondo oscuro | Comparación antes/después; HUD local conservado |
| Mask | Omitir; no corresponde | No hay revelado con forma que explique una tarea | Información oculta o dependencia de recursos | Contenido completo | Inspección del resultado sin efectos |
| Variable font | Omitir; tipografía del sistema | No hay fuente variable autorizada ni ejes verificados en esta entrega | Cambios de ancho y lectura inestable | Tipografía estática existente | Sin recursos tipográficos añadidos |
| Layout animation | Aplicar; filtro del selector | Conserva la relación espacial de la misma sala cuando cambia la colección | Solapamiento, deformación o geometría obsoleta | Layout final inmediato | Identidad, reversión, scroll, resize y controles nuevos |
| Clip path | Omitir; no corresponde | El diálogo nativo ya delimita el cambio de región | Recortar foco o controles durante la llegada | Panel completo | Foco y cierre dentro del viewport |
| Path morph | Omitir; planos distintos | Geometrías de salas distintas no representan la misma entidad | Inventar correspondencias o posiciones intermedias | Sustitución del plano | Plano derivado de la sala seleccionada |
| Stroke draw | Aplicar; marca SVG de victoria existente | Refuerza una resolución ya guardada, sin representar una operación pendiente | Confundir el trazo con avance del negocio | Check completo | Resultado persistido antes del trazo; reducido en sesión |
| Perspective | Adaptar; conservar escena 3D existente | La profundidad ya explica el juego y la posición del cubo | Movimiento vestibular o desalineación con manos | Política reducida existente; menús planos | Regresiones WebGL/worker y popover de manos |
| Particles | Omitir; no corresponde | La confirmación y los materiales tienen feedback suficiente | Sobrepintado, bucles persistentes y distracción | Resultado textual y marca estática | Reposo sin animaciones de UI ni rAF de menús sin manos |

Justificaciones concretas: al filtrar un capítulo, el traslado ayuda a reconocer las mismas salas y evita interpretar una reorganización como reemplazo de entidades, sin impedir inspeccionarlas. Al cambiar de pestaña o sala preseleccionada, la llegada del contenido ayuda a reconocer el nuevo contexto y evita doble lectura, sin retrasar la edición o la entrada. Al mostrar victoria, el trazo confirma una resolución guardada y evita confundirla con una operación pendiente, sin retrasar la siguiente acción.

## Gramática y contratos

Tokens en `styles/game.css`: respuesta 100 ms; reemplazo 140 ms; contexto 180 ms; continuidad 220 ms; confirmación 240 ms; llegada `cubic-bezier(.2,.8,.2,1)`; control `cubic-bezier(.2,0,.2,1)`; desplazamiento 6 px; recorrido máximo 280 px; opacidad inicial .72. La UI no usa stagger, resorte, blur animado, profundidad adicional ni partículas: no se crean tokens para técnicas descartadas. El reloj y los parámetros de las transiciones 3D existentes siguen en `level-transition.js`.

Condición común: elemento conectado, visible, `Element.animate` disponible, efectos activados, preferencia de movimiento normal y documento visible. Si falta una condición, queda el DOM final inmediato. Todos los controles y la semántica accesible cambian sin esperar a `finished`.

| Contrato | Geometría, tiempo y resultado | Interrupción, foco y adaptación | Propietario y evidencia |
| --- | --- | --- | --- |
| Llegada de diálogo | Opacidad .72→1 y translateY 6→0; 180 ms; diálogo nativo final | Navegar cierra el anterior y cancela su presentación. Volver restaura el invocador y permite scroll para hacerlo visible. Teclado, tacto y manos usan los controles reales. Reducido/sin WAAPI: apertura directa | `UI.dialog` / `UIMotion`; sólo una instancia activa por propiedad. Reversión a 0, 90 y 175 ms; veinte ciclos |
| Cambio de pestaña | Sólo opacity del panel nuevo, 140 ms; anterior hidden inmediato | Última pestaña válida gana; no se anima al repetir la misma. Flechas actualizan foco y aria-selected. Reducido: cambio directo | `UI.settingsTab`; cancela panel anterior y sus descendientes. Cambio rápido y media query en sesión |
| Preselección de sala | Sólo opacity del SVG nuevo, 140 ms; etiquetas, selección y bloqueo inmediatos | Se reemplaza la presentación anterior desde su opacidad actual; sin capa vieja interactiva. Clave sala/desbloqueo/récord evita repetir sin cambio. Reducido: plano completo | `UI.previewRoom`; pruebas de sala bloqueada, selección única y destino final |
| Filtro de capítulo | FLIP con translate, sin escala; 220 ms; lecturas antes y después agrupadas; sólo nodos conservados visibles, tamaño igual ±1 px y recorrido ≤280 px | Repetir mide la posición visual actual y reemplaza la transición. Expandir la colección asienta directamente para no cubrir tarjetas nuevas. Scroll/resize cancela. Si desaparece el foco, pasa al filtro activo. Reducido: layout directo | `UI.levelsGrid`; botones persistentes por índice del catálogo. Identidad, hit testing, reversión y transforms finales |
| Marca de victoria | Path existente con `pathLength=1`, dashoffset 1→0; 240 ms; check completo final | El resultado se guardó antes del diálogo. Navegar, reducir movimiento o desactivar efectos cancela dejando check completo; el SVG es aria-hidden y el resultado tiene texto | `UI.dialog` / `UIMotion`; prueba con cubo colocado en objetivo real y operación de guardado real |

Un solo `Map` administra animaciones, sin temporizadores, clones, observadores ni bucles propios. `finished` maneja `AbortError`; una promesa vieja no puede limpiar su reemplazo. `fill:none` y cancelación eliminan valores transitorios. CSS conserva feedback de botones sin escribir su `transform`, propiedad que pertenece a FLIP. El resaltado `hand-target` pertenece a `HandMenu` y sobrevive a la actualización de tarjetas.

La política CSS y JavaScript responde a movimiento reducido durante la sesión. `effects=false`, resize, scroll del diálogo, navegación, documento oculto y pagehide limpian la presentación. Una preferencia no borra progreso ni cancela operaciones reales. No se depende de animationend ni de una demora fija para completar la UI.

## Evidencia y límites

Resultados y hashes del código: [summary.json](motion-evidence/summary.json). Entorno: Windows 10 x64, Intel i7-9700K, Node 24.20.0, Playwright 1.62.1, Chrome 154.0.8037.95 y Edge 154.0.4258.53. Viewports de 1280×900 y 390×844; entrada táctil emulada. Se ejecutaron 802 pruebas unitarias, comprobación estática de 40 módulos y 158 IDs y, tras el ajuste final de altura, las 27 comprobaciones específicas de contratos de materiales/presentación.

- [21 contratos en Chrome](motion-evidence/contracts-chrome.json) y [21 en Edge](motion-evidence/contracts-edge.json): normal, reducido, efectos desactivados, WAAPI ausente, retorno de foco, selección, bloqueo, interrupción en tres tiempos, resize, scroll, visibilidad, veinte ciclos, texto largo y CSS zoom 125 %. Sin errores de página ni rechazos tardíos.
- [23 comprobaciones de manos con movimiento normal](motion-evidence/hand-menu-normal.json): controles reales, cámara e inferencia sintéticas y WebGL simulado. No certifican una webcam física.
- [5 regresiones de transiciones 3D](motion-evidence/existing-level-transitions.json): WebGL y worker reales, reloj de presentación controlado y fixture explícito de resolución. Cubren pausa/reanudación, resultado guardado, respuesta tardía de worker, próxima sala y reducido.
- [Capturas temporales](motion-evidence/visual-report.json) con WebGL real mediante SwiftShader: diálogo [0 ms](motion-evidence/dialog-start.png), [90 ms](motion-evidence/dialog-mid.png), [180 ms](motion-evidence/dialog-final.png); [filtro 110 ms](motion-evidence/filter-mid.png); [móvil](motion-evidence/selector-mobile.png); victoria [120 ms](motion-evidence/victory-mid.png) y [240 ms](motion-evidence/victory-final.png). Se inspeccionaron realmente: sin deformación tipográfica, controles duplicados o recorte accidental de foco en esas capturas. Sin peticiones externas ni errores en este recorrido.

Se corrigieron dos regresiones reproducidas: pérdida del resaltado de manos al reutilizar una tarjeta y cierre fuera del viewport con texto largo/zoom. La segunda usa `max-height` relativo al área disponible del diálogo, en lugar de multiplicar una altura `dvh` bajo CSS zoom. Ambas tienen prueba de regresión.

Rendimiento: veinte alternancias Controles/Imagen a intervalos de 35 ms, escena WebGL pausada, todas las animaciones asentadas. La referencia reproduce app/UI/CSS del commit base mediante rutas de prueba; los demás módulos son los mismos. Objetivo local: acción p95 inferior a 4 ms, cero tareas largas observadas durante la secuencia y cero animaciones al reposar.

| Medida | Referencia V.05 | Después | Repetición después |
| --- | ---: | ---: | ---: |
| Intervalo mediano entre frames | 33.3 ms | 16.7 ms | 16.7 ms |
| Intervalo p95 | 50.0 ms | 33.2 ms | 16.8 ms |
| Acción síncrona p95 | 0.2 ms | 0.3 ms | 0.3 ms |
| Tareas largas en secuencia | 0 | 0 | 0 |
| Animaciones activas al reposar | 0 | 0 | 0 |

Datos completos: [antes](motion-evidence/performance-before.json), [después](motion-evidence/performance-after.json), [repetición](motion-evidence/performance-after-repeat.json). Es una observación local con renderer de software y muestra breve; no certifica 60 FPS en juego, rendimiento de GPU física ni memoria. Los veinte ciclos dejaron cero animaciones de UI y rAF pendientes sin manos activadas, con caché acotada a 62 botones. Con manos activadas, el bucle existente sigue siendo necesario para procesar gestos.

El cambio de runtime suma 6079 bytes sin comprimir en los archivos afectados y un módulo; cero dependencias de ejecución nuevas. La evidencia gráfica es documentación, no un recurso cargado por el juego. Permanecen sin verificar Gecko/WebKit, lector de pantalla, zoom de texto nativo, webcam/tacto físicos, gamepad y sensores en esta integración. No se declara una auditoría WCAG completa.

## Ejecutar y revisar

```sh
python3 -m http.server 8080
# En otra terminal, con Node 22+ y Playwright disponible:
npm test
npm run check
npm run test:motion
npm run test:motion-visual
node scripts/measure-motion.mjs after
```

Los tests de motion usan `http://127.0.0.1:8080` por defecto; `PORTAL_TEST_URL` permite otro servidor. `PLAYWRIGHT_MODULE` acepta el módulo instalado de Playwright, `PORTAL_PLAYWRIGHT` su `index.mjs` y `CHROMIUM_PATH`/`CHROME_PATH` el ejecutable. Son herramientas de prueba externas, como en las suites de navegador existentes. Las pruebas de UI declaran su stub de WebGL; las visuales usan SwiftShader.

Para comprobar gestos normales sobre HTTP: definir `PORTAL_TEST_URL`, `HAND_MENU_MOTION_MODE=no-preference` y ejecutar `python3 tests/hand-menu-browser.py`. En Windows puede ser necesario `PYTHONUTF8=1` para las herramientas Python. El modo offline previo de esa prueba usa import maps de data URLs y no resuelve los recursos relativos de `hand-renderer.js`; esta verificación utiliza HTTP.

Archivos de ejecución modificados: `src/ui.js`, `src/app.js`, `styles/game.css` y nuevo `src/motion.js`. Se añaden pruebas de motion, helper de navegador, medición, documentación y sus evidencias. `package.json` agrega comandos de prueba. Los hashes de UI/app/CSS en `tests/material-contract.test.js` se actualizan explícitamente; se conservan los hashes de física, render, entrada, guardado, catálogo y audio. Las pruebas de manos aceptan servidor HTTP y selección de preferencia de movimiento.
