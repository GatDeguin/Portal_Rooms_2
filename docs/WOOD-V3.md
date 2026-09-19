# Madera V3 y revisión de diseño

Base: `18a05a1da74d56603924407db393d08c67eaf309` (Materiales V2, 42 salas y cambio de calidad asíncrono).

## Cambio implementado

Solo `src/shaders.js` cambia el runtime, en las funciones de madera del suelo y de rampas/plataformas. La veta regular se reemplaza por un campo compartido de crecimiento curvo: corte virtual de anillos, variación por tabla, fibras longitudinales y poros dispersos. Pigmento, rugosidad y microrelieve responden a la misma estructura, con barniz satinado seco. Las juntas conservan sus posiciones; la madera de plataformas usa coordenadas locales y orientación de canto.

`woodRingFilter()` integra bandas periódicas para conservar su cobertura media cuando no se resuelven. `woodBoardCoordinates()` mantiene una identidad estable por tabla. `woodAnatomy()` comparte las señales entre las dos familias. No hay texturas externas, nuevos uniforms ni nuevos pasos de ray marching/reflexión. Se mantienen los cuatro presupuestos de calidad y el límite de detalle mediump.

Es una aproximación ligera orientada a mayor realismo, no una simulación completa de un árbol, un modelo medido de una especie ni un BRDF de fibras subsuperficiales. No se cambió la luz/exposición para mejorar artificialmente la comparación.

## Preservado

Sin cambios en las 42 definiciones, física, geometría, cámara, controles, progreso, Worker, cancelación de calidad ni UI. Siguen pasando los hashes protegidos de Materiales V2 y las guardas de todas las SDF y `cameraRay()`. Dos guardas nuevas preservan también los bloques de evaluadores no relacionados con madera.

## Verificación repetida

- `npm test`: 437/437, sin fallos ni omitidos.
- `npm run check`: 17 módulos y 132 IDs HTML.
- `python3 tests/wood_egl.py`: 26 comprobaciones nativas sobre 19 imágenes diagnósticas; seis combinaciones de perfil/precisión y un probe de filtrado.
- `npm run test:materials`: 30 diagnósticos nativos sobre 23 imágenes.
- `npm run test:render`: 16 variantes compiladas/enlazadas; 126 capturas highp de escenas del catálogo de 42 salas.
- `npm run test:quality`: 17/17; Workers reales con compilador WebGL lento simulado.
- `npm run test:ui`: 40/40; WebGL simulado.
- `npm run test:experience`: 80/80 recorridos DOM, teclado/stick y ambas gravedades; WebGL simulado.
- `npm run test:course`: 275/275 recorridos de expansión con replay independiente.
- `npm run test:static`: 19/19 recursos HTTP.

El test de madera se observó fallar antes de implementarla. Un umbral inicial del diagnóstico exigía canales lineales >=0,03 y rechazaba pigmentos marrones válidos: se corrigió a [0,0,65], sin iluminar el material para satisfacerlo. Las imágenes diagnósticas sí ejecutan las funciones GLSL de producción.

La primera ejecución larga del render y una ejecución de experiencia agotaron el límite de tiempo de la herramienta; ambas se repitieron completas y finalizaron correctamente. No se contaron como aprobación las ejecuciones interrumpidas.

## Comparación y rendimiento

Comparación de laboratorio con idéntica cámara, estado y 768x432. Mesa/llvmpipe por CPU, cuatro hilos, cinco dibujos calientes por imagen, ejecución serial y caché habilitada: Baja 74,24 -> 80,80 ms; Cinemática 185,61 -> 190,89 ms. Son dos muestras de escena, no una mejora universal de rendimiento ni FPS de GPU. La apariencia nueva tiene coste; no se promete que sea gratuita.

Se mantienen pendientes GPU y teléfonos físicos, la matriz completa de escenas mediump y el máximo presupuesto de 3,2 MP. El arreglo de calidad permanece, pero su fallback antiguo sin Worker/KHR conserva las limitaciones documentadas.

## Auditoría de game design (propuestas, no cambios a niveles)

La entrega separada contiene 42 fichas, 20 propuestas por sala (840 textos únicos) y 20 acciones globales. Se distinguen game design, level design, riesgos, prioridad y ámbito. No se aplicaron esas propuestas ni se añadieron objetivos ocultos.

`node tests/design-audit-probes.mjs [directorio-salida]` reproduce ocho desvíos que evitan la mecánica anunciada: salas 6, 7, 9, 10, 12, 16, 19 y 28. Todos se completaron y reprodujeron con ambas gravedades (16/16), solo mediante inputs. Los tiempos del piloto no miden dificultad humana ni récords óptimos.

La sala 31 mantiene solapamiento longitudinal `1.4 - 1.2 * abs(sin(0.65*t))`, entre 0,2 y 1,4; comprobado en 10.001 instantes. Siempre hay alguna conexión geométrica, lo cual no implica un paso cómodo para la huella completa del cubo en todas las fases. Debe decidirse si se diseñan verdaderas ventanas o se enseña ancho variable. Los aros de 17 y 22 también necesitan revisión visual de soporte (diámetro exterior de 1,03 frente a anchos de 0,92 y 0,85).

La recomendación global es alinear la habilidad enseñada y la solución efectiva, conservar alternativas deliberadas y validar recuperación antes de añadir dificultad. No se ha realizado un playtest humano de toda la campaña.

## Referencias

Contexto de materialidad, no modelos íntegramente implementados:
- Marschner et al., Measuring and Modeling the Appearance of Finished Wood (2005): https://www.cs.cornell.edu/~srm/publications/SG05-wood.html
- Liu et al., Simulating the Structure and Texture of Solid Wood (2016): https://research.cs.cornell.edu/wood/
- MDN WebGL best practices: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
