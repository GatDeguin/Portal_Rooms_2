# Corrección: cambio de calidad sin bloquear el menú

Base: `f712fdfaddb7c44fc748dee3263bb2ee39fd2fe7` (campaña de 42 salas).

## Causa y corrección

El evento `input` del selector llamaba a `Renderer.setQuality()` y consultaba inmediatamente `COMPILE_STATUS` / `LINK_STATUS`. Esas consultas pueden esperar al compilador del controlador en el mismo hilo que atiende el menú. Además, cualquier cambio invalidaba y dibujaba de nuevo la escena completa detrás de Ajustes. Las pruebas anteriores simulaban una compilación instantánea y no detectaban este bloqueo.

Ahora el evento `change` inicia una preparación transaccional. La interfaz muestra el estado y permite cancelar o volver. La selección solo se guarda después de preparar correctamente el perfil. Cambios posteriores, cancelación y salidas de Ajustes no pueden aplicar una respuesta obsoleta.

En navegadores compatibles, el MISMO `Renderer` WebGL 1/SDF ejecuta su trabajo en un Worker sobre OffscreenCanvas. La física, los controles, la interfaz y los guardados siguen en el hilo principal. Se prepara un segundo contexto candidato y se realiza un primer dibujo de 2×2 píxeles, porque algunos controladores difieren trabajo hasta el primer draw. Solo tras esa preparación se sustituye el proceso gráfico anterior. Si falla, se cancela o supera 12 segundos, el anterior sigue disponible. Los workers descartados se terminan; hay como máximo un render activo y un candidato.

La imagen visible se presenta mediante `bitmaprenderer`. El transporte aplica contrapresión: un frame en vuelo y, como máximo, el último pendiente. Las imágenes obsoletas se liberan. Pausar descarta los frames pendientes y suspende la vigilancia de un dibujo mientras la pestaña no está activa. Ajustes no fuerza nuevos dibujos de la escena a resolución completa.

Si el Worker no está disponible, se conserva WebGL 1 en el hilo principal y se usa `KHR_parallel_shader_compile` cuando existe: no se consultan estado de enlace ni ubicaciones de uniforms antes de completar la compilación. La ruta AUTO de ese fallback también prepara los shaders antes de adoptarlos. Se cachean los límites del viewport y se conserva el cache de programas.

**Límite de compatibilidad:** sin Worker/OffscreenCanvas utilizable y sin KHR, WebGL no ofrece una consulta de enlace garantizada no bloqueante. En esa ruta antigua se cede antes el control al navegador, pero aún puede haber una pausa del controlador. No se promete eliminarla en hardware no probado.

Si una calidad guardada realmente falla durante la preparación inicial del Worker, el arranque de compatibilidad usa Baja y lo notifica. No se vuelve a compilar ese perfil costoso sobre el hilo de la interfaz. La falta de Worker por sí sola no borra la calidad guardada.

## Preservación

Sin cambios en los dos catálogos de niveles, `campaign.js`, `physics.js`, `geometry.js`, `input.js`, `storage.js`, `quality.js` ni `shaders.js`. Se mantienen los cuatro perfiles, sus presupuestos, la cámara y las reglas de las 42 salas.

La exportación de fixtures anterior y posterior es idéntica: 16 variantes de fragment shader, vertex shader y todos los uniforms de 126 estados. Esto prueba igualdad de entradas del renderer, no una nueva validación visual en GPU.

## Pruebas ejecutadas

- `npm test`: 413/413, cero fallos y cero omitidos.
- `npm run check`: 17 módulos, 132 IDs únicos; correcto.
- `npm run test:quality`: 17 comprobaciones en Chromium con Workers reales y un controlador WebGL simulado lento. Cubre respuesta del menú, cancelación, fallo, timeout, cambios sucesivos, preservación de guardados, vuelta a la partida, móvil y fallback KHR.
- `npm run test:ui`: 40/40; WebGL simulado.
- `npm run test:experience`: 80/80 recorridos por los manejadores DOM de teclado/stick y ambas gravedades; WebGL y planificación del reloj adaptados explícitamente.
- `npm run test:course`: 275/275 recorridos de expansión y replay independiente de inputs.
- `npm run test:static`: 19 recursos HTTP, incluyendo el módulo del Worker y sus dependencias; MIME y bytes correctos.

Se observaron fallos RED antes de las correcciones: consultas síncronas de compilación, ausencia de transacción en Worker, espera del menú, suspensión de frames y cobertura HTTP del entrypoint. La suite antigua de navegador ahora espera el fin de la transacción antes de verificar el guardado. El replay de experiencia espera el arranque por temporizador, no por el RAF que su propio adaptador congela deliberadamente; no se relajaron los asserts de resultados de las salas.

El Chromium disponible no expone WebGL real. No se afirma una prueba de la GPU o teléfono del usuario ni se confunde el compilador simulado con una medición de rendimiento físico.

## Referencias de API

- Khronos: KHR_parallel_shader_compile, consulta no bloqueante y limitación sin extensión.
- MDN: WebGL best practices, consultas bloqueantes y compilación paralela.
- MDN: OffscreenCanvas, Workers y transferencia de ImageBitmap.
