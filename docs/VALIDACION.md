# Validación — 18 de septiembre de 2026

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| `npm test` | **80/80**, cero fallos | Física, datos de salas, entrada, guardado, calidad y contratos de UI. |
| `npm run check` | Correcto | Sintaxis de 12 módulos, rutas/importaciones y 81 IDs HTML únicos. |
| `python tests/browser.py --ui-only` | **30/30**, sin errores JS inesperados | DOM, eventos, navegación, foco, layout y flujos en navegador real; WebGL sustituido. |
| `python tests/shaders_egl.py` | **3 perfiles y 33 renders** | GLSL compilado/enlazado y dibujado real con OpenGL ES por software, fuera del navegador. |

Entorno de ejecución: Node.js 22.16.0, Python 3.13, Chromium 144. Render offscreen: `llvmpipe (LLVM 19.1.7, 256 bits)`, `OpenGL ES 3.2 Mesa 25.0.7-2`.

## Comprobaciones realizadas

La simulación se comparó a 10, 30, 60, 120 y 144 FPS. Se probaron esquinas, muros delgados, superficies, rebotes, rampas, aterrizajes, transporte, control aéreo, bumpers y objetivos con altura. Para cada sala se ejecutaron entradas deterministas y se verificaron límites y valores finitos. Las secuencias se probaron situando el estado en sus objetivos: **no son recorridos humanos completos**.

La interfaz se comprobó en escritorio 1100×760, teléfono 390×844, móvil pequeño 320×568 y horizontal 844×390. Se ejercitaron teclado, Tab, Escape, scroll, pausa, ajustes, desbloqueo, récords, final, borrado confirmado, errores gráficos y dos dedos mediante Chromium DevTools Protocol. Las capturas de los menús y escenas representativas se revisaron visualmente.

El exportador captura los uniformes de `Renderer.draw`. La prueba EGL aplica esos valores a los shaders reales, comprueba enlace, ausencia de errores GL y salida no uniforme. Incluye las 22 salas, tres calidades, escenas ampliadas y portal elevado final. No es una comparación pixel-perfect de todos los estados posibles.

## Límites explícitos

El Chromium de este entorno no inicializa WebGL y la política de navegación bloquea HTTP local. No se modificó esa política. Las pruebas de interfaz usan un mapa de importaciones offline de los archivos entregados, almacenamiento en memoria y sensores/permisos sintéticos. Las capturas llevan **«PRUEBA DE INTERFAZ · WebGL simulado»**.

El modo de navegador sin `--ui-only` exige WebGL y falla si falta; no convierte esa ausencia en un resultado positivo. La prueba ES es independiente y no valida WebGL nativo del navegador, permisos reales de iOS/Android, GPU física ni FPS en teléfonos.

No se probaron Safari/Firefox, sensores físicos, audio/háptica físicos ni restauraciones reales de GPU. Las salas verticales requieren una pasada humana de jugabilidad y dificultad. No se certifica WCAG integral ni se publican mejoras porcentuales de rendimiento.

El tiempo de sala es de simulación activa: los bloqueos severos pueden ralentizarlo frente al reloj real. No es un ranking competitivo entre dispositivos.

## Evidencia

Los scripts generan `test-results/browser/report.json`, `test-results/egl/report.json` y capturas. El paquete de evidencia también contiene el registro de Node. `test-results/` queda fuera de Git; los scripts y sus requisitos se entregan para reproducir las comprobaciones.
