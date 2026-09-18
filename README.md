# Portal Room — 40 mejoras

22 salas de gravedad, un cubo rojo y una habitación renderizada con WebGL procedural. Se conserva la vista frontal en perspectiva: **no se reincorpora la cámara cenital**.

La revisión incorpora las 40 mejoras de física, controles, progreso, presentación, rendimiento y organización del código. El detalle verificable está en [docs/40-mejoras.md](docs/40-mejoras.md).

## Ejecutar

No requiere paquetes de ejecución ni compilación. Desde esta carpeta:

```sh
python -m http.server 8080
```

Abrí `http://localhost:8080`. Para publicar, copiá **`index.html`, `src/` y `styles/` juntos** a un alojamiento estático. Las rutas son relativas y admiten subdirectorios. Ya no alcanza con subir solo el HTML. Los módulos ES necesitan HTTP(S), no abrir el archivo mediante `file://`.

## Jugar

WASD o flechas inclinan; Escape pausa/reanuda, R reinicia y H muestra una pista. Con mouse o pantalla táctil, arrastrá sobre la sala o usá el stick. Soltar deja de aplicar fuerza, pero conserva la inercia del cubo.

La prioridad de entradas es teclado, stick, arrastre y sensores. El segundo dedo no toma el control del primer gesto. Sensibilidad, suavizado, zona muerta e inversión de ejes modifican la inclinación, no cambian los ejes del teclado.

Para sensores, usá HTTPS o un contexto seguro, un dispositivo compatible y el botón de activación. Mantené el teléfono quieto un instante para calibrar. El indicador solo muestra sensores activos tras recibir muestras válidas y estables. Denegar permisos o no recibir lecturas deja disponibles los controles manuales. Audio, vibración y pantalla completa son opcionales y dependen del dispositivo.

La partida se pausa al perder foco o esconder la pestaña y no se reanuda sola al volver. Los menús no mantienen un render continuo. Al completar una sala, elegí avanzar o repetir: no existe avance automático por temporizador.

## Progreso y récords

Completar una sala desbloquea la siguiente. El selector contiene las 22; las ganadas se pueden repetir. El final conserva desbloqueos y récords, sin borrar el circuito.

El cronómetro mide **tiempo activo de simulación**, a paso fijo de 1/120 s. Excluye menús, pausas, transiciones y pestañas ocultas. Se procesa como máximo 0,1 s por fotograma: ante un bloqueo severo puede avanzar más despacio que el reloj real. No es un benchmark ni un ranking competitivo entre dispositivos.

Los intentos se cuentan al entrar o repetir, no al reanudar. Los reinicios se registran aparte. Solo un tiempo menor reemplaza el récord. El almacenamiento versionado valida datos y migra la clave anterior `roomTiltGame.level` y sus preferencias. No se guarda la posición exacta del cubo.

Si `localStorage` falla, el juego continúa en memoria y avisa; lo no guardado puede perderse al recargar. Borrar progreso requiere confirmación y conserva los ajustes.

## Cambios técnicos

El motor usa colisiones por barrido, corrección de penetración, restitución según velocidad, fricción por superficie, aterrizajes, control aéreo reducido y bumpers con impulso/cooldown acotados. Las rampas comparten fórmula de altura entre física y shader. Las plataformas móviles transportan el cubo y el objetivo asociado.

Se ajustaron conexiones verticales en las salas **15, 17, 18, 20 y 22**, y salto/bumper en la **21**. La sala 22 renderiza sus cuatro plataformas. Estos cambios modifican deliberadamente la geometría, no solo la presentación.

Baja, Media y Alta tienen presupuestos distintos de píxeles, raymarching, sombras, oclusión, reflejos, niebla y texturas. Auto adapta resolución y efectos con histéresis; no cambia el paso físico. No se promete una tasa de FPS.

## Módulos

| Archivo | Responsabilidad |
| --- | --- |
| `physics.js`, `geometry.js`, `math.js` | Simulación, superficies, colisiones y matemáticas. |
| `levels.js` | Definiciones inmutables de las 22 salas. |
| `input.js` | Teclado, punteros, sensores y calibración. |
| `storage.js` | Preferencias, progreso, migración, intentos y récords. |
| `quality.js`, `shaders.js`, `renderer.js` | Calidad adaptativa y WebGL. |
| `app.js`, `ui.js`, `audio.js` | Ciclo de partida, interfaz y respuesta audiovisual. |
| `styles/game.css`, `index.html` | Layout responsive y controles semánticos. |

Los archivos JavaScript están en `src/`.

## Pruebas

Node.js 22 o posterior, sin instalar paquetes npm:

```sh
npm test
npm run check
```

Pruebas de navegador con Python, Playwright y Chromium:

```sh
python -m pip install playwright
python -m playwright install chromium
python tests/browser.py --chromium /ruta/al/chromium
```

El modo `--ui-only` sustituye WebGL y **no valida el render del navegador**. El script carga los módulos entregados mediante un mapa de importaciones offline; emplea almacenamiento en memoria, permisos y sensores sintéticos. Las capturas de ese modo llevan una leyenda explícita.

En Linux con Mesa/EGL, Node y Pillow:

```sh
python -m pip install Pillow
python tests/shaders_egl.py
```

Esta prueba compila y dibuja los shaders reales fuera del navegador con OpenGL ES. Los informes y capturas se generan en `test-results/`.

Resultados: **80/80 pruebas Node**, **30/30 comprobaciones de interfaz**, **3 perfiles de shaders y 33 renders ES**. Ver [docs/VALIDACION.md](docs/VALIDACION.md) para el entorno y los límites: las pruebas no equivalen a WebGL nativo del navegador, sensores físicos o 22 recorridos humanos completos.
