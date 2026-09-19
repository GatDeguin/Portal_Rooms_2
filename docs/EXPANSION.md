# Dominio de la gravedad — salas 23–42

Implementación de la propuesta aprobada: veinte salas nuevas, cuatro capítulos adicionales y campaña total de 42. Base: `c907701e93c6c9798ecfb35b566269fa63cdc949`. No se modifica la física para acomodar los recorridos.

## Contenido implementado

| Sala | Nombre | Pregunta de diseño |
|---|---|---|
| 23 | Contrapulso | Preparar el freno antes de llegar al aro. |
| 24 | Retorno sobre hielo | Elegir también el camino de regreso. |
| 25 | Tangente roja | Elegir el flanco del bumper; contacto opcional. |
| 26 | Dos velocidades | Escoger entre hielo y superficie normal. |
| 27 | Tríptico de inercia | Preparar la siguiente salida durante cada llegada. |
| 28 | Ventana de paso | Acelerar hacia una abertura que se aleja. |
| 29 | Contrafase | Resolver dos ventanas desde un vestíbulo seguro. |
| 30 | Andén de llegada | Embarcar, viajar y desembarcar. |
| 31 | Relevo de fase | Transferirse entre dos plataformas desfasadas. |
| 32 | Relojería | Separar cruce, transporte, estabilidad y salida. |
| 33 | Descenso útil | Utilizar una caída como parte del recorrido. |
| 34 | Aterrizaje lateral | Preparar el vuelo y estabilizarse al aterrizar. |
| 35 | Escalera reversible | Subir y bajar siguiendo la secuencia. |
| 36 | Salto con cita | Apuntar a la posición futura del transporte. |
| 37 | Dos vuelos, una pausa | Recuperar el control entre dos saltos de suelo. |
| 38 | Ruta de autor | Rampa y salto son soluciones válidas. |
| 39 | Rebote al andén | Descartar el impulso antes de embarcar. |
| 40 | Tres cotas | Visitar alturas distintas según el objetivo activo. |
| 41 | Ensayo general | Reconocer cuándo seguir y cuándo detenerse. |
| 42 | Gravedad dominada | Impulso, encuentro y calma antes del portal final. |

Las definiciones completas, congeladas y compatibles con el esquema original, están en `src/levels-expansion.js`. No hay nuevos botones de juego, daño, vidas, puertas mágicas ni teletransportes. El bumper es opcional en 25 y 39; no existe un requisito oculto de golpearlo.

## Integración

- `src/campaign.js` compone las 22 originales y las 20 nuevas; define capítulos, looks y la oferta de continuación. Los IDs originales 1–22 no cambian.
- `src/app.js` inyecta el catálogo de 42 en motor, guardado e interfaz. La entrada a una sala es explícita; los filtros y previews no modifican la selección guardada.
- `src/campaign-view.js` deriva planos, cotas y trayectorias móviles del catálogo activo. No importa módulos históricos de la raíz ni cambia la cámara del juego.
- `src/ui.js` conecta filtros, preview, reconocimiento de 22/22, continuación a la 23 y final de 42/42; el HUD presenta objetivos en orden.
- `src/renderer.js` cambia únicamente la selección de look por capítulo, preservando las asignaciones de 1–22. No aumenta uniforms, pasos ni efectos.

Se preservan byte por byte `src/levels.js`, `src/physics.js`, `src/geometry.js`, `src/input.js`, `src/storage.js`, `src/shaders.js`, `src/quality.js` y `src/audio.js`. Las guardas originales siguen activas. No se elimina ni debilita un test para admitir contenido nuevo.

El guardado sigue en v2. El normalizador recibe 42 y amplía los arrays sin borrar marcas, intentos ni reinicios. 22/22 habilita la 23 sin alterar silenciosamente `current`. Reiniciar una tentativa sigue reiniciando su secuencia; no se prometen checkpoints persistentes.

## Ajustes de la maqueta aprobada

El documento inicial definía anclas, no geometrías ya comprobadas. Los cambios siguientes responden a pruebas del motor y a capturas desde la cámara original:

- Las rampas de 32, 35, 38, 40 y 42 se conectaron con pendientes y extremos que permiten superar el margen de colisión del cubo. No se cambió `MAX_STEP`, la gravedad ni la colisión.
- Los spawns de 31 y 35 se separaron de las entradas de rampa y otros volúmenes.
- El aro de 26 pasó a `(0.95, -2.15)`; azul de 28 a `(-0.60, -1.65)`; verde y azul de 29 a x=-0.50. Las ubicaciones iniciales quedaban ocultas desde la cámara frontal. Se conserva el propósito de cada recorrido.
- Verde de 32 se ubicó en `(1.65, 2.10)`, fuera de la huella de la rampa. Su segunda compuerta organiza un cruce lateral antes del portal.
- Los andenes y placas móviles de 32 y 42 se alinearon con sus soportes. Los índices de plataforma se verifican a varias fases.
- La superficie móvil de 36 mide 1.90 × 1.70; la recepción de 41, 1.80 × 1.70. El pad final de 42 utiliza potencia 4.3. Estos valores son propios del nivel; la dinámica global permanece intacta.
- En 37 el segundo pad está en `(0, -0.15)` y ambos pads siguen a nivel del suelo. El retorno entre saltos evita disparos accidentales.
- Se retiró un bloque central de 40 que estrechaba indebidamente la ruta de retorno. No se agregan objetos para completar una cuota.
- El bumper opcional de 42 se apartó de la bajada hacia el pad final. Aro y portal comparten la plataforma a y=0.80; no hay una trampa después del aro.

Todos los niveles respetan 6 obstáculos, 8 zonas contando pads, 3 rampas, 4 plataformas y 3 bumpers como máximos. Los obstáculos mantienen altura visual/física 0.49; no se colocan zonas ni pads elevados. Cada sala utiliza una sola dirección de impulso. Las plataformas son macizas: los retornos no atraviesan su parte inferior.

### Encuadre en teléfonos verticales

Las capturas iniciales a 320×568 recortaban al cubo y algunos objetivos frontales. Para las salas nuevas, el canvas se encuadra a 16:9 dentro de la pantalla vertical, dejando HUD y stick fuera del campo central. No se altera `cameraRay`, su perspectiva ni la geometría; se usa el encuadre horizontal que ya proporciona esa cámara. Al girar el teléfono se aprovecha toda la pantalla. Las salas originales conservan su encuadre previo. La aplicación reajusta el viewport al cambiar de sala.

## Validación reproducible

Resultados de la versión entregada:

| Prueba | Resultado y alcance |
|---|---|
| `npm test` | 401 tests: suite original y pruebas nuevas de catálogo, guardado, previews, geometría y recorridos. |
| `npm run check` | Sintaxis, imports relativos y HTML: 15 módulos, 130 IDs únicos. |
| `npm run test:course` | 275 recorridos de las salas 23–42, todos con replay independiente de sus inputs. |
| `npm run test:static` | 17 recursos del grafo activo servidos por HTTP, tipos MIME y bytes correctos. |
| `npm run test:ui` | 40 comprobaciones de interfaz, almacenamiento, transiciones y controles. WebGL explícitamente simulado. |
| `npm run test:experience` | 80 recorridos completos dentro de la aplicación: 20 salas × teclado/joystick DOM × dos gravedades. WebGL simulado, reloj de frames controlado, física e InputController reales. |
| `npm run test:render` | 16 variantes compiladas/enlazadas, 126 imágenes reales EGL/GLES; incluye las 42 salas en Baja, veinte capturas mayores de la expansión, nueve salas representativas en cuatro perfiles y cuatro proyecciones del campo de juego para pantalla vertical. |

Desglose de los 275 recorridos: 160 de la matriz 20 × 30/60/120/144 Hz × dos gravedades; 40 de entradas discretas de teclado; 54 con retrasos iniciales en nueve salas móviles; 12 rutas alternativas; cuatro recuperaciones por caída en 34 y 42; cinco pausas/reanudaciones en rutas reales.

El piloto solo lee el estado y entrega vectores de gravedad acotados después del spawn. No asigna posición, velocidad, secuencia, reloj ni `solved`. El replay independiente debe reproducir la victoria. Las pruebas de salto/transporte exigen registrar esas acciones y apoyos para no contar un bypass como solución del reto. Se verifican ventanas geométricas de cruce superiores a 1.2 s en 28 y 29; esto no sustituye la medida de tolerancia con jugadores humanos.

`tests/browser.py` conserva algunas asignaciones de estado para aislar pantallas de victoria: se identifican como **fixtures de UI**, no como evidencia de recorrido. `tests/experience-browser.py` utiliza eventos DOM de teclado y joystick y no teletransporta al jugador durante los recorridos.

## Límites de la validación

No son pruebas humanas de dificultad ni una demostración de ausencia de bloqueos para toda trayectoria posible. Las recuperaciones explícitas cubren casos representativos; los retrasos y entradas discretas amplían la prueba, pero no agotan el espacio de estados.

El navegador disponible no ofrece WebGL. Su prueba de render se bloquea expresamente; no se cuenta como aprobada. Las imágenes reales se generan con Mesa/llvmpipe por CPU en EGL/GLES, no con una GPU física. Mediump se compila/enlaza; no se han validado sus imágenes. No hay medición de FPS móvil, sensores de un teléfono real ni todo el presupuesto de Cinemática a resolución máxima.

`test:course` cubre las veinte nuevas salas. No afirma un recorrido humano o por piloto de las 42: las originales conservan su suite y hashes sin alteraciones.

## Publicación

Publicar `index.html`, `src/` y `styles/` de esta revisión como una unidad. No copiar solo el archivo de niveles. El despliegue de Pages debe realizarse después de integrar la rama; un PR creado no significa que el sitio ya esté actualizado. Revisar GPU real y móviles antes de dar por cerrada la validación visual de dispositivos.
