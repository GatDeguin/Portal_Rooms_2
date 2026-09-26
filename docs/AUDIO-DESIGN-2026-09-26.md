# Dirección sonora: Resonancias de la sala

Brief asumido a pedido del usuario: rediseñar por completo música, ambiente, foley y efectos para que el cubo se sienta físico, los objetivos se entiendan por sonido y la campaña tenga identidad propia. Ciencia ficción cálida, íntima y táctil; sin voces ni material musical de terceros.

## Composición y mezcla

Música original generada con Web Audio: armonías suspendidas, acordes de novena, teclas suaves, un motivo reconocible y pulsos discretos. Ocho arreglos acompañan los capítulos, con variación por frases y capas que reaccionan al movimiento y al progreso. Menús más espaciosos; resolución armónica al completar una sala. La música deja espacio a los contactos y baja suavemente durante las señales importantes.

Foley por superficie: madera resonante, alfombra amortiguada, plataforma metálica, rampas, deslizamiento de hielo, freno viscoso y aceleración energética. El roce responde a velocidad y contacto real; se calla en el aire y al pausar. Golpes con variaciones de tono y fuerza, agarre y liberación por manos, salto y rebote, carga del aro, proximidad del portal y mecanismos móviles. Paneo moderado izquierda/derecha, ambiente estéreo y reverberación corta compartida.

Mezcla: volumen general compatible con el guardado existente; música, ambiente y efectos independientes. Modo nocturno para reducir el contraste, salida mono opcional, prueba de sonido dentro de Ajustes. Cambios suavizados, límite de voces y techo de salida. Una sola instancia de AudioContext, sin red, dependencias ni descargas de audio. Inicio solo tras interacción; pestaña oculta o sin foco: silencio y suspensión; vuelta: reanudación explícita. Las pausas voluntarias conservan música de menú y detienen el foley.

## Implementación

- audio-score.js: composición, notas y variantes por capítulo.
- audio-synth.js: instrumentos, texturas, efectos y administración de voces.
- audio.js: buses, mezcla, planificador y lectura de la simulación.
- app.js: estado de pantalla, eventos, foco y acciones de interfaz.
- storage.js, ui.js, index.html: preferencias y controles.

La física, niveles, shaders, controles de manos y progreso no cambian. El audio observa la simulación; nunca la modifica.

## Validación

Pruebas de normalización y compatibilidad del guardado, planificación musical y observación de superficies; render PCM con OfflineAudioContext real para medir señal, picos, silencio, estéreo y variantes; navegador con AudioContext real para menús, transición, mezcla, mute, pérdida de foco, limpieza y recuperación. Capturas de Ajustes en escritorio y móvil. Suite completa, contratos actualizados solo en archivos revisados, regresiones de manos y comprobaciones estáticas antes de publicar una PR.

## Detalles de la entrega

El mezclador tiene tres buses de categoría, envíos a una reverberación de sala de 1,65 s, filtro subsónico, compresión y saturación suave para el techo de salida. Al bajar una categoría quedan sus colas naturales breves; el silencio general limpia todas las voces y colas. Mono se aplica después de la reverberación. La mezcla nocturna compensa expresamente la ganancia automática del compresor.

El planificador usa el reloj de audio, anticipa 240 ms y descarta notas atrasadas tras una interrupción. Máximo 56 voces, con prioridad para señales de juego. Cada voz elimina sus nodos y conexiones al acabar; salir de Ajustes cancela las notas futuras de la muestra. Suspender aplica un fundido corto, cancela el planificador y libera las fuentes; una nueva interacción cancela la suspensión pendiente.

Validación realizada en Chrome de escritorio: 52 comprobaciones de audio con Web Audio real, incluyendo 8 arreglos musicales y 7 familias de contacto renderizadas a PCM; silencio, techo de señal, estéreo/mono, dinámica nocturna, pérdida de foco, cambios rápidos de mute, muestra cancelable y mezcla persistente. Hay regresiones de interfaz y manos, y revisión independiente sin hallazgos pendientes. Las capturas y WAVs están en test-results/audio. No se afirma una escucha subjetiva ni pruebas de hardware, Safari/iOS o rendimiento sostenido de móviles.

Referencias de API usadas: [AudioContext.resume](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume), [OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext) y [automatización de parámetros](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/cancelAndHoldAtTime). El fallback conserva continuidad cuando cancelAndHoldAtTime no está disponible.
