# Reparaciones verificadas — 26/09/2026

Base: `3744c01389d755c05d26464738802184fed75481` (main, versión 4.0.0).
Rama de las reparaciones: `fix/review-2026-09-26`.

## Cambios

- **Cámara:** se comparte una sola activación. Desactivar invalida la operación pendiente durante modelo, permiso y reproducción. Cualquier stream tardío se detiene. Un resultado o error antiguo no puede apagar una sesión nueva. El fin de una pista desactiva el seguimiento. Dos clics en Jugar con manos crean un solo intento y una activación tardía no inicia una partida detrás de Ajustes.
- **Volumen:** normalización y guardado entre 0 y 1, indicador porcentual actualizado y ganancia Web Audio aplicada al cambiar, activar sonido y reanudar. El 0 permanece en silencio; desactivar sonido conserva el volumen elegido.
- **Colisiones:** cada contacto de dedo/palma barre su desplazamiento contra sólidos antes de aplicar el siguiente. Se resuelven solapamientos iniciales y se sigue la altura transitable de rampas. También se libera un agarre si esa mano desaparece mientras la otra sigue visible.
- **Seguimiento:** errores, vídeo no disponible, página oculta/inactiva y muestras de más de 250 ms eliminan la entrada y su historial. Una mano reaparecida recibe una identidad de seguimiento nueva y debe cumplir de nuevo la distancia de agarre; no hereda el agarre de antes de una interrupción.
- **Windows:** `.gitattributes` fija LF para evitar falsos fallos por hashes. Se actualizaron exclusivamente las guardas de app, UI, audio y almacenamiento correspondientes a las reparaciones. Física original, niveles, geometría, input y shaders mantienen sus guardas.

## Evidencia de las correcciones

Las primeras 20 regresiones fallaron contra el código original y pasaron después de repararlo. La revisión independiente detectó dos casos adicionales: altura de una rampa real de la sala 15 y continuidad del agarre después de una interrupción. Ambos tuvieron reproducción roja y corrección verde. Total agregado: 22 pruebas unitarias.

La revisión independiente final no dejó hallazgos accionables pendientes.

| Verificación final | Resultado |
| --- | --- |
| `npm test` | 537/537 |
| `npm run check` | 20 módulos y 139 IDs HTML correctos |
| `npm run test:course` | 275/275 recorridos de expansión |
| `scripts/verify-static.py` | 22 recursos HTTP correctos |
| `tests/review-regressions-browser.py` | 14/14 comprobaciones de reparaciones |
| `tests/browser.py --ui-only` | 40/40 comprobaciones de interfaz |
| `tests/experience-browser.py --offline` | 80/80 recorridos DOM |
| `tests/render-stability-browser.mjs` | 34/34 comprobaciones de arranque/recuperación |
| WebGL real en Chrome / RTX 3060 Ti / D3D11 | Juego, teclado, pausa, reanudación y vista móvil correctos; sin errores de página ni consola |
| `git diff --check` y atributos LF | Correctos |

Las pruebas de interfaz y recorridos simulan WebGL; el ensayo WebGL real está separado. Las regresiones de cámara usan streams de vídeo sintéticos y simulan MediaPipe; no validan una webcam física ni la precisión del seguimiento en distintas condiciones de luz. El ensayo de volumen verifica un nodo de ganancia Web Audio real, además de interfaz y almacenamiento.

La compilación inicial del renderer continúa siendo lenta: 23,44 segundos en esta ejecución de calidad Baja. Es la limitación de arranque ya documentada, no una mejora atribuida a estas reparaciones. No se modificaron shaders ni se evaluó rendimiento sostenido de Alta/Cinemática.

## Repetir y consultar

- `npm test`: incluye las regresiones de cámara, seguimiento, física de manos y volumen.
- `npm run test:regressions`: requiere Python, Playwright y Chrome/Chromium; seleccionar el navegador con `CHROMIUM_PATH`. En Windows, `PYTHONUTF8=1` permite usar los ensayos Python existentes.
- [Regresiones de cámara](../tests/hand-lifecycle.test.js), [colisiones](../tests/hand-collisions.test.js), [volumen](../tests/volume.test.js), [integración de navegador](../tests/review-regressions-browser.py).
- Evidencias locales: `test-results/review-regressions/report.json`, `test-results/review-regressions/volume-fixed.png`, `test-results/browser/report.json`, `test-results/experience/report.json`.
- En la carpeta superior: `repair-unit-tests.log`, `repair-browser-stability.json`, `repair-evidence/browser-real.json`, `repair-evidence/real-playing.png` y `repair-evidence/real-mobile-playing.png`.

Esta rama reúne las reparaciones y sus pruebas de regresión para revisión e integración en `main`.
