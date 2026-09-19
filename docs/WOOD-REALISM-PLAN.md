# Madera procedural y auditoría de diseño

Base remota: 18a05a1da74d56603924407db393d08c67eaf309.

Alcance autorizado: auditar las 42 salas y proponer 20 mejoras por sala (no aplicarlas a la campaña); mejorar el acabado de la madera. Mantener física, niveles, cámara, límites de calidad, el arreglo asíncrono de calidad y todos los otros materiales.

1. Obtener inventario activo; distinguir datos, pruebas de simulación e hipótesis de diseño. Reproducir rutas evasivas con inputs, sin editar el estado tras el spawn.
2. Escribir guardas de madera; comprobar que fallan antes de implementar.
3. Guardar comparadores del shader anterior. Introducir anillos de crecimiento de corte virtual, identidad de tabla, fibras longitudinales y poros filtrados. Compartir anatomía con laminados; conservar juntas/laminación y material secundario barato.
4. Ejecutar diagnóstico nativo de color/rugosidad/normal, las 16 variantes, regresiones de calidad, UI, campañas y recursos; comparar imágenes al mismo tamaño y estado.
5. Entregar 42 fichas con 20 acciones distintas, prioridad/ámbito/criterio de prueba y análisis global. No presentar los recorridos del piloto como playtesting humano.
6. Publicar únicamente la mejora visual probada; la auditoría queda como propuesta. Conservar resultados y límites explícitos.

Diagnóstico: el primer umbral del probe exigía canales lineales >=0,03, lo cual rechaza legítimamente pigmentos marrones (azul oscuro). Corregido a dominio físico [0,0,65], conservando tests de variación, orden cromático, normales y rugosidad. No se iluminó el material para satisfacer una prueba incorrecta.
