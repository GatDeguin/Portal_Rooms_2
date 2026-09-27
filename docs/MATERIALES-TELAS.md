# Materiales físicos y telas

La campaña conserva sus 42 disposiciones, IDs, objetivos y guardados. Los tipos internos `ice`, `brake` y `boost` se mantienen por compatibilidad, pero se presentan como agua, slime y arena. Los cambios están concentrados en `surface-physics.js`; `physics.js` continúa integrando a 120 Hz.

## Respuesta de las superficies

- **Agua poco profunda:** baja fricción y resistencia creciente con la velocidad, ondas y estela de contacto. La humedad se acumula y desaparece gradualmente después de salir. No modifica el cubo mientras vuela o está sobre una plataforma elevada.
- **Slime:** arrastre viscoso mayor a baja velocidad, adhesión que frena sin invertir la velocidad y una película temporal al salir. La inclinación deliberada permite atravesarlo. El brillo húmedo y el borde deformado acompañan el contacto.
- **Arena en movimiento:** acopla la velocidad del cubo a una corriente de dirección y velocidad configurables (`dx`, `dz`, `flowSpeed`). Amortigua el deslizamiento lateral. La fuerza máxima de corriente permite oponerse incluso con gravedad suave; el cubo no acelera indefinidamente. Los granos visuales avanzan en esa misma dirección.
- **Gelatina:** el choque comprime el bouncer sobre el eje del impacto. Un resorte amortiguado recupera su forma. La salida normal queda acotada y la velocidad tangencial pierde energía; se conserva el radio de colisión de la sala.

Son modelos de contacto y arrastre para un juego, con superficies procedurales: no son una simulación volumétrica de fluidos ni granos individuales. Las ondas y el acabado del material no alteran la geometría del recorrido. Movimiento reducido limita la decoración, preservando las fuerzas de juego.

## Telas interactivas

Hay un paño de 110 partículas en las salas 1, 6, 10, 15, 23, 30 y 38. `cloth-layout.js` define posiciones y soportes; una sala puede definir `cloths: []` para omitirlo o hasta dos paños personalizados.

`ClothSystem` utiliza integración de Verlet con restricciones de distancia, anclajes superiores, gravedad y viento suave. Resuelve contactos con el cubo orientado, palmas/dedos, suelo, paredes, obstáculos, rampas, plataformas móviles y bouncers. Las restricciones y el movimiento están acotados; la tela aporta un pequeño arrastre al cubo sin cerrar el recorrido. Las manos se reciben del sistema existente de seguimiento.

La simulación comparte reloj, pausa, reinicio y fin de nivel con el motor. El worker devuelve la misma malla y cámara que corresponden a la imagen de sala presentada, incluyendo la transformación visual del cubo durante la transición. Así una respuesta tardía no adelanta la tela respecto a su fondo.

`ClothRenderer` dibuja tela, costuras y soportes mediante una capa WebGL2, con profundidad de la sala y sombras. Reutiliza los receptores de las manos: el cubo y los sólidos ocultan la tela, y las manos respetan su profundidad. La capa se ajusta al rectángulo real del escenario y reconstruye sus recursos al recuperar el contexto. Si WebGL2 no está disponible se omite esa capa sin bloquear el juego base.

## Verificación

- `npm test`: fuerzas, límites, independencia de FPS, contactos, pausa/reinicio, anclajes, snapshots, corrientes y recuperación de gelatina; también la campaña y los controles existentes.
- `npm run check`: sintaxis, imports y referencias del HTML.
- `npm run test:living-materials`: Chrome con WebGL real y worker de sala, capturas de agua, slime, arena, impacto/recuperación de gelatina y tela en escritorio/móvil. El test posiciona el cubo y alimenta manos sintéticas para repetir los contactos; no abre una webcam ni demuestra seguimiento físico real.
- `npm run test:transitions` y `npm run test:hand-render`: regresiones visuales de las funciones incorporadas previamente.

Los informes y las capturas se guardan en `test-results/`. Las pruebas de Chrome admiten `CHROMIUM_PATH` y `PLAYWRIGHT_MODULE`.

La compilación calcula la deformación afín de gelatina una vez por frame en CPU. Baja y Media utilizan campos analíticos para ondas y bultos; Alta y Cinemática conservan el detalle procedural completo. Los receptores de profundidad de manos y telas siguen esa misma forma. Las calidades manuales preparan solo el programa solicitado; Automática conserva sus programas de respaldo. No se ampliaron los tiempos máximos de preparación.

### Validación gráfica del 27/09/2026

Chrome con WebGL real, GPU RTX 3060 Ti/D3D11 y worker de producción: Baja, Media, Alta y Cinemática produjeron imágenes válidas sin errores ni advertencias. Se verificó también la promoción automática de Baja a Media. La prueba integrada de materiales pasó 9 escenarios, incluida la recuperación de contexto; la tela móvil produjo 5642 píxeles visibles y coincidió exactamente con el rectángulo del escenario.

Las pruebas usan contactos y posiciones reproducibles. Los tiempos de preparación observados dependen del dispositivo y de la caché; no son un benchmark de teléfonos. Los archivos `test-results/living-materials/browser.json` y `worker-*.json` conservan los resultados y las capturas asociadas.

Resultado final: **640/640 pruebas Node aprobadas**, sintaxis e imports de 35 módulos correctos y diff sin errores de whitespace. Las regresiones Chrome de manos Atelier y transiciones también pasaron, sin errores de página ni consola.
