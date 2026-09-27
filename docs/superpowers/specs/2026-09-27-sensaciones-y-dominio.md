# Sensaciones y dominio — diseño autorizado

Solicitud: mejorar agua, slime, arena, telas y saltadores; corregir salas 5, 6, 16, 17, 19 y 31; ampliar la campaña de 42 a 62 salas.

## Materiales
El agua conserva inercia y pierde agarre transversal al cambiar de dirección. Salpicaduras, gotas y ondas hacen visible la velocidad y el derrape. El slime combina arrastre viscoso, adherencia con umbral limitado y memoria elástica: se deforma, tira del cubo y finalmente cede incluso con gravedad suave. La arena transporta con corriente finita y muestra granos y bandas en movimiento. Los materiales admiten huellas circulares, rectangulares redondeadas y cápsulas, usando idénticas dimensiones en física, render y planos.

Los saltadores son casquetes esféricos de goma: muy bajos respecto del radio, se comprimen al contacto y oscilan después del impulso. La deformación es una simulación amortiguada independiente de FPS. Las gotas y telas usan la capa raster existente para no multiplicar el coste del trazador principal.

## Recorridos
Las telas ocultan objetivos o dispositivos reales, con abertura por contacto. La sala 6 tiene dos paneles. Las salas 16 y 19 requieren salto porque sus barreras atraviesan la habitación. La plataforma 17 alcanza la pared, sin ranura que atrape el cubo. La sala 31 permite volver a subir desde ambos lados. La sala 5 obliga a rodear el extremo lejano del muro vertical.

## Ampliación
Cuatro capítulos de cinco salas, identificadores 43–62: derrapes y adherencia; mecanismos bajo telas; precisión y recuperación; combinación final. Cada sala tiene propósito, solución prevista y recuperación sin reiniciar. Se usan corredores y obstáculos de dimensiones variadas, conservando límites de objetos de GPU. Los guardados de 42 salas mantienen sus récords y desbloquean la continuación.

## Aceptación
Pruebas de física de giro, adherencia/escape, huellas y resortes; recorridos mediante entradas acotadas para las nuevas salas y correcciones; regresión de campaña anterior; verificación GPU real, oclusión, pausa y coste de compilación. Las rutas no teletransportan el cubo. La webcam real requiere hardware; las manos sintéticas siguen siendo una comprobación de render, no una validación de cámara.
