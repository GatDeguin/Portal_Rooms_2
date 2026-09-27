# Materiales físicos y telas — Implementation Plan

> **For agentic workers:** Use focused parallel implementation for independent files, then integration and independent review. Steps use checkboxes.

**Goal:** Dar a agua, slime, arena, gelatina y telas respuestas visibles y físicas coherentes.
**Architecture:** Fuerzas en un módulo de superficies llamado por GameEngine; estado de gelatina transmitido al shader. Solver de telas independiente con snapshots renderizados sobre la imagen de la sala. El reloj físico gobierna las interacciones.
**Tech Stack:** JavaScript ES modules, WebGL 1 room shader, WebGL 2 raster layers, Node tests, Playwright.
**Spec:** ../specs/2026-09-27-materiales-telas.md

## Global Constraints
- Mantener IDs, guardados, objetivos, controles y cambios locales de manos/transiciones.
- Física a 1/120 s, pausa sin deuda temporal, sin dependencias nuevas.
- Telas con presupuesto acotado, cámara/oclusión coherentes y recuperación de contexto.

## Review Focus
- Superficies bajo plataformas o bajo un cubo en vuelo no aplican fuerzas.
- Salir del slime y oponerse a la arena debe ser posible; no generar velocidad ilimitada.
- Contactos simultáneos y centro de bouncer permanecen finitos.
- Telas no acumulan tiempo durante pausa ni saltan tras reanudar.
- Los snapshots lentos del worker conservan alineación entre tela, cubo y sala.

### 1. Superficies y gelatina (implementación principal)
- [x] Añadir pruebas de arrastre, adhesión, escape, corriente, aire y determinismo.
- [x] Implementar src/surface-physics.js e integrar src/physics.js con campos cube.wetness, cube.slime y state.bumperJelly[{compression,velocity,axisX,axisZ}].
- [x] Adaptar nombres y sonidos visibles, manteniendo IDs y compatibilidad de guardado.
- [x] Ejecutar pruebas físicas y recorrido de campaña; ajustar balance con evidencia.

### 2. Materiales visuales (agente independiente)
- [x] Modificar solamente shaders.js, renderer.js y pruebas nuevas de render de materiales.
- [x] Agua con ondas/estela, slime con menisco y brillo húmedo, arena granular advectada según dirección de cada zona, bouncers deformados por bumperJelly.
- [x] Verificar uniformes neutros, efectos reducidos y compilación WebGL.

### 3. Tela (agente independiente)
- [x] Crear cloth-layout.js, cloth-physics.js, cloth-renderer.js y cloth-view.js con pruebas propias.
- [x] ClothSystem(room).step(dt,{cube,time,hands}), snapshot(): frames serializables sin estado interno del solver.
- [x] ClothView.render(engine,settings,{presentation,reduced}) muestra el snapshot correspondiente al bitmap de sala; destroy() libera recursos.
- [x] Verificar anclajes, restricciones, contactos cubo/manos, ausencia de explosiones y oclusión 3D.

### 4. Integración y verificación
- [x] Conectar solver al paso fijo y ClothView al frame/teardown sin alterar detección de manos.
- [x] Prueba Chrome real de superficies, golpe de gelatina, tela y pausa; capturas de escritorio/móvil.
- [x] Revisar cambios, actualizar solo contratos por hash que el usuario autorizó cambiar, ejecutar npm test, npm run check, git diff --check.
- [x] Documentar alcance y entregar vista previa local.
