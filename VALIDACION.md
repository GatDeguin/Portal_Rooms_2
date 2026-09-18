# Validación — Portal Room V.03

## Base y alcance

Trabajo realizado sobre `Portal_Room_40_mejoras.zip`, la entrega anterior, en una copia local separada. No se ha publicado esta revisión en GitHub ni modificado `main` remoto.

Los resultados distinguen **reglas**, **recorridos completos**, **interfaz**, **transporte HTTP** y **render del shader**. Un modo no se presenta como sustituto de los otros.

## Resultados

| Comprobación | Resultado | Qué acredita |
| --- | ---: | --- |
| `npm test` | 224/224 | Física, controles, persistencia, contratos, presentación y recorridos automatizados. |
| `npm run test:course` | 110/110 recorridos | Las 22 salas se completan desde la salida con entradas de gravedad en cinco configuraciones. Estos casos también están incluidos en las pruebas Node, no se suman como 110 pruebas independientes adicionales. |
| `npm run check` | 14 módulos; 128 IDs únicos | Sintaxis JavaScript, importaciones relativas y recursos del HTML. |
| `python tests/browser.py --ui-only` | 30/30 | Inicio, controles, pausa, guardado, sensores sintéticos, desbloqueos, final, multitáctil y fallos previstos. |
| `python tests/experience-browser.py --offline` | 42/42 | Inspección antes de entrar, bloqueos, capítulos, navegación, pistas, ayuda, ajustes, transiciones, movimiento reducido y layouts. |
| `python tests/shaders_egl.py` | 3 perfiles; 43 renders | Compilación/enlace GLSL, envío de uniformes y dibujo por OpenGL ES fuera del navegador. |
| `python scripts/verify-static.py` | 16/16 recursos | Respuesta HTTP real, contenido y tipo MIME de HTML, CSS y 14 módulos bajo `/Portal_Room/`. |

Las suites de navegador registran cero errores JavaScript de página inesperados. Los fallos WebGL provocados en las pruebas de recuperación se tratan como casos esperados.

## Recorridos completos

`tests/helpers/playthrough.mjs` crea el motor, restablece la sala en su salida normal e inicia una partida. Después solo lee el estado y entrega gravedad limitada a los ejes de control mediante `advance()`. No asigna posición, velocidad, secuencia ni tiempo. Los puntos de referencia no se envían al juego publicado: pertenecen exclusivamente a las pruebas.

Configuraciones: 120 Hz de referencia; 30 Hz; 60 Hz con gravedad suave; 144 Hz con aproximación lenta; 60 Hz con aproximación rápida. Se cubren los dos saltos de la sala 19, salto y rebote en la 21, y rampas, superficies elevadas y salto en la 22. Los resultados completos están en `test-results/course/report.json` y los cinco JSON de trayectorias.

El piloto conoce el estado del motor y fue diseñado para seguir rutas concretas. No equivale a un jugador humano, a una búsqueda exhaustiva ni a una medición de dificultad. Los tiempos son de simulación, no tiempos recomendados ni FPS de hardware.

## Interfaz y responsive

Chromium ejecuta el HTML, CSS, módulos y eventos del juego. **WebGL está simulado explícitamente en estas dos suites.** Las capturas incluyen la leyenda “PRUEBA DE INTERFAZ · WebGL simulado”; el fondo vacío de las capturas de gameplay no se presenta como el render del juego.

Se utilizaron mapas de importaciones offline y un adaptador en memoria para `localStorage`. La orientación y los permisos de sensor son sintéticos. Las pruebas de victoria/final posicionan el cubo para activar los flujos de UI; esas acciones no forman parte de la evidencia de recorridos completos, que se obtiene en la suite del motor.

Se comprobaron 320×568, 390×844, 430×932, 844×390, 568×320 y tamaños de escritorio. Las capturas se toman después de las transiciones, sin modificarlas mediante un avance forzado de las animaciones. Se inspeccionaron inicio, selector, ajustes, ayuda, pausa, partida, victoria y final.

La navegación HTTP local desde el Chromium disponible devuelve `ERR_BLOCKED_BY_ADMINISTRATOR`, tanto con `localhost` como con `127.0.0.1`. Por eso no se atribuye a estas suites una prueba de navegación HTTP real ni de almacenamiento nativo. `tests/experience-browser.py` conserva un modo HTTP para ejecutarlo en un entorno sin esa restricción. La entrega sí comprueba por separado sus recursos mediante HTTP real desde Python, con prefijo de proyecto.

## Render

El backend utilizado fue **llvmpipe, LLVM 19.1.7, Mesa 25.0.7-2; OpenGL ES 3.2**, solicitando un contexto compatible con shaders ES usados por el juego. Es render por software, no GPU física.

Se compilaron los perfiles Baja, Media y Alta. Los 43 dibujos incluyen las 22 salas a 480×300, tres perfiles, vistas representativas de mayor detalle, una vista vertical y pasos adicionales de secuencias. Se comprobaron errores GL, diversidad de píxeles y capturas; se revisaron visualmente todas las salas mediante las tres hojas de contacto.

Se corrigieron dos problemas observados en esas capturas: bandas de autosombreado en paredes y núcleo del portal oculto detrás de la pared. La revisión conservó la cámara frontal y ajustó los materiales y la iluminación. Los renders no demuestran una tasa de fotogramas de un teléfono ni WebGL dentro de Chromium; en ese navegador no se logró inicializar el contexto gráfico real.

## Regresiones y revisión

Se observaron pruebas fallidas antes de los cambios para metadatos/recorridos, superficie elevada, presentación, migración y contratos gráficos. Los casos de sombra y posición del núcleo del portal tuvieron una fase roja de dos pruebas seguida de su corrección. Se añadió también una regresión del aviso de récords archivados al borrar el progreso. Los fallos de expectativas de test por cambios deliberados del selector y las pestañas se adaptaron al nuevo comportamiento, manteniendo controles sobre bloqueos, temporizador e intentos.

Se revisaron el diff, los recursos relativos y los estados de pausa/transición. No hubo un revisor humano ni un agente independiente: no se declara revisión externa.

## Límites pendientes

No se midieron FPS, temperatura, consumo de batería ni latencia en dispositivos físicos. No se probaron sensores, audio o vibración en teléfonos reales ni Safari/iOS. No se realizó un recorrido humano de las 22 salas, un estudio de usabilidad o una auditoría formal de accesibilidad. Las mejoras de claridad y acabado son decisiones de diseño comprobadas en código y capturas, no una medición estadística de satisfacción.

## Repetir

```sh
npm test
npm run check
npm run test:course
python tests/browser.py --ui-only
python tests/experience-browser.py --offline
python tests/shaders_egl.py
python scripts/verify-static.py
python scripts/contact-sheets.py
```

Node 22+, Python, Playwright, Chromium, Pillow y Mesa/EGL son herramientas de prueba. No son dependencias del juego publicado. Los informes se generan en `test-results/` y se incluyen por separado en el paquete de evidencia.
