# Portal Room — Dominio de la gravedad, V.04

**42 salas: el circuito original de 22 más una expansión de 20.** Un cubo rojo, una habitación y control de gravedad mediante teclado, arrastre, stick o inclinación. Render procedural WebGL 1 con perfiles Baja, Media, Alta y Cinemática; Automática adapta solo los tres primeros.

La aplicación activa usa `index.html`, `src/`, `styles/` y `assets/`. Los archivos homónimos de la raíz pertenecen a revisiones anteriores y no se deben mezclar con este catálogo.

## Ejecutar

```sh
python3 -m http.server 8080
```

Abrí `http://localhost:8080`. El juego base no requiere `npm install`, motor externo ni compilación. Publicá `index.html`, `src/`, `styles/` y `assets/` juntos; las rutas relativas admiten un subdirectorio de GitHub Pages. Los módulos ES requieren HTTP(S), no `file://`. El modo opcional **Manos 3D** carga bajo demanda MediaPipe Tasks Vision 1.0.1 y el modelo Hand Landmarker, por lo que su primera activación requiere red; la webcam requiere HTTPS o `localhost`.

## Campaña e integración

Las nuevas salas 23–42 se organizan en **Inercia consciente**, **Ritmos de la sala**, **Transferencias** y **Convergencia**. Cada una incluye objetivo, pista y un recorrido construido con las mecánicas existentes. Los nombres y ajustes de construcción están en [docs/EXPANSION.md](docs/EXPANSION.md).

El selector tiene ocho filtros de capítulo y planos derivados de los mismos datos que utiliza la física. Se pueden inspeccionar salas bloqueadas; mirar no inicia una partida. El botón de entrada respeta los desbloqueos.

La integración de la expansión conservó las 22 salas originales, física, geometría, controles, almacenamiento y shader frente a `c907701e93c6c9798ecfb35b566269fa63cdc949`. `campaign.js` compone ambos catálogos y el motor lo recibe por constructor. La sala 22 celebra el cierre original y permite seguir a la 23; el final global está en la 42.

## Guardado

Se mantienen `roomTiltGame.progress.v2` y `roomTiltGame.settings.v2`. No se archivan ni borran los récords anteriores. Una partida con 22/22 conserva sus tiempos, intentos y sala seleccionada; se ofrece un botón separado para continuar en la 23. Las partidas parciales conservan su progreso normal.

Las caídas y pausas conservan la secuencia durante la tentativa. Reiniciar o recargar vuelve al inicio de la sala: no hay checkpoints intermedios persistentes. El cronómetro mide tiempo de simulación activo; no es una clasificación competitiva entre dispositivos.

## Controles

WASD o flechas inclinan; Escape pausa, R reinicia y H muestra la pista de la sala. Con puntero o pantalla táctil, arrastrá el escenario o el stick. Soltar quita la fuerza aplicada, pero conserva la inercia. La inclinación necesita dispositivo compatible, contexto seguro y permiso cuando corresponda.

**Manos 3D (MediaPipe):** está calibrado para una webcam colocada sobre el monitor de escritorio. La coordenada horizontal se comporta como un espejo; subir/bajar la mano controla altura; el cambio de tamaño aparente de la palma estima profundidad al acercarse o alejarse de la cámara. Una pinza pulgar + índice agarra el cubo, abrirla lo suelta y conserva velocidad para poder lanzarlo; puntas de los dedos y palma también empujan por contacto. Se detectan hasta dos manos. Se dibujan con la malla articulada de Mano Atelier v03, piel, uñas y sombras dinámicas sobre la sala; el cubo y los obstáculos ocultan las partes que quedan detrás. Los recursos visuales se sirven desde `assets/hands/` y se cargan solo al usar este modo. Si WebGL2 o los recursos no están disponibles, se conserva la guía de líneas. La cámara se procesa en el navegador y se detiene al desactivar el modo o salir de la página.

La partida se pausa al perder foco. Los menús detienen la simulación. Movimiento reducido y efectos desactivados afectan la decoración, no el transporte ni las compuertas.

## Relieve y color de materiales

Alta y Cinemática incorporan relieve con silueta, intersección de mapas de profundidad procedurales y autooclusión local. Todos los perfiles incorporan variación de color interpolada en el espacio de cada objeto, equivalente a vertex paint para este renderer sin mallas. Configuración, límites y prueba WebGL: [docs/RELIEF.md](docs/RELIEF.md).

## Pruebas

Node.js 22 o posterior:

```sh
npm test
npm run check
npm run test:course
npm run test:static
```

`test:course` verifica las **20 salas nuevas**, no afirma recorrer las 42 originales y nuevas. Guarda trazas e inputs reproducibles. Las originales conservan sus tests de regresión y guardas por hash.

Con Python, Playwright, Chromium y Pillow según la prueba:

```sh
python3 tests/browser.py --ui-only --chromium /ruta/al/chromium
python3 tests/experience-browser.py --offline
python3 tests/shaders_egl.py
```

`browser.py --ui-only` y `experience-browser.py` simulan WebGL explícitamente. La segunda prueba reproduce recorridos completos mediante eventos DOM de teclado y joystick, con la física real y un reloj de frames controlado. No son pruebas de render ni de sensores físicos. Chromium predeterminado: `/usr/bin/chromium`.

`shaders_egl.py` compila los shaders y genera imágenes reales mediante EGL/GLES. Las variantes mediump se compilan; su dibujo adicional se solicita con `--draw-mediump`. Este backend de software no demuestra rendimiento de GPU o teléfono. `npm run test:browser` exige WebGL real en el navegador y falla expresamente si no está disponible.

Los reportes se escriben en `test-results/`. Alcance, resultados y límites: [docs/EXPANSION.md](docs/EXPANSION.md). El render Cinemática se documenta en [docs/CINEMATIC.md](docs/CINEMATIC.md).

## Reparaciones de controles — 26/09/2026

La activación de manos comparte una sola solicitud y permite cancelar mientras carga el modelo, espera permiso o prepara el vídeo. Los streams tardíos se cierran. Perder vídeo, ocultar la página o fallar una detección descarta el input; una mano que reaparece inicia un seguimiento nuevo y debe volver a acercarse para agarrar. Los empujes respetan obstáculos, plataformas y rampas.

El volumen 0–100% se guarda, actualiza su indicador y controla la ganancia de audio, también al reanudar o silenciar. El valor inicial es 65%.

`npm run test:regressions` comprueba estos flujos mediante Playwright para Python, Web Audio real y streams de vídeo sintéticos; WebGL y la inferencia están simulados y no se abre la webcam. Usa `CHROMIUM_PATH` para elegir Chrome/Chromium. Las regresiones unitarias forman parte de `npm test`. `.gitattributes` conserva LF incluso al clonar con la conversión de líneas de Windows habilitada.

Detalle y alcance de la validación: [reparaciones verificadas](docs/REPARACIONES-2026-09-26.md).

## Audio — Resonancias de la sala

Música original adaptativa con ocho arreglos de capítulo, teclas suaves, acordes ambientales y pulsos que responden al movimiento. El cubo tiene roce y contactos diferentes en madera, alfombra, agua, plataformas, rampas, slime y arena en movimiento. Saltos, rebotes, agarre/liberación de manos, carga del aro, portal y objetivos tienen señales propias. Los menús también responden al teclado, puntero y pinza.

En **Ajustes → Audio** se puede regular volumen general, música, ambiente y efectos por separado, activar audio mono o dinámica nocturna y escuchar una muestra con **Probar sonido**. El volumen general previo y el silencio guardado se conservan. El audio se inicia tras una interacción; al perder foco o esconder la pestaña se detiene. La pausa voluntaria conserva un acompañamiento de menú suave y silencia el movimiento de la sala.

Todo se sintetiza localmente mediante Web Audio, sin servicios externos, descargas de música ni dependencias nuevas. Son composición y diseño procedural originales; no grabaciones de foley ni una banda sonora de terceros. La actualización inicial de audio conservó la física, los niveles y los shaders. Los materiales físicos posteriores se describen abajo.

`npm run test:audio` usa AudioContext y OfflineAudioContext reales, con WebGL simulado para los flujos de interfaz. Exporta WAVs e informes en `test-results/audio/`; mide señal, picos, estéreo/mono, silencio y límites de voces, además de verificar las preferencias y las transiciones. No equivale a una escucha subjetiva ni a una prueba en altavoces/teléfonos físicos. Dirección y arquitectura: [diseño sonoro](docs/AUDIO-DESIGN-2026-09-26.md).

## Animaciones de nivel

Al entrar a una sala, el cubo aparece con un giro y desciende hasta su posición inicial en 900 ms. Al completarla, se eleva, gira y se contrae en 1050 ms mientras el objetivo o portal libera anillos de luz. La animación de salida termina antes de continuar desde la pantalla de victoria.

El cronómetro, la física y las plataformas quedan detenidos durante ambas animaciones. Pausar y reanudar conserva su avance; movimiento reducido o efectos desactivados las omiten. El progreso y el récord se guardan al completar el objetivo.

`npm run test:transitions` ejecuta Chrome/Chromium con WebGL y el worker reales. Valida entrada, salida, pausa, récord, siguiente sala, portal de pared y un worker demorado, con poses de finalización y reloj visual controlados. Requiere Playwright; admite `PLAYWRIGHT_MODULE` y `CHROMIUM_PATH`. Capturas e informe: `test-results/level-transitions/`.

## Agua, slime, arena, gelatina y telas

El agua conserva inercia y deja una película húmeda temporal; el slime añade arrastre viscoso y adhesión que se vence inclinando la sala. La arena transporta según su corriente, con velocidad acotada y posibilidad de avanzar en contra. Los bouncers de gelatina se comprimen al golpe, amortiguan el movimiento tangencial y recuperan su forma con un resorte.

Las salas 1, 6, 10, 15, 23, 30 y 38 incorporan paños con anclajes, pliegues, viento suave y contactos con cubo y manos. Tienen sombras y oclusión en la sala. Las telas se simulan con el mismo paso fijo del juego y se congelan al pausar o durante las transiciones.

`npm run test:living-materials` verifica física y render juntos con Chrome/Chromium real, contactos reproducibles y capturas de escritorio/móvil. Admite `PLAYWRIGHT_MODULE` y `CHROMIUM_PATH`. Parámetros, límites y arquitectura: [materiales y telas](docs/MATERIALES-TELAS.md).
