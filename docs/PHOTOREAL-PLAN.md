# Renderer de Portal Room: diagnóstico y plan

Base observada: da3384b, V.05, 62 salas. No se modifican layouts, física, input, almacenamiento ni cámara. La salida actual es GLSL ES 1.00, un triángulo de pantalla; High/Cinematic separan superficie RGBA8 y sombreado. PBR/relieve/reflejos/AO/niebla ya existen. No hay historia temporal ni target de color HDR.

## Referencia
Chrome 154 / Windows 10 / ANGLE D3D11 / RTX 3060 Ti, 640x360, 20 dibujos sincronizados después de cinco calentamientos. Baja: preparación 39960.6 ms, sala simple media 8.74 ms/p95 20.1 ms. Media: preparación 56176.4 ms, sala simple media 7.71 ms/p95 24.1 ms. Portal: 2.73/3.43 ms respectivamente. Muestra pequeña, no equivale a FPS sostenidos. Datos: photoreal-evidence/baseline.json. La sonda detectó WebGPU, WebGL2, float targets y temporización GPU; no representa otros equipos.

## Decisiones previas a implementación
1. Probar conversión offline del shader existente a WGSL. Sólo se incorpora WebGPU si compila, dibuja la misma escena y conserva el contrato; no se llama WebGPU a un mero compositor de WebGL.
2. Añadir una ruta WebGL2 conservando WebGL1 como degradación adicional, sin cambiar geometría/cámara. Detectar soporte real de float targets; color HDR lineal, tone mapping al final.
3. Antialiasing espacial conservador durante juego; acumulación subpíxel HDR sólo en escena congelada de foto. Evitar ghosting de una historia sin vectores de objetos reales. Una TAA completa exige reproyección por entidad y no se finge mediante mezcla de frames.
4. Foto opcional con 32 muestras y cancelación/reset en resize, nueva intención, pérdida del contexto y desmontaje. La foto no es fuente de estado del juego.
5. Perfiles y límites sólo basados en medición; el objetivo 60 Hz es una meta, no una garantía. Mantener shaders secundarios fuera del camino inicial.
6. Comparar geometría, materiales, movimiento, carga, offline, teclado, reducido, cancelación y reposo con pruebas GPU y DOM.

## Matriz de pertinencia
| Bloque | Decisión | Beneficio / coste | WebGPU / fallback | Prioridad |
|---|---|---|---|---|
| Compilación y preparación | aplicar | reduce espera, coste CPU del driver | probar WGSL offline / GLSL2 existente | P0 |
| HDR y color lineal | aplicar donde FBO soportado | mantiene energía para resolver; buffers extra | rgba16float / RGBA16F; salida actual sin float | P1 |
| AA espacial y foto acumulada | aplicar | bordes estables; coste post + muestras foto | resolver / post GL2; salida directa GL1 | P1 |
| TAA de juego con motion vectors | condicionado a correspondencia real | evita aliasing; riesgo ghosting/consumo historia | no sustituir por mezcla temporal ciega | P2 |
| Iluminación/materiales/contacto | conservar y revisar capturas | ya existen; ajustar sólo defecto observado | shader compartido | P1 |
| GI/reflejos de hardware RT | omitir | no hay requisito/soporte web portátil | probes y ray marching ya presentes | — |
| Terreno/vegetación/ciudades/tráfico/océano | no corresponde | salas acotadas, introducirlos inventa contenido | — | — |
| Personajes y multitudes | no corresponde | el objeto jugable es un cubo; manos existentes se preservan | — | — |
| Mundo streaming/LOD/instancing | omitir | renderer ya es un triángulo; no resuelve compilación SDF | — | — |
| Audio, físicas nuevas, cámaras nuevas | preservar | contratos actuales fuera del cambio gráfico | sin cambios | — |
| Offline/recursos/licencias | verificar | shaders locales; no runtime CDN nuevo | compiler sólo dev MIT/Apache2 si viable | P0 |

## Contratos
- Pipeline: preparación candidata no reclama canvas visible; commit sólo tras imagen válida. Fallo conserva la ruta disponible. Pérdida del contexto se comunica y limpia recursos.
- Color: sombreado produce radiancia positiva lineal; resolve aplica exposición/ACES/sRGB una vez. Sin targets float se conserva salida completa existente.
- Foto: inicia desde presentación real congelada; jitter sólo cambia el rayo subpíxel. Controles/foco siguen operables. Conteo llega a 32 o cancela; resize invalida buffers y muestras. Ninguna muestra altera física, cámara o guardado.
- Resolución: tamaño válido y acotado por límites; cambio destruye targets antiguos y borra historia. No se infiere VRAM del nombre de GPU.

## Plan de verificación
Pruebas unitarias de conversión, color, perfiles, acumulación/cancelación y recursos; checks existentes; pruebas browser Chrome/Edge reales a 640x360 y 1280x720, escenas simple/obstáculos/plataformas/portal, fotos deterministas y movimiento. Inspeccionar imágenes realmente. Medir frame y preparación por separado, distinguir GPU query de gl.finish/wall y informar cobertura ausente. Revisar veinte ciclos de foto y fallback sin WebGPU/float.
