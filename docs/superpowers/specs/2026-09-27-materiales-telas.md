# Materiales físicos y telas

Solicitud: reemplazar hielo por agua resbaladiza, freno por slime viscoso y acelerador por arena en movimiento; hacer gelatinosos los bouncers y añadir telas interactivas en algunas salas.

Agua superficial: baja fricción de contacto, arrastre hidrodinámico creciente con velocidad, deslizamiento y ondas/contacto visibles. Slime: resistencia viscosa, umbral de adherencia en reposo y una película que se disipa al salir; siempre se puede escapar inclinando. Arena: corriente direccional de velocidad finita que transmite impulso por fricción y amortigua el deslizamiento transversal. Bouncers: contacto elástico amortiguado con compresión/oscilación visibles, impulso limitado y enfriamiento por contacto.

Telas: solver de partículas con restricciones de distancia y anclajes, gravedad/viento suave, contacto con cubo, sala y manos. Paños pequeños y accesibles en salas seleccionadas, sin bloquear objetivos. Raster 3D con la cámara real, oclusión por la sala y sombras; mallas limitadas para mantener el juego utilizable.

Se conserva la numeración, los guardados, objetivos y geometría principal de las 42 salas. La física usa el paso fijo de 1/120 s y se congela en menús, pausa y transiciones. Movimiento reducido limita adornos; no elimina fuerzas necesarias para jugar. No se añaden dependencias. El proyecto activo es github-latest; no tocar archivos históricos de la raíz ni descartar trabajo previo de manos/animaciones.
