# Portal Room — Crimson Cinematic Ultra

## Estado de entrega

Implementación visual sobre el runtime activo de `32573266071065b15969f183d0721c507a3f3e2a`. Se entrega para revisión, **no como validación integral terminada**: `test:course` y `test:experience` apuntan a archivos que faltan en ese commit. Tampoco fue posible validar WebGL real en el navegador de este entorno. No se cambiaron esas suites por pruebas menos exigentes ni se sustituyeron los niveles activos por los duplicados de la raíz.

La aplicación conserva `index.html -> src/app.js`, WebGL 1, GLSL ES 1.00, fullscreen triangle, SDF y una sola pasada. `package.json` y las dependencias de ejecución no cambian. Para ejecutarla: `python3 -m http.server 8080`. En Ajustes > Imagen, seleccionar **Cinemática**. Automática nunca la selecciona.

## Cambios implementados

- **Materiales e iluminación:** Fresnel Schlick, distribución GGX, geometría Smith, separación difusa/especular y conservación de energía aproximada. Pigmentos convertidos a lineal antes de iluminación HDR, emisión, exposición, ACES y salida gamma. Rig cálido con relleno frontal frío y acento lateral. No es un renderer PBR de referencia.
- **Cubo y superficies:** detalle del cubo anclado a su quaternion; microarañazos, variación de rugosidad, desgaste de bordes y clearcoat moderado en Alta/Cinemática. Tablas cálidas con juntas y variación individual; alfombra mate; porosidad y panelado muy sutil en paredes. Todo el microdetalle está en el shading, no en la geometría de colisión.
- **Contacto e indirecta:** AO de corto alcance, contacto bajo el cubo, rebotes direccionales analíticos y contaminación cromática aproximada. Cinemática añade un único sondeo secundario corto de hasta tres pasos. No es GI completa ni ray tracing de hardware.
- **Sombras:** marcha SDF con penumbra y sesgo sobre la normal geométrica. Se corrigió un defecto previo de anillos concéntricos: la envolvente convexa de la sala y los emisores no se tratan como falsos bloqueadores de penumbra; siguen participando en el avance seguro y en las intersecciones duras.
- **Reflexiones:** Fresnel, rugosidad, cono fijo, filtrado de detalle y caída con distancia. Cinemática usa dos sondeos deterministas. Los emisores lineales demasiado finos para ese cono se sustituyen gradualmente por una respuesta ambiental analítica amplia, evitando el contorno quebrado de las luminarias sobre la madera. No es una convolución físicamente exacta.
- **Atmósfera y portal:** integración de extinción y dispersión por altura dentro de la habitación, anisotropía aproximada, polvo procedural tenue y spill local. El portal tiene capas de energía con profundidad virtual/parallax y distorsión procedural; no se añadió un volumen geométrico refractivo ni refracción física.
- **Estabilidad:** footprint del rayo, atenuación de octavas y líneas filtradas. `fwidth` se habilita solo si el renderer obtiene `OES_standard_derivatives`; existe ruta sin extensión. Dither estático muy fino, sin grano aleatorio por fotograma. Esto filtra materiales, no garantiza antialiasing completo de siluetas.
- **Interfaz y accesibilidad:** paneles más neutros y menos glow, texto HTML sin postprocesado, foco visible y pestañas de ajustes accesibles con flechas/Home/End. Se conectó la pestaña Imagen, inaccesible con el runtime activo anterior. Se guarda `effects`; movimiento reducido anula la cámara dinámica y decoración incluso con preferencias guardadas. El tiempo físico y las plataformas móviles no se congelan al apagar efectos.

Cuatro estados lumínicos sutiles se seleccionan únicamente en el renderer por rangos de salas. El `src/levels.js` activo no expone metadatos de capítulo; no se importó la lógica de los archivos duplicados ni se alteró la progresión.

## Presupuestos máximos

| Perfil | Píxeles | DPR | Marcha | Sombra | AO | Reflexión (pasos x sondeos) | Niebla | Octavas |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Baja | 360 000 | 1.0 | 88 | 16 | 3 | 12 x 1 | 3 | 3 |
| Media | 760 000 | 1.4 | 112 | 28 | 4 | 24 x 1 | 5 | 4 |
| Alta | 1 500 000 | 1.8 | 136 | 44 | 6 | 36 x 1 | 8 | 6 |
| Cinemática | 3 200 000 | 2.0 | 176 | 64 | 8 | 56 x 2 | 12 | 7 |

Los presupuestos principales anteriores de Baja/Media/Alta se preservan. Baja elimina detail normals, spill de zonas, clearcoat, segunda sombra y sondeo indirecto adicional mediante constantes. Media incorpora detail normals y spill; Alta añade clearcoat, sombra de acento y visibilidad volumétrica local; Cinemática aumenta los presupuestos y añade el sondeo corto. Capas del portal: 2/3/4/6.

En `mediump` se limita el detalle a Media, el portal a tres capas y los reflejos a un sondeo, sin sondeo indirecto extra. Esa ruta compiló/enlazó, pero su validación de imagen final queda pendiente: el JIT de precisión reducida de Mesa excedió el tiempo disponible. `--draw-mediump` permite ejecutar esa matriz explícitamente; no se cuentan sus imágenes como aprobadas en esta entrega.

Automática conserva la resolución dinámica y sus umbrales previos, y solo recorre Baja/Media/Alta. Los presets manuales mantienen el comportamiento anterior de escala fija. Un cambio manual cuyo shader no compile conserva el perfil anterior y muestra un aviso, en lugar de dejar la aplicación inutilizable. No hay trabajo DOM adicional condicionado por calidad.

## Verificación ejecutada

| Comando | Resultado |
|---|---|
| `npm test` | **95/95**, sin fallos ni pruebas omitidas. La base tenía 80. |
| `npm run check` | **Correcto:** 12 módulos, 128 IDs HTML únicos. |
| `npm run test:render` | **Correcto en EGL/GLES nativo:** 16 combinaciones compiladas/enlazadas, 45 imágenes highp. Incluye las 22 salas en Baja, escenas representativas, portrait y Cinemática. |
| `npm run test:ui` | **34/34:** Chromium con import map offline, WebGL simulado explícitamente, almacenamiento y sensores de prueba. No valida render WebGL ni sensores físicos. |
| `npm run test:course` | **Falla previa:** falta `scripts/verify-course.mjs` en el commit base. El archivo de la raíz refiere a `COURSE_VERSION` y un helper ausentes en el runtime activo. |
| `npm run test:experience` | **Falla previa:** falta `tests/experience-browser.py` en el commit base. |
| `npm run test:browser` | **Bloqueado por entorno:** `getContext('webgl')` no está disponible. No se declara aprobado. |

Las nuevas pruebas verifican por SHA-256 que `src/physics.js`, `src/levels.js`, `src/geometry.js` y `src/input.js` siguen idénticos. También fijan el bloque SDF y `cameraRay()` completos, no solo dos expresiones. Se retienen `uPlat3`, proyección de rampas, bases elevadas, tamaño y transformación del cubo.

Las pruebas de imagen detectan anillos de sombra, reflejos lineales no filtrados sobre madera y subexposición del cubo. Dos renders del mismo estado físico con efectos apagados y tiempos distintos resultaron idénticos píxel por píxel. Esto no equivale a medir todo el shimmering durante movimiento.

### Mediciones y límites

Backend: **llvmpipe LLVM 19.1.7, Mesa 25.0.7-2, OpenGL ES 3.2**, con shaders GLSL ES 1.00. Comparaciones al mismo estado y 1280 x 720, mediana de cinco dibujos calientes sincronizados con `glFinish`:

| Escena | Alta anterior | Alta nueva | Cinemática |
|---|---:|---:|---:|
| Sala 1 | 376.1 ms | 332.4 ms | 376.9 ms |
| Sala 4 / portal | 409.0 ms | 358.7 ms | 427.8 ms |

Sala final Cinemática: 611.1 ms. Estas cifras describen **render por CPU en este entorno**, no FPS de GPU ni fluidez de juego. No se extrapolan a móviles ni al límite de 3.2 millones de píxeles. La compilación GLSL/enlace y el JIT diferido del primer dibujo son costos distintos. Las variantes mediump resultaron especialmente costosas para el JIT de este backend.

## Tecnologías no implementadas

No hay DLSS, reconstrucción neuronal, ray tracing de hardware, TAA/acumulación temporal, vectores de movimiento, GI física completa, bloom multipass, DOF, motion blur de gameplay, aberración cromática, texturas externas, Three.js, WebGL2 obligatorio ni WebGPU. La inspiración es perceptual; no se anuncia soporte inexistente.

## Antes de fusionar

Restaurar las suites de recorrido y experiencia **para los niveles activos**, sin alterar su física ni sustituirlas por teletransportes. Validar WebGL 1 en navegadores con GPU real, especialmente `mediump`, móviles y cambios de tamaño/contexto. Medir estabilidad durante rotación y movimiento, primer arranque y presupuesto máximo de Cinemática. Considerar después AA espacial de siluetas y mejor filtrado de reflejos solo si el costo medido lo permite.
