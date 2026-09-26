# Menús con la mano

Con la cámara y las manos activadas, el seguimiento continúa en el inicio, pausa, selección de salas, ajustes, ayuda y pantallas de nivel/campaña completados. La sala queda pausada y no se dibujan nuevos fotogramas 3D mientras se usa el menú.

- Mové la mano para llevar el cursor al control: se resalta en turquesa.
- Juntá índice y pulgar para pulsarlo una vez. Abrí la pinza antes de otro clic.
- La pinza que venía agarrando el cubo no pulsa una opción al terminar el nivel. Hay que abrirla primero. Lo mismo se aplica al cambiar de menú, perder la mano o recuperar el foco.
- Una mano controla el cursor. Otra mano no toma el control mientras la primera siga detectada.
- En barras de ajustes, mantené la pinza y arrastrá horizontalmente. En listas de opciones como calidad, cada pinza elige la siguiente opción; el mensaje del cursor lo indica.
- Mantené la mano abierta en el borde superior o inferior para desplazar menús largos. Con manos activas, todos los capítulos se distribuyen en filas para poder alcanzarlos también en móvil.

El cursor y el contorno se dibujan sobre el diálogo nativo mediante un popover manual que no captura el mouse ni el foco. Las coordenadas de menú provienen de la imagen espejada de la webcam, independientemente de la posición limitada de la mano dentro de la sala. La zona central del 80% de la cámara permite alcanzar toda la pantalla.

La pantalla completa exige activación directa del navegador: al señalarla se explica que hay que usar clic, toque o Enter. La pinza enfoca ese botón para poder usar Enter sin intentar una llamada que sería rechazada.

## Pruebas

- `node --test tests/hand-menu.test.js tests/hand-lifecycle.test.js`: una sola pulsación por pinza, apertura obligatoria entre diálogos, pérdida/cambio de mano, posiciones de menú y ciclo de cámara.
- `npm run test:hand-menu`: Chrome con landmarks y vídeo sintéticos, procesador real de HandTracking y DOM real. Comprueba pausa sin avance físico, Next tras completar un objetivo, ajustes, pérdida de seguimiento/foco, confirmación de borrado, capítulos móviles y desplazamiento continuo. WebGL e inferencia se simulan explícitamente.
- `npm run test:hands`: modelo MediaPipe y WebGL reales con cámara sintética y la imagen oficial de manos. Incluye ver el cursor por encima del diálogo de pausa. No utiliza una webcam física.

Las pruebas de navegador aceptan `CHROMIUM_PATH`; la prueba online permite además `--browser` y `--playwright`. Capturas e informes quedan en `test-results/hand-menu/` y `test-results/hand-mediapipe/`.
