# Portal Room — Level and Experience Polish Implementation Plan

**Goal:** Deliver revised individual rooms and coherent screen, interaction and render feedback.
**Architecture:** Keep simulation independent; enrich level data, render derived previews, and centralize presentation effects. DOM animation never changes the physics clock.
**Tech Stack:** Browser ES modules, CSS, WebGL 1, Node 22 tests, Playwright, EGL.
**Spec:** ../specs/2026-09-18-level-polish.md

## Global constraints
- Keep 22 stable room IDs, front-perspective camera and static hosting.
- No runtime dependencies, no telemetry, no network font requirements.
- Preserve earned unlocks and archive records from the old course.
- Playthrough pilot only reads state and supplies gravity; no teleportation.
- Test narrow/landscape layouts and reduced-motion state.

## Task 1 — Individual course review
- [x] Run the existing suite and collect a baseline for every route.
- [x] Write tests for per-room design metadata, path completion and expected mechanics.
- [x] Update `src/levels.js`, using explicit geometry changes per room; tune routes in `tests/helpers/playthrough.mjs`.
- [x] Run `node --test tests/course.test.js` and `node tests/helpers/playthrough.mjs test-results/course.json`.
- [x] Document all 22 decisions in `docs/REVISION-SALAS.md`.

## Task 2 — Preview and progression surfaces
- [x] Test new `src/presentation.js` derived preview, chapter data, hints and progress formatting.
- [x] Implement accessible preview SVGs, briefings, hint escalation, record migration and settings additions.
- [x] Run new unit tests plus `npm test`.

## Task 3 — Screens and interaction feedback
- [x] Add browser checks for preview-before-play, chapters, help, tabs and interrupted transitions.
- [x] Update `index.html`, `src/ui.js`, `src/app.js`, `styles/game.css`; add `src/feedback.js`.
- [x] Verify click, touch, keyboard, focus, hidden page and reduced-motion behavior.

## Task 4 — Render and perceived quality
- [x] Test shader/uniform contracts for obstacle heights, theme, inactive goals and effect preference.
- [x] Update `src/renderer.js` and `src/shaders.js`.
- [x] Compile and draw every room; inspect representative frames and browser screenshots.

## Task 5 — Handoff
- [x] Run all validation commands from a clean copy.
- [x] Record actual evidence and remaining physical-device limitations.
- [x] Package source, evidence and a git diff; do not claim remote publication without read-back verification.
