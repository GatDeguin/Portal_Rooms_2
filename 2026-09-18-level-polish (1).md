# Revisión de salas y experiencia — diseño

Partimos del ZIP Portal_Room_40_mejoras entregado al usuario, no de una rama remota supuestamente publicada.

## Alcance
Revisar y ajustar las 22 salas con identidad e índices persistentes. Mantener WebGL propio, cámara frontal en perspectiva, ES modules y despliegue estático sin dependencias de ejecución. No cambiar a vista cenital; los planos son ayudas 2D en los menús, no una cámara nueva.

## Salas
Añadir cuatro capítulos, una habilidad/briefing por sala, pistas escalonadas y vista previa derivada de geometría real. Ajustar cada recorrido con márgenes de paso, zonas de aprendizaje o aterrizajes. Revisar especialmente 19, 21 y 22: el piloto de referencia se atasca con el diseño previo. Comprobar cada sala desde su salida usando exclusivamente entradas de gravedad; distinguir esto de pruebas de reglas que posicionan el cubo sobre objetivos. Registrar trayectoria, tiempo de simulación, colisiones, saltos y superficies, sin presentarlos como pruebas humanas.

## Interfaz
Menú inicial editorial de dos columnas con vista de sala y progreso real; selector agrupado por capítulos con inspección antes de iniciar; pausa informativa; ayuda explícita; ajustes con pestañas; victoria con siguiente sala y reconocimiento de récord. Objetivos secuenciales visibles, pista progresiva y mensaje de entrada sin bloquear después del inicio. Mantener 320×568 y apaisado, áreas seguras y objetivos táctiles de al menos 44 px.

## Respuesta
Transiciones cortas y cancelables, entrada de paneles, presión y foco en botones, feedback por superficie/paso, progreso de estabilidad y celebración localizada. Ninguna animación gobierna el estado físico. Respetar movimiento reducido, efecto desactivable, pérdida de foco y pausa. No ejecutar render continuo tras los menús ni instalar herramientas analíticas externas.

## Render
Mejorar lectura de portales, objetivos, contacto, geometría de obstáculos y señalización; mantener tres presupuestos gráficos. El render debe representar las alturas físicas y los objetos inactivos de una secuencia. Añadir tema de capítulo sutil sin sustituir la estética original.

## Persistencia
Conservar desbloqueos y ajustes. Como los circuitos cambian, no comparar récords anteriores como si fueran de la misma versión: archivarlos en la migración y explicarlo al usuario. No borrar progreso sin confirmación.

## Verificación
Pruebas existentes, regresiones nuevas, recorridos completos por controles a más de una frecuencia/intensidad, Chromium real cuando WebGL pueda inicializarse, pruebas de UI explícitamente etiquetadas cuando se emule, renders EGL separados y revisión de capturas. Documentar limitaciones de teléfonos, sensores y percepción humana.
