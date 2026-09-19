# Portal Room — Materiales V2

Implementación sobre `0c27fb13bf1a0ae42ed96358aebd1e5472f83a47`, que ya incluye 42 salas y la corrección del bloqueo al cambiar calidad. Este documento describe código y pruebas ejecutadas; no certifica rendimiento en la GPU del jugador. La publicación remota se confirma por separado con el PR y el despliegue de Pages.

## Alcance implementado

El único archivo de ejecución modificado es `src/shaders.js`. Continúan WebGL 1, GLSL ES 1.00, fullscreen triangle, SDF procedural, una pasada y cero dependencias de ejecución. No hay nuevas texturas ni nuevos uniforms.

Se separaron 17 evaluadores: madera, alfombra, arquitectura, cubo, obstáculos, objetivos verde/azul/aro, luminarias, zócalos, portal, hielo, freno, impulso, plataformas/rampas, pad y bumper. `material()` conserva su interfaz anterior; el shading principal utiliza `surfaceMaterial()` una sola vez y obtiene pigmento, rugosidad, especular, emisión, capas y normal.

La respuesta de capas compacta expresa cobertura metálica, peso del barniz, rugosidad del barniz y brillo difuso de fibra. La pintura intacta es dieléctrica: el sustrato metálico aparece únicamente mediante máscaras de desgaste. No se asigna metalness intermedio a toda superficie pintada.

### Materiales

- **Cubo:** pintura roja industrial, variación de acabado, arañazos filtrados, desgaste escaso de borde y barniz con rugosidad independiente. El detalle gira y se traslada con el cubo. La cobertura metálica media medida en el diagnóstico frontal de desgaste es 0,0021; el máximo es 0,161. Son valores de esa máscara, no porcentajes medidos sobre toda la superficie del objeto.
- **Madera del suelo:** tablas con identidad determinista, extremos escalonados, juntas integradas analíticamente, veta longitudinal y poro. Barniz satinado tenue en Alta/Cinemática; no se busca una superficie mojada. La rugosidad base ronda 0,53.
- **Alfombra:** tejido oscuro mate, borde, puntadas filtradas, relieve de fibra y respuesta difusa rasante. Rugosidad base 0,96; sin un reflectionProbe específico.
- **Paredes/techo:** variación mineral lenta y discreta, juntas sutiles y poros de acabado. Se conserva la paleta de la habitación; la rugosidad ronda 0,86.
- **Obstáculos y zócalos:** pintura industrial, microestructura direccional y desgaste acotado; zócalo con respuesta de metal cálido. Los obstáculos móviles conservan su textura en coordenadas propias.
- **Rampas/plataformas:** madera o laminado estructural, veta local y estratos en los cantos; rugosidad base 0,59. La textura acompaña a los transportes.
- **Zonas:** hielo visualmente liso con microestructura tenue; freno violeta gomoso y mate; impulso naranja con superficie física y chevrones emisivos separados. Se conservan colores, límites y dirección funcional.
- **Pads y bumpers:** los anillos del pad están centrados en cada pad, no en el origen de la sala. El bumper separa cuerpo pintado, collar mate y banda emisiva. No cambia la fuerza ni la activación de ninguno.
- **Objetivos/portal:** marcas y emisión local sobre una base material; aro con progreso angular y subdivisiones. El marco del portal tiene respuesta propia y menor emisión que el núcleo. Se conservan las capas de profundidad virtual del portal; no se implementa refracción física.

## Estabilidad y coste

`materialCoordinates()` resuelve el objeto usando los uniforms existentes solamente al evaluar la superficie visible; no agrega ese trabajo dentro de cada paso de `mapScene()`. Los índices de slot suministran semillas estables para plataformas y obstáculos móviles.

`filteredStripe()` integra líneas periódicas sobre el tamaño proyectado del píxel. Cuando no se resuelven, conserva su cobertura media en vez de producir parpadeo. `materialNoise()` obtiene valor y gradiente analítico de los mismos cuatro hashes. `microRelief()` utiliza hasta tres bandas y transfiere parte de la variación normal no resuelta a la rugosidad.

La capa de barniz tiene un lóbulo directo propio y atenúa el sustrato tanto a la entrada como a la salida. La reflexión secundaria comparte un único cono entre base y barniz: es una aproximación económica, no un material multicapa físicamente exacto. Los impactos secundarios usan pigmentos/emisiones medios de cada familia; ya no vuelven a evaluar todo el grafo de microdetalle. Las plataformas ahora pueden recibir esa reflexión, sin aumentar los máximos de pasos ni de muestras por píxel.

No se cambiaron resolución, DPR, octavas globales, pasos SDF, sombras, AO, niebla ni sondeos de los perfiles. El nuevo detalle se controla con `DETAIL_LEVEL` existente, no con una explosión de variantes.

| Característica en highp | Baja | Media | Alta | Cinemática |
|---|---|---|---|---|
| Color, acabado y señales funcionales | Sí | Sí | Sí | Sí |
| Bandas de micro-normal | 0 | 1 | 2 | 3 |
| Barniz del cubo | No | Básico | Independiente | Independiente |
| Arañazos/desgaste detallado | No | Borde simplificado | Sí | Sí |
| Poro extra de madera/arquitectura | No | No | Sí | Sí |
| Reflexiones máximas | 12 × 1 | 24 × 1 | 36 × 1 | 56 × 2 |

En `mediump` se mantiene el límite previo de detalle 1: los perfiles no activan tres bandas ni las máscaras de Alta cuando no hay precisión suficiente. Automática sigue sin elegir Cinemática.

## Corrección numérica detectada al validar mediump

La ejecución nativa en baja precisión reveló intersecciones perdidas en paredes: un incremento de marcha inferior a la precisión representable de la distancia acumulada dejaba de avanzar antes de alcanzar la tolerancia fija de 0,001. No era un defecto de las normales; escalarlas no solucionó el diagnóstico.

La marcha principal `mediump` acepta ahora `max(SURF_DIST, t * 0.0012)` como tolerancia. La ruta `highp` conserva la tolerancia anterior. En el diagnóstico final no se perdió ninguna de las 8.789 muestras de pared de referencia; el caso anterior perdía miles. Esta es una mejora de robustez numérica, no una modificación de la SDF, de la cámara ni de las colisiones. La precisión de intersección portátil sigue siendo inferior a highp.

## Preservación y cambio de calidad

Los tests verifican hashes idénticos de 16 archivos de ejecución, incluidos ambos catálogos, física, geometría, controles, almacenamiento, campaña, renderer, cliente Worker, Worker, calidad, aplicación, UI, audio, HTML y CSS. También siguen pasando los guardas originales de `mapScene()`, todas las SDF y `cameraRay()`.

No se modificó la corrección del PR #3: preparación de calidad en candidato, cancelación, timeout, guardado solo tras éxito y ausencia de redibujados completos detrás de Ajustes. Las pruebas con compilador lento simulado se repitieron. La ruta antigua sin Worker ni KHR puede seguir pausando en el controlador; no se afirma compatibilidad perfecta con hardware no probado.

## Verificación ejecutada

| Comando o prueba | Resultado |
|---|---|
| Base antes de modificar | 413/413 tests |
| Refactor sin cambio visual | 7/7 imágenes idénticas píxel por píxel |
| `npm test` | 434/434; cero fallos y cero omitidos |
| `npm run check` | 17 módulos, 132 IDs HTML |
| `npm run test:materials` | 30 comprobaciones sobre 23 imágenes de diagnóstico nativo |
| `npm run test:render` | 16 combinaciones compiladas/enlazadas y 126 capturas highp; catálogo de 42 salas |
| Laboratorio de materiales | 4 perfiles highp y 12 poses sucesivas de cubo; cámara original |
| Render mediump explícito | Baja y Cinemática, laboratorio a 256 × 144 |
| `npm run test:quality` | 17/17; Workers reales y WebGL lento simulado |
| `npm run test:ui` | 40/40; WebGL simulado |
| `npm run test:experience` | 80/80 recorridos DOM; WebGL simulado |
| `npm run test:course` | 275/275 recorridos y replay independiente |
| `npm run test:static` | 19/19 recursos HTTP y bytes/MIME correctos |

Los diagnósticos ejecutan funciones del shader real, no una reimplementación JavaScript. Verifican rangos finitos, normales, orden de rugosidad, pintura dieléctrica, barniz independiente, textura anclada, medias de filtrado y energía reflejada aproximada. La prueba de invariancia produce error máximo de cero bytes en cinco familias bajo los movimientos elegidos.

La integración de iluminación hemisférica usa 4.096 direcciones y enteros highp en el shader de prueba. La reflectancia máxima observada fue 1,043 para el caso dieléctrico, 0,965 para el barnizado y 0,776 para el metálico. La tolerancia de aceptación es 1,07; no se afirma conservación de energía exacta. Las escenas normales mantienen sus asserts de contraste: solo los probes declarados `diagnostic` pueden ser intencionadamente uniformes.

Los estados/uniforms de las 126 escenas y el vertex shader coinciden con la base. Las capturas del laboratorio son un escenario exclusivo de validación, no una sala añadida a la campaña. Los doce fotogramas sirven para inspección de detalle en movimiento; no constituyen una métrica completa de shimmering ni una prueba humana.

## Medición de rendimiento: software, no GPU

Backend: llvmpipe LLVM 19.1.7, Mesa 25.0.7-2, EGL/GLES. Comparación serial antes/después, cuatro hilos de llvmpipe, misma cámara y resolución, mediana de cinco dibujos calientes. La caché del controlador estaba habilitada; estos datos no miden arranque en frío ni rendimiento móvil.

| Escena/perfil | Resolución | Antes (ms) | Materiales V2 (ms) |
|---|---|---:|---:|
| Sala 15 / Media | 384 × 240 | 25,13 | 24,49 |
| Sala 4 / Cinemática | 384 × 240 | 45,93 | 43,61 |
| Cubo y madera / Cinemática | 1280 × 720 | 381,67 | 388,53 |
| Sala 34 / Alta | 512 × 320 | 87,61 | 68,93 |
| Final 42 / Cinemática | 768 × 480 | 239,92 | 243,53 |

No hay una mejora de rendimiento universal: dos muestras son ligeramente más lentas y otras más rápidas. No extrapolar a GPU ni al máximo de 3,2 millones de píxeles. El coste de compilación de otro controlador y su primer dibujo debe validarse en el dispositivo real.

## Reproducir

El juego conserva su ejecución estática: `python3 -m http.server 8080`. No necesita npm install. Para las pruebas: Node.js 22+, Python, Mesa/libEGL y `python3 -m pip install Pillow numpy playwright`; Chromium para los tests de navegador.

```sh
npm test
npm run check
npm run test:course
npm run test:static
npm run test:materials
npm run test:render
npm run test:quality
npm run test:ui
npm run test:experience
node tests/export-material-showcase.mjs > /tmp/material-showcase.json
python3 tests/shaders_egl.py --packet /tmp/material-showcase.json --output test-results/showcase --benchmark 5
```

Para generar también la matriz completa de escenas mediump: `python3 tests/shaders_egl.py --draw-mediump`. Esa matriz completa NO se cuenta como ejecutada en esta entrega; se ejecutaron los dos perfiles y diagnósticos indicados. Mesa puede tardar mucho en compilar/JIT esas variantes.

## Límites y decisiones

El Chromium disponible no expone WebGL real; las pruebas de interfaz no validan la imagen de una GPU. Falta validación física de GPU/teléfonos, todas las escenas mediump, máxima resolución y dificultad humana. Se conserva la imagen de juego nítida, sin TAA, DLSS, reconstrucción neuronal, refracción, anisotropía BRDF física, SSS, DOF permanente ni nuevos pases de postprocesamiento. El hielo sigue siendo opaco; el barniz/reflejo es aproximado; no se agrega una simulación de desgaste persistente.

Referencias de implementación: [Filament, propiedades de materiales](https://google.github.io/filament/notes/material_properties.html), [Filament, materiales](https://google.github.io/filament/main/materials.html) y [Khronos, compilación paralela](https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/). Son referencias técnicas, no nuevas dependencias del proyecto.
