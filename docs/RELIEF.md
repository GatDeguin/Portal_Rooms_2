# Relieve con silueta y color de materiales

El runtime activo usa `src/shaders.js`, WebGL 1 y superficies implícitas (SDF). El efecto está habilitado automáticamente en **Alta** y **Cinemática** con precisión `highp`. **Baja**, **Media** y dispositivos limitados a `mediump` conservan el relieve por normales. Los colores interpolados están disponibles en todos los perfiles.

## Relieve

La primera búsqueda encuentra la envolvente original. Una segunda búsqueda cruza un campo de profundidad procedural dentro del volumen finito del objeto y refina la primera intersección mediante bisección. Así cambian tanto las coordenadas de sombreado como el contorno visible. Si un borde deja pasar el rayo, se busca la superficie que aparece detrás; no se descarta el píxel de pantalla. La unión de objetos se calcula después de aplicar la profundidad de cada candidato, para respetar las superposiciones.

Alta utiliza hasta 40 muestras y 4 refinamientos; Cinemática, 64 y 6. El recorrido combina avances según la distancia con muestras repartidas sobre el intervalo del objeto para atravesar las caras rasantes. Al salir de ese intervalo aterriza exactamente en el límite y recupera un paso fino para no saltarse capas como la alfombra. Es una aproximación de resolución finita: detalles más finos que el espaciado pueden perderse. Si se agota el presupuesto tras cruzar el objeto, el fondo utiliza su envolvente original.

La profundidad es hacia adentro y está expresada en unidades del mundo: hasta 0,009 en el piso, 0,007 en plataformas/rampas, 0,0035 en alfombra, 0,0025 en paredes, 0,0024 en el cubo y 0,003 en obstáculos. Emisores y señales conservan su superficie lisa. Las normales y la autooclusión local de las luces principal y lateral comparten exactamente el campo de profundidad filtrado usado para la intersección. Las reflexiones, sombras lejanas y AO general conservan la envolvente de bajo coste. La física no cambia.

Referencia de la técnica de intersección y refinamiento: [GPU Gems 3, capítulo 18](https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-18-relaxed-cone-stepping-relief-mapping). Esta implementación no utiliza mapas de conos ni texturas precalculadas.

## Color interpolado

No hay mallas de objetos ni atributos de color de vértice: el único triángulo real cubre la pantalla. Se usa el equivalente procedural de vertex paint: ocho colores en los vértices de una rejilla local, interpolados en el punto de impacto. RGB modula el pigmento en espacio lineal y alfa ajusta suciedad, rugosidad y capa de barniz. La rejilla sigue las traslaciones y el quaternion de los objetos. Las señales luminosas mantienen sus colores funcionales.

## Verificar

```sh
node --test tests/*.test.js
node scripts/check.mjs
node tests/relief-webgl.mjs
```

La prueba WebGL requiere Playwright y Chromium. Se puede indicar la carpeta del módulo con `PLAYWRIGHT_MODULE` y el ejecutable con `CHROMIUM_PATH`. No son dependencias de la aplicación. Guarda el informe y las imágenes en `test-results/relief/`.

La prueba compara la profundidad oblicua con el perfil sin POM, exige que el borde recortado revele el fondo sin agujeros, comprueba la invariancia del color frente a traslación y rotación, compila las 16 combinaciones de perfil/precisión/derivadas y renderiza escenas reales. ANGLE SwiftShader ejecuta WebGL por software: estas pruebas no certifican FPS de GPU ni rendimiento móvil.
