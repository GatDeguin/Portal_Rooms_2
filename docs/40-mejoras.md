# Matriz de las 40 mejoras

Todas las mejoras siguientes están implementadas. La columna de evidencia identifica qué se comprobó; no certifica compatibilidad con todo hardware. Los archivos JavaScript están en `src/`.

| N.º | Mejora | Implementación y evidencia |
| --- | --- | --- |
| 1 | Física estable a FPS variables | `physics.js`: paso fijo a 120 Hz; prueba de equivalencia a 10/30/60/120/144 FPS. |
| 2 | Colisiones en esquinas | `geometry.js`: barrido con normales simultáneas; prueba diagonal. |
| 3 | Evitar atravesar obstáculos | `physics.js`: colisiones continuas; prueba de pared de 0,02 unidades. |
| 4 | Fricción por superficie | `physics.js`: madera, alfombra, hielo y freno; comparación de velocidades. |
| 5 | Rebotes según impacto | `physics.js`: restitución variable y acotada; prueba de impactos rápidos/lentos. |
| 6 | Transición suelo–rampa | `geometry.js`, `shaders.js`: fórmula común de altura y bases; prueba de subida gradual. |
| 7 | Aterrizaje en plataformas | `physics.js`: soporte correcto y bloqueo lateral; pruebas de caída y acceso lateral. |
| 8 | Transporte en plataformas móviles | `physics.js`, `geometry.js`: desplazamiento exacto; objetivo de sala 18 asociado. |
| 9 | Control aéreo | `physics.js`: menor aceleración que en suelo; comparación de impulsos. |
| 10 | Bumpers robustos | `physics.js`: normal de escape, límite de impulso y cooldown; pruebas de contacto central. |
| 11 | Suavizado del giroscopio | `input.js`: filtro temporal configurable; equivalencia entre tasas de muestreo. |
| 12 | Zona muerta | `input.js`: umbral radial configurable; inclinación pequeña produce cero. |
| 13 | Sensibilidad | `input.js`, `ui.js`: 0,4× a 2,5×; pruebas de transformación y persistencia. |
| 14 | Inversión de ejes | `input.js`: ajustes independientes X/Z; prueba de signos y orientación. |
| 15 | Calibración y recentrado | `input.js`: promedio de 12 muestras estables, rechazo de lecturas inválidas y timeout. |
| 16 | WASD y flechas con keyup | `input.js`: estado de teclas; pruebas de liberación, oposición y diagonales. |
| 17 | Stick táctil más preciso | `input.js`: curva gradual, saturación circular y zona muerta pequeña. |
| 18 | Multitouch | `input.js`: propietario de puntero; prueba con dos contactos de Chromium/CDP. |
| 19 | Dirección de gravedad | `ui.js`: brújula con dirección/intensidad y etiqueta accesible; capturas de HUD. |
| 20 | Pausa y reanudación | `app.js`: pausa física, reloj y audio; pruebas de estado detenido y reanudar. |
| 21 | Selector de 22 salas | `ui.js`, `storage.js`: desbloqueo progresivo; 22 botones y bloqueo comprobados. |
| 22 | Progreso general | `ui.js`: barra y recuento; flujos de inicio, victoria y final. |
| 23 | Cronómetro por sala | `physics.js`: tiempo activo de simulación, no tiempo de pared; prueba de pausa. |
| 24 | Récord personal persistente | `storage.js`: reemplaza solo por menor tiempo; pruebas de guardado y recarga. |
| 25 | Intentos y reinicios | `storage.js`: contadores separados; reanudar no suma intento. |
| 26 | Victoria por sala | `ui.js`, `app.js`: tiempo, récord, intentos y reinicios; avance manual comprobado. |
| 27 | Final de campaña | `app.js`, `ui.js`: conserva 22 salas y récords; prueba de final sin borrar. |
| 28 | HUD compacto | `game.css`, `ui.js`: ajuste que oculta estadísticas secundarias; capturas escritorio/móvil. |
| 29 | Móviles pequeños | `game.css`: diálogos desplazables y breakpoints; 320×568, 390×844 y 844×390. |
| 30 | Hover, focus y teclado | `ui.js`, HTML/CSS: etiquetas, foco visible, diálogos nativos y Tab contenido. |
| 31 | Objetivos distinguibles | `shaders.js`: patrones y formas además de color; compilación y renders ES. |
| 32 | Transición entre salas | `app.js`, CSS: transición breve que respeta movimiento reducido; flujo comprobado. |
| 33 | Hielo, impulso y freno diferenciados | `shaders.js`: facetas, flechas y puntos; renders de superficies. |
| 34 | Feedback de portales y objetivos | `shaders.js`, `ui.js`: pulsos, portal elevado y progreso del aro. |
| 35 | Contacto del cubo | `renderer.js`, `shaders.js`: sombra de contacto y altura visual al rotar; renders ES. |
| 36 | Low/Medium/High/Auto reales | `quality.js`, `shaders.js`: presupuestos distintos; tres perfiles compilados. |
| 37 | Resolución adaptativa | `quality.js`: ventanas de rendimiento e histéresis; pruebas de presupuesto y recuperación. |
| 38 | Pausar al cambiar de pestaña | `app.js`: visibility/blur y sin render continuo en menús; estado y draws comprobados. |
| 39 | Regresiones de 22 salas | `physics.test.js`: definiciones, estado finito y activación de secuencias de cada sala. |
| 40 | Separar el monolito | 12 módulos más estilos y HTML; comprobación de sintaxis, imports y 81 IDs únicos. |

## Cambios de geometría deliberados

Las salas 15 y 17 conectan rampa y plataforma. La 18 añade acceso y objetivo móvil. La 20 tiene escalera con bases elevadas de 0,32 y 0,55 unidades. La 21 ajusta salto y altura del bumper. La 22 conserva cuatro plataformas, conecta rampas y aumenta el salto final. La cámara sigue siendo frontal en perspectiva.

## Alcance de la validación

Las capturas de interfaz usan WebGL simulado y están rotuladas. Por separado, los shaders y los uniformes del renderer real se dibujaron con Mesa/EGL. Esto es OpenGL ES por software, no WebGL del navegador ni GPU física. Las regresiones de salas comprueban reglas y estados; no equivalen a 22 recorridos humanos completos. No se prometen porcentajes de mejora de FPS ni una certificación de accesibilidad integral.
