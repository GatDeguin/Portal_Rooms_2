# Portal Room — circuito y experiencia V.03

Un cubo rojo, 22 salas de gravedad y una habitación con render WebGL procedural. Esta revisión trabaja **cada sala**, reorganiza la presentación y añade respuestas visuales breves. Conserva la cámara frontal en perspectiva, el progreso ganado y el despliegue estático sin dependencias de ejecución.

[Revisión de las 22 salas](docs/REVISION-SALAS.md) · [Pantallas e interacciones](docs/EXPERIENCIA.md) · [Validación y límites](docs/VALIDACION.md)

## Ejecutar y publicar

Desde esta carpeta:

```sh
python -m http.server 8080
```

Abrí `http://localhost:8080`. Para publicar, copiá **`index.html`, `src/` y `styles/` juntos** a un alojamiento estático. Las rutas son relativas: también funcionan bajo un directorio de proyecto como `/Portal_Room/`. No requiere `npm install` ni compilación. Los módulos ES requieren HTTP(S); no abras el HTML con doble clic mediante `file://`.

Esta entrega es una copia de trabajo. No implica que una rama remota de GitHub se haya actualizado.

## Qué se revisó

Las 22 salas tienen ajustes individuales de geometría, aproximación, superficies o recepción. Se agrupan en cuatro capítulos: **El equilibrio**, **La materia**, **El ritmo** y **La altura**. Cada sala incluye una habilidad, un briefing y tres pistas progresivas. Las salas 19, 21 y 22 recibieron cambios más amplios para conectar saltos, rebotes y plataformas.

El selector permite inspeccionar incluso una sala bloqueada: su plano usa los mismos datos que la física. **Mirar no inicia la partida ni cuenta un intento**. La entrada es una acción separada y respeta el desbloqueo progresivo.

El nuevo inicio muestra la siguiente sala, progreso y controles. La pausa explica la sala; los ajustes se separan en Controles, Imagen y Audio; la victoria muestra el siguiente experimento. Hay respuesta al pulsar, foco visible, indicador del suelo, secuencia de objetivos, carga del aro, transiciones cancelables y volumen maestro. El centro de la pantalla permanece libre durante el juego normal.

El render representa las alturas reales de obstáculos, zonas elevadas y plataformas. Los objetivos inactivos se distinguen de los activos, el portal tiene marco y núcleo visibles y las sombras ya no muestrean las paredes interiores como falsas fuentes de oclusión. Materiales y luz se ajustaron para separar mejor el cubo, los obstáculos y las señales de juego.

## Controles

WASD o flechas inclinan; Escape pausa/reanuda, R reinicia y H muestra una pista. Con mouse o pantalla táctil, arrastrá sobre la sala o usá el stick. Soltar deja de aplicar fuerza, pero no elimina la inercia. Enter puede omitir la transición de entrada.

La prioridad es teclado, stick, arrastre y sensores. Otro dedo no toma el gesto activo. Sensibilidad, suavizado, zona muerta e inversión modifican la inclinación, no los ejes del teclado. Los ajustes se guardan al cambiar; cuando el almacenamiento no está disponible, se indica que solo se conservan en la sesión.

La inclinación requiere un contexto seguro, soporte del dispositivo y permiso cuando corresponda. Mantené el teléfono quieto un instante para calibrar. El indicador solo confirma activación tras lecturas válidas y estables. Audio, vibración y pantalla completa dependen del dispositivo y sus permisos.

La partida se pausa al perder foco o esconder la pestaña y no se reanuda sola al volver. Los menús no mantienen un render continuo. El avance tras la victoria siempre es manual. El ajuste de efectos y la preferencia de movimiento reducido desactivan animaciones decorativas; no alteran las reglas de juego.

## Guardado y récords

Se mantienen los índices de las 22 salas, desbloqueos, intentos, reinicios y preferencias. Como cambió el recorrido, los mejores tiempos anteriores se **archivan** en `legacyBestTimes`; no compiten con marcas de esta revisión. El selector permite consultarlos como archivados. El progreso usa `courseVersion: 3` dentro del esquema de guardado existente. La migración no borra las salas ganadas.

El cronómetro mide tiempo activo de simulación a paso fijo de 1/120 s: excluye menús, pausas y transiciones. Ante un bloqueo severo procesa como máximo 0,1 s por fotograma y puede avanzar más despacio que el reloj real. No es un ranking competitivo entre dispositivos. Los intentos aumentan al entrar o repetir, no al reanudar. No se guarda la posición exacta del cubo. Borrar progreso requiere confirmación y conserva ajustes.

Si `localStorage` falla, el juego continúa en memoria: lo no guardado puede perderse al recargar.

## Organización

| Módulos en `src/` | Responsabilidad |
| --- | --- |
| `physics.js`, `geometry.js`, `math.js` | Física, superficies, colisiones y matemáticas. |
| `levels.js` | 22 salas, capítulos, briefings y pistas. |
| `input.js` | Teclado, punteros, sensores y calibración. |
| `storage.js` | Preferencias, progreso y migración de récords. |
| `quality.js`, `shaders.js`, `renderer.js` | Tres presupuestos gráficos, resolución adaptativa y render. |
| `presentation.js` | Planos derivados, objetivos y pistas. |
| `app.js`, `ui.js` | Ciclo de partida y pantallas. |
| `audio.js`, `feedback.js` | Audio y animaciones que no gobiernan la simulación. |

`index.html` y `styles/game.css` contienen la interfaz semántica y sus estilos. No hay fuentes externas, analítica ni dependencias de ejecución.

## Pruebas reproducibles

Con Node.js 22 o posterior, sin instalar paquetes npm:

```sh
npm test
npm run check
npm run test:course
```

Para UI, instalá Playwright y un Chromium en tu entorno Python:

```sh
python -m pip install playwright
python -m playwright install chromium
python tests/browser.py --ui-only --chromium /ruta/al/chromium
python tests/experience-browser.py --offline --chromium /ruta/al/chromium
```

La ruta predeterminada es `/usr/bin/chromium`; `--chromium` permite indicar otra. Las dos comprobaciones anteriores **simulan WebGL**, usan almacenamiento adaptado y cargan módulos mediante un mapa de importaciones offline. Las capturas lo indican. `tests/experience-browser.py` sin `--offline` usa un servidor HTTP local y `localStorage` del navegador, aunque sigue simulando WebGL. No se usó ese modo para los resultados de esta entrega: la navegación local del Chromium disponible está restringida.

Para comprobar recursos HTTP reales y shaders fuera del navegador:

```sh
python scripts/verify-static.py
python -m pip install Pillow
python tests/shaders_egl.py
python scripts/contact-sheets.py
```

La prueba gráfica necesita Linux con Mesa/EGL y ejecuta GLSL real por software, no WebGL dentro de Chromium ni una GPU física. Los informes se escriben en `test-results/`.

La evidencia y sus límites están en [docs/VALIDACION.md](docs/VALIDACION.md). Los pilotos de referencia no sustituyen pruebas humanas de dificultad, sensores o rendimiento en teléfonos reales.
