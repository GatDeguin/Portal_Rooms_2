# Pantallas, interacción y acabado — V.03

## Dirección visual

Se mantiene el cubo rojo, la habitación y la cámara frontal en perspectiva. Los menús usan grafito, acentos cálidos y planos de las salas. No hay imágenes promocionales que simulen jugabilidad ni fuentes externas. La habitación conserva sus paredes diferenciadas, ahora con colores y exposición más contenidos.

## Pantallas

**Inicio:** siguiente sala real, habilidad a practicar, avance por capítulos, acción principal de entrada, activación explícita de inclinación, acceso a explorar y ayuda. En móviles muy bajos se retira el plano secundario para dejar visible el botón de entrada.

**Selector:** todas las salas se pueden inspeccionar, incluso bloqueadas. Filtros de capítulo, selección con mouse/tacto/flechas y un plano derivado de obstáculos, rampas, plataformas, superficies y objetivos reales. Los objetivos se numeran; las rampas muestran su dirección de ascenso. Inspección y entrada son acciones distintas.

**Pausa:** nombre, tiempo, intentos, reinicios, plano y briefing. Volver de ayuda o ajustes conserva la pausa; no consume tiempo de juego.

**Ajustes:** pestañas Controles, Imagen y Audio con etiquetas y estados accesibles. Flechas, Home y End cambian de pestaña. Incluye efectos decorativos, volumen maestro y confirmación del estado del guardado.

**Ayuda y pistas:** instrucciones breves de aceleración, frenado e interacción con superficies; tres pistas por sala, de orientación a recorrido. La pista se puede cerrar y no se convierte en una pausa no solicitada. Reiniciar restaura la primera pista. El texto se anuncia de forma no intrusiva a tecnologías de asistencia.

**Victoria y final:** marca personal diferenciada, estadísticas, siguiente sala con habilidad y repetición explícita. La campaña no borra el progreso. Los tiempos anteriores a este circuito se etiquetan como archivados.

## Animaciones e interacciones

| Acción | Respuesta implementada |
| --- | --- |
| Abrir panel | Entrada de opacidad y desplazamiento de 240 ms. |
| Mostrar inicio | Aparición escalonada de contenido de 380 ms. |
| Pulsar botón | Desplazamiento y escala leves; onda localizada de 420 ms que se elimina al terminar. |
| Teclado | Contorno de foco visible; navegación contenida dentro del diálogo. |
| Entrar a sala | Transición de 480 ms, omitible con Enter o el botón de entrada; pierde continuidad al pausar o perder foco. |
| Arrastrar stick | Borde activo, seguimiento del dedo propietario y retorno a neutral al liberar. |
| Pedir ayuda | Pistas progresivas, cierre explícito y aviso breve al entrar a una sala. |
| Activar objetivo | Progreso de secuencia y pulso corto; distinción entre actual, futuro y completado. |
| Saltar/rebotar | Respuesta localizada del indicador de superficie y sonido existente. |
| Estabilizar | Barra de carga y aro visible; no depende solo del color. |
| Completar | Trazo de confirmación, aparición de estadísticas y presentación de la siguiente sala. |
| Cambiar ajuste | Valor actualizado y confirmación de persistencia o memoria de sesión. |

La simulación no depende de callbacks de animación. Los efectos respetan movimiento reducido y el ajuste explícito; la pausa no conserva un bucle continuo de render. No se añadió vibración constante, partículas que ocupen el centro ni esperas obligatorias después de completar una sala.

## Correcciones gráficas

Las alturas de muros, zonas y bumpers coinciden con los datos físicos. El hielo elevado actúa y se dibuja a su altura; no modifica el suelo inferior. El núcleo del portal está delante de la pared, dentro del marco. Las sombras toman como oclusores los objetos físicos, no las paredes del recinto convexo que generaban bandas. La luz difusa utiliza el color de las luminarias. Se revisaron la saturación de objetivos, las texturas de superficies y el contraste del cubo respecto al entorno.

Los tres presupuestos de calidad se conservan. Los cambios buscan legibilidad y consistencia, no una garantía de FPS ni una medición de preferencia estética.

## Alcance de la comprobación

Se revisaron capturas de inicio, selector, pausa, ayuda, ajustes, juego y victoria. Se probaron tamaños desde 320×568, además de 390×844, 430×932, 844×390, 568×320 y escritorio. Las capturas de UI usan WebGL simulado y están rotuladas; el render se comprobó por separado con OpenGL ES por software. No se realizó una evaluación formal WCAG ni un estudio de usabilidad con personas.
