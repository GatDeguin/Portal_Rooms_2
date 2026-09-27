# Materiales físicos y telas

La campaña tiene 62 salas. Conserva los IDs y guardados anteriores, con correcciones de recorrido en 5, 6, 16, 17, 19 y 31 y nuevas huellas de materiales en 7, 8 y 10. Los tipos internos `ice`, `brake` y `boost` se mantienen por compatibilidad, pero se presentan como agua, slime y arena. Los cambios están concentrados en `surface-physics.js`; `physics.js` continúa integrando a 120 Hz.

## Respuesta de las superficies

- **Agua poco profunda:** baja fricción y resistencia creciente con la velocidad; al girar, el agarre transversal se reduce progresivamente y el cubo derrapa. Gotas balísticas, ondas y espuma muestran el contacto y el cambio de dirección. La humedad se acumula y desaparece gradualmente después de salir. No modifica el cubo mientras vuela o está sobre una plataforma elevada.
- **Slime:** arrastre viscoso mayor a baja velocidad, adhesión que frena sin invertir la velocidad y un anclaje elástico que se estira y cede. Una película temporal, lóbulos y filamentos acompañan el contacto y persisten brevemente al salir. La inclinación deliberada permite atravesarlo. El brillo húmedo y el borde deformado acompañan el contacto.
- **Arena en movimiento:** acopla la velocidad del cubo a una corriente de dirección y velocidad configurables (`dx`, `dz`, `flowSpeed`). Amortigua el deslizamiento lateral. La fuerza máxima de corriente permite oponerse incluso con gravedad suave; el cubo no acelera indefinidamente. Los granos visuales avanzan en esa misma dirección.
- **Gelatina:** el choque comprime el bouncer sobre el eje del impacto. Un resorte amortiguado recupera su forma. La salida normal queda acotada y la velocidad tangencial pierde energía; se conserva el radio de colisión de la sala.

Son modelos de contacto y arrastre para un juego, con superficies procedurales: no son una simulación volumétrica de fluidos ni granos individuales. Las ondas y el acabado del material no alteran la geometría del recorrido. Movimiento reducido limita la decoración, preservando las fuerzas de juego.

## Telas interactivas

Las instalaciones de las salas 1, 6, 12, 16, 30 y 38 ocultan objetivos o dispositivos reales; la 6 utiliza dos paños. Las salas nuevas añaden sus propias cortinas, documentadas en `MASTERY.md`. Cada paño habitual tiene 110 partículas. `cloth-layout.js` define posiciones y soportes; una sala puede definir `cloths: []` para omitirlo o hasta dos paños personalizados.

`ClothSystem` utiliza integración de Verlet con restricciones de distancia, anclajes superiores, gravedad y viento suave. Resuelve contactos con el cubo orientado, palmas/dedos, suelo, paredes, obstáculos, rampas, plataformas móviles y bouncers. Las restricciones y el movimiento están acotados; la tela aporta un pequeño arrastre al cubo sin cerrar el recorrido. Las manos se reciben del sistema existente de seguimiento.

La simulación comparte reloj, pausa, reinicio y fin de nivel con el motor. El worker devuelve la misma malla y cámara que corresponden a la imagen de sala presentada, incluyendo la transformación visual del cubo durante la transición. Así una respuesta tardía no adelanta la tela respecto a su fondo.

`ClothRenderer` dibuja tela, costuras, soportes, gotas y filamentos mediante una capa WebGL2, con profundidad de la sala y sombras. Reutiliza los receptores de las manos: el cubo y los sólidos ocultan la tela, y las manos respetan su profundidad. La capa se ajusta al rectángulo real del escenario y reconstruye sus recursos al recuperar el contexto. Si WebGL2 no está disponible se omite esa capa sin bloquear el juego base.

## Verificación

- `npm test`: fuerzas, límites, independencia de FPS, contactos, pausa/reinicio, anclajes, snapshots, corrientes y recuperación de gelatina; también la campaña y los controles existentes.
- `npm run check`: sintaxis, imports y referencias del HTML.
- `npm run test:living-materials`: Chrome con WebGL real y worker de sala, capturas de agua, slime, arena, impacto/recuperación de gelatina y tela en escritorio/móvil. El test posiciona el cubo y alimenta manos sintéticas para repetir los contactos; no abre una webcam ni demuestra seguimiento físico real.
- `npm run test:transitions` y `npm run test:hand-render`: regresiones visuales de las funciones incorporadas previamente.

Los informes y las capturas se guardan en `test-results/`. Las pruebas de Chrome admiten `CHROMIUM_PATH` y `PLAYWRIGHT_MODULE`.

La compilación calcula la deformación afín de gelatina una vez por frame en CPU. Baja y Media utilizan campos analíticos para ondas y bultos; Alta y Cinemática conservan el detalle procedural completo. Los receptores de profundidad de manos y telas siguen esa misma forma. Las calidades manuales preparan solo el programa solicitado; Automática conserva sus programas de respaldo. No se ampliaron los tiempos máximos de preparación.

## Huellas, goma y efectos

`shapes.js` define círculos, rectángulos redondeados y cápsulas rotadas con una única función de distancia para física y planos. El render usa las mismas dimensiones. Las zonas sólo actúan en contacto con el suelo.

Los saltadores son casquetes esféricos de altura neutral 0,14 y base a 0,012 sobre la altura del dispositivo. El resorte de compresión oscila al recibir un salto; renderer, manos y telas comparten sus dimensiones. Los pads también admiten `y` para ubicarse sobre plataformas.

`surface-effects.js` integra las gotas a 120 Hz con semilla reproducible y presupuestos máximos de 96 gotas y 24 ondas. La geometría raster se genera desde el snapshot presentado, respeta pausa y efectos reducidos, y los lóbulos de slime siguen la misma posición, rotación y transición que el cubo. El juego base conserva su render WebGL1; esta capa utiliza WebGL2.

## Validación de esta revisión

Las pruebas de física comprueban derrape transversal, frenado, adherencia elástica, escape con gravedad suave, resortes y efectos acotados. Las pruebas de campaña ejecutan entradas de gravedad y registran sus recorridos; las pruebas visuales usan fixtures de contacto para inspeccionar los materiales de forma repetible. No se ampliaron los tiempos máximos de compilación para incorporar estas mejoras.

La validación final pasó 802 pruebas de Node y 25 escenarios de Chrome (13 de materiales/campaña, 7 de manos y 5 de transiciones). Las mediciones de los cuatro perfiles gráficos y los límites de estos ensayos están en `docs/superpowers/plans/2026-09-27-sensaciones-y-dominio.md`.
