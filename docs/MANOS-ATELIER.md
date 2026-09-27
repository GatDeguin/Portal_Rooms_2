# Manos Atelier integradas — 27 de septiembre de 2026

El modo **Jugar con manos 3D** usa la malla continua, la textura de piel/uñas y las 20 transformaciones de Mano Atelier v03 aportado por el usuario. Las 21 posiciones del seguimiento existente animan la palma, los dedos y el pulgar. La pinza, el empuje y los menús conservan sus controles.

## Render

- Malla y textura locales en `assets/hands/`, cargadas al activar el modo. No se incorpora el visor, el worker ni el seguimiento del HTML de referencia.
- Capa WebGL2 con prueba de profundidad. El cubo, las paredes, obstáculos, plataformas, rampas y bumpers ocultan las manos cuando están delante.
- Mapa de sombras de 1024 × 1024 desde la luz principal del techo, con filtrado suave. Las siluetas se proyectan sobre la geometría de la sala y sobre las propias manos.
- Los receptores fijos se conservan con una clave basada en la geometría, resistente a las copias del worker. Solo se regeneran los objetos móviles al avanzar el tiempo. La prueba local de caché midió 0,0084 ms por actualización de una sala fija tras la primera carga.
- La cámara y los receptores corresponden al último cuadro presentado por el worker, incluso durante cambios de tamaño.
- La guía anterior se conserva durante la carga o si no está disponible WebGL2. Perder seguimiento o pausar elimina manos y sombras. Se liberan los recursos al salir y se reconstruyen tras recuperar un contexto WebGL.

El render usa las envolventes geométricas de la sala; no reproduce en su profundidad el microrelieve de materiales de Alta/Cinemática. No cambia la física ni añade contactos a la muñeca visible de la malla.

## Verificación

- `npm test`: 574/574.
- `npm run check`: 29 módulos, 158 IDs, sin errores.
- `npm run test:hand-render`: Chrome con WebGL real, worker real y poses de manos sintéticas. Sin usar una webcam física. Comprueba dos manos, sombras que se desplazan, desaparición completa al perder la detección, oclusión por el cubo, pausa/reanudación, vista 390 × 844 y recuperación del contexto gráfico.
- La prueba GPU registra 39.975 píxeles de sombra en la pose de dos manos y cero al retirarlas. Un cubo situado delante reduce los píxeles visibles de piel de 12.698 a 6.880.
- Sin errores de WebGL, página o consola. Capturas revisadas en escritorio y vertical.

La prueba de navegador requiere Playwright y Chromium/Chrome. Se pueden indicar `PLAYWRIGHT_MODULE` y `CHROMIUM_PATH`. Genera `test-results/atelier/browser.json` y capturas en esa carpeta. El seguimiento físico de una webcam queda pendiente de prueba con el usuario.

Se actualizaron solamente las huellas de `src/app.js` (limpieza del render de manos) y `src/renderer-worker.js` (transporte de receptores de sombra) en la guarda existente de estabilidad; el resto de huellas conserva sus valores.
