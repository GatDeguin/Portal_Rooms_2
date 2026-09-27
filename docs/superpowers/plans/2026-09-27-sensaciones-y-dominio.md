# Plan de implementación

- [x] Definir y probar huellas compartidas, derrape, memoria elástica, partículas y resortes de salto.
- [x] Integrar superficies, casquetes de goma y efectos visibles en los renderizadores, preservando presupuestos de compilación.
- [x] Convertir telas en ocultadores interactivos y sincronizar receptores de profundidad.
- [x] Corregir seis salas y autorar veinte salas con matriz de diseño y recorridos de solución/recuperación.
- [x] Actualizar planos, capítulos, textos y continuación de guardados a 62 salas.
- [x] Revisar integración, ejecutar pruebas de física/campaña y navegadores reales, corregir fallos y actualizar documentación.

Propiedad paralela: material_visuals: shaders/renderer; cloth_system: telas, efectos raster y profundidad; review_atelier: datos de niveles/campaña y rutas. Agente principal: física, huellas, integración de UI, contratos y verificación final. No se edita simultáneamente un mismo archivo.

## Resultado de verificación — 27 de septiembre de 2026

La suite completa pasó **802/802 pruebas**, sin fallos, con Node 22 en [GitHub Actions](https://github.com/GatDeguin/Portal_Rooms_2/actions/runs/36336919920), sobre el commit de implementación bde952be8dbbd5343e7eefd916f92679a4a4f617. El control estático comprobó 39 módulos y 158 IDs HTML únicos. Incluye los 40 recorridos nuevos de teclado y las rutas analógicas con reproducción independiente; soluciones y recuperaciones en [MASTERY.md](../../MASTERY.md).

Chrome real, con WebGL y el worker del juego:

- Materiales/telas/campaña: 13 escenarios aprobados, sin errores de página ni consola. Incluyen contactos, derrape, gotas, estiramiento del slime, corriente de arena, compresión/vibración de goma, doble cortina, corredor, pausa, formato vertical, recuperación de contexto y continuación 42 → 43 conservando récords.
- Manos Atelier: 7 escenarios aprobados. Piel y sombras presentes, oclusión por el cubo, seguimiento de sombras, limpieza al perder las manos, pausa, formato vertical y recuperación de contexto.
- Transiciones: 5 escenarios aprobados. Entrada y salida, pausa, tiempo detenido, siguiente nivel, movimiento reducido, portal y respuesta tardía del worker que conserva el último frame de desaparición.

Los ensayos de manos usan poses sintéticas y los visuales usan posiciones de contacto controladas. No prueban una webcam física ni sustituyen una sesión de juego humana; las rutas de campaña sí emplean exclusivamente las entradas del motor.

## Perfiles gráficos

Pruebas secuenciales de Chrome/ANGLE D3D11, sin otros ensayos GPU simultáneos. La escena de formas incluye agua, slime, arena, domos a nivel del suelo y un domo elevado. Se confirmó el perfil solicitado sin avisos ni ampliar los límites de preparación:

| Perfil | Primera imagen | Evidencia |
|---|---:|---|
| Baja | 38,20 s hasta el menú integrado | test-results/living-materials/browser.json |
| Media | 49,40 s | test-results/living-materials/shaped-worker-medium.json |
| Alta | 113,58 s | test-results/living-materials/shaped-worker-high.json |
| Cinemática | 160,15 s | test-results/living-materials/shaped-worker-cinematic.json |

Son mediciones de arranque en frío de este equipo, no promesas para otros dispositivos. La normalización de la evaluación de zonas redujo la primera imagen de Alta desde 173,53 s; su comparación visual solo difiere en una unidad de color de un píxel entre 836.000. Media produjo imágenes idénticas. Las capturas y registros quedan en test-results/, fuera de los archivos publicados.

## Publicación

La actualización se integra mediante [PR #13](https://github.com/GatDeguin/Portal_Rooms_2/pull/13). GitHub Pages publica main. La verificación de despliegue compara por SHA-256 cada archivo runtime servido (src, estilos, manos e index.html) con el commit integrado; un build exitoso por sí solo no confirma esa igualdad.
