# Portal Room — Dominio de la gravedad, V.04

**42 salas: el circuito original de 22 más una expansión de 20.** Un cubo rojo, una habitación y control de gravedad mediante teclado, arrastre, stick o inclinación. Render procedural WebGL 1 con perfiles Baja, Media, Alta y Cinemática; Automática adapta solo los tres primeros.

La aplicación activa usa exclusivamente `index.html`, `src/` y `styles/`. Los archivos homónimos de la raíz pertenecen a revisiones anteriores y no se deben mezclar con este catálogo.

## Ejecutar

```sh
python3 -m http.server 8080
```

Abrí `http://localhost:8080`. No requiere `npm install`, motor externo ni compilación. Publicá `index.html`, `src/` y `styles/` juntos; las rutas relativas admiten un subdirectorio de GitHub Pages. Los módulos ES requieren HTTP(S), no `file://`.

## Campaña e integración

Las nuevas salas 23–42 se organizan en **Inercia consciente**, **Ritmos de la sala**, **Transferencias** y **Convergencia**. Cada una incluye objetivo, pista y un recorrido construido con las mecánicas existentes. Los nombres y ajustes de construcción están en [docs/EXPANSION.md](docs/EXPANSION.md).

El selector tiene ocho filtros de capítulo y planos derivados de los mismos datos que utiliza la física. Se pueden inspeccionar salas bloqueadas; mirar no inicia una partida. El botón de entrada respeta los desbloqueos.

Las 22 salas originales, física, geometría, controles, almacenamiento y shader permanecen byte por byte intactos frente a `c907701e93c6c9798ecfb35b566269fa63cdc949`. `campaign.js` compone ambos catálogos y el motor lo recibe por constructor. La sala 22 celebra el cierre original y permite seguir a la 23; el final global está en la 42.

## Guardado

Se mantienen `roomTiltGame.progress.v2` y `roomTiltGame.settings.v2`. No se archivan ni borran los récords anteriores. Una partida con 22/22 conserva sus tiempos, intentos y sala seleccionada; se ofrece un botón separado para continuar en la 23. Las partidas parciales conservan su progreso normal.

Las caídas y pausas conservan la secuencia durante la tentativa. Reiniciar o recargar vuelve al inicio de la sala: no hay checkpoints intermedios persistentes. El cronómetro mide tiempo de simulación activo; no es una clasificación competitiva entre dispositivos.

## Controles

WASD o flechas inclinan; Escape pausa, R reinicia y H muestra la pista de la sala. Con puntero o pantalla táctil, arrastrá el escenario o el stick. Soltar quita la fuerza aplicada, pero conserva la inercia. La inclinación necesita dispositivo compatible, contexto seguro y permiso cuando corresponda.

La partida se pausa al perder foco. Los menús detienen la simulación. Movimiento reducido y efectos desactivados afectan la decoración, no el transporte ni las compuertas.

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
