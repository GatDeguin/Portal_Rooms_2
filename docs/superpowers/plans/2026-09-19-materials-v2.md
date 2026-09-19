# Materials V2 Implementation Plan

> **For agentic workers:** use superpowers:executing-plans. Continue the already approved material plan end to end; do not re-author gameplay.

**Goal:** Distinct, stable procedural material families across all 42 rooms without increasing ray budgets or regressing quality switching.
**Architecture:** Keep WebGL 1 / GLSL ES 1.00, current SDF and camera. Specialize material evaluation and separate coating/reflectance/emission. Resolve coordinates from existing object uniforms at the shaded hit, never in the distance march. Keep the current Worker client, worker entrypoint and compatibility paths unchanged.
**Tech Stack:** JavaScript ES modules; GLSL ES 1.00; Node tests; Chromium/Playwright and native EGL/GLES diagnostics.
**Spec:** Approved in-chat material plan and original Crimson Cinematic brief. Latest base: 0c27fb13bf1a0ae42ed96358aebd1e5472f83a47.

## Global Constraints
- All 42 level definitions, physics, geometry, controls, progress schema and camera remain byte-identical.
- Preserve mapScene and all SDF geometry, uniform capacities, quality-switch cancellation/timeout and viewport budgets.
- No new runtime dependencies, textures, engines, build step, secondary rays, dynamic loops or shader permutations.
- Paint is dielectric; coat roughness is independent; raw-metal exposure only in sparse wear masks.
- Procedural coordinates must follow rotating cube, moving obstacles and platforms; no material swimming.
- Texture detail fades with footprint, without altering gameplay colors or causing high-frequency shimmer.
- This is not subsurface scattering, refraction, full GI, DLSS, hardware ray tracing or anisotropic BRDF.

## Review Focus
- Thin patterns at distance / oblique surfaces: retain their mean rather than flicker.
- Mobile mediump and derivative-free compilation: bounded intermediates and normal safety.
- Cancellation or stalled compilation: preserve PR #3 behavior; test actual Worker scheduling plus simulated driver.
- Moving carriers: object-relative material coordinates, no new simulation mutation.
- Reflection/bounce hits: lightweight material response, no repeated full microdetail evaluation.

## Tasks
1. [x] Baseline and refactor: snapshot original renderer fixtures; add material-family contract test (RED); extract helpers without visual change; compile/render same samples and compare exact pixels; commit.
2. [x] Authored material implementation: add parameter/coordinate/energy diagnostics (RED); implement layered cube, satin boards, fibrous carpet, architectural plaster, coated obstacles/trim, structural platform wood, ice, brake, boost, pad, bumper and goals. Maintain wrapper signature. Add independent coating and stable normals. Commit after tests.
3. [x] Budget and stability: compile-time tier gates, secondary-hit approximation, filtered line means; verify original shader geometry/camera and no ray-budget increase. Native material parameter atlases plus moving/rotating coordinate invariants and camera-motion image sequences.
4. [x] Full regression and actual rendered review: npm test/check/course/static/ui/experience/quality; native 16 shader variants and 42-room coverage; inspect before/after and representative materials. Real browser GL probe; clearly separate unsupported device checks. Fix regressions before release.
5. [ ] Delivery: document measured scope and limitations, add reproducible scripts; verify exact uploaded files; publish via a review branch/PR. Only report main/Pages publication if it actually succeeds.

## Decisions
- A cloned checkout was unavailable (container DNS); restored the active code from the attached 42-room snapshot plus PR #3 and verified Git blob hashes. Local baseline is a snapshot, not a fabricated upstream history.
- No subagent tool available: use focused whole-diff review plus independent runtime/GLSL diagnostics, not a claimed independent reviewer.

- Validation ruling: mediump primary hit tolerance now scales with representable ray distance; SDF, camera, highp termination and all step budgets remain untouched. Native wall-hole regression and two portable renders passed.
