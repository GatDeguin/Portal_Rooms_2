# Manos visibles dentro de la sala

La cámara y MediaPipe ya podían detectar manos e interactuar con el cubo, pero faltaba dibujarlas dentro del juego. Ahora una guía de 21 articulaciones muestra los mismos puntos suavizados que utiliza la física.

- Turquesa: mano abierta; dedos y palma pueden empujar.
- Amarillo: pinza cerrada. Acercá la pinza al cubo para agarrarlo.
- Verde y una línea hasta el cubo: agarre confirmado. Abrí la pinza para soltar.
- La línea punteada hasta el suelo ayuda a ubicar altura y profundidad.

La guía se proyecta con la perspectiva y distorsión de lente de la sala. Cuando el render usa un worker, recibe la cámara y el cubo del fotograma presentado para mantener la alineación incluso si hay imágenes en espera. La guía permanece visible a través de obstáculos para facilitar la orientación; la física sigue resolviendo las colisiones. Al perder la mano, pausar o desactivar la cámara, el dibujo se elimina.

## Diagnóstico de cámara

Los estados de descarga, permiso y reproducción, además de los errores, aparecen dentro del menú y los ajustes. Una webcam desconectada muestra un aviso específico para conectarla y reintentar. El arranque se puede cancelar; si el vídeo no comienza en 15 segundos se detiene el stream y se permite reintentar. El permiso pendiente puede cancelarse desde la interfaz sin iniciar una cámara tardía.

## Verificación

- Pruebas unitarias de proyección en horizontal, vertical, movimiento reducido y cambio de tamaño; coincidencia entre dedos dibujados y contactos físicos; metadatos asociados al bitmap presentado.
- Regresión DOM/Canvas con entrada controlada: agarre real del motor, soltado, pérdida de señal, desaparición de píxeles, cancelación y errores visibles. El shader y la inferencia se simulan en esta suite.
- `npm run test:hands`: Chrome con WebGL y MediaPipe reales; primero usa la cámara sintética del navegador, después un flujo de vídeo de una [imagen del ejemplo oficial de Google](https://github.com/google-ai-edge/mediapipe-samples/blob/main/examples/hand_landmarker/python/hand_landmarker.ipynb). Comprueba calibración, 21 articulaciones, píxeles de la mano, vista vertical, pérdida, pausa y cierre de cámara. No usa la webcam física.

La prueba online requiere Chromium, Playwright y conexión a los CDN de MediaPipe y a la imagen oficial. Se pueden indicar las rutas con `--browser` y `--playwright`; genera capturas e informe en `test-results/hand-mediapipe/`.
