# Render stability implementation plan

Goal: retain the visual relief and procedural vertex colors from 9e37169 while eliminating per-POM-step scene traversal and protecting rendering quality/startup. The user request in this task is the binding specification; no main push or revert is permitted.

Architecture: identify and cache one relief candidate after the envelope hit; march its local SDF/height field with 8+3 (High) or 14+4 (Cinematic) samples. If rejected, resume the shared scene union with bounded cumulative instance exclusions from the entry, including thin backgrounds overlapping its envelope. Feed adaptation from observed worker draw/bitmap completion plus bounded async GPU timing where supported; isolate candidate preparation/first usable draw until successful and retain the old renderer on failure.

Global constraints: active runtime src/ only; physical SDF, physics, 42-level catalog, input, storage schema, camera and rules unchanged. Manual quality is not silently downgraded. Auto starts Low, never selects Cinematic, and reacts to 200ms+ frames immediately. No permanent gl.finish/readPixels in production. Commit only after combined checks/bench/review. PR targets main.

## Task 1 - Audit and benchmark harness
- Confirm exact 9fb2194..9e37169 shader diff and worker/quality defects before runtime edits.
- Reproduce old POM cost with a real WebGL timing probe and an external timeout; record failures as censored lower bounds, not successful samples.
- Build repeatable baseline/old/fixed benchmarks: 4 scenes, 4 tiers, fixed matching sizes; preparation, first usable, warm mean/p95/worst, backend and extensions; bounded large-resolution stress tests.
- Files: tests/render-benchmark.mjs, optional tests/helpers benchmark helpers, docs/RENDER-STABILITY-BENCHMARKS.md and compact JSON evidence.

## Task 2 - Candidate-only shader (root)
- Add call-graph/complexity regression proving the POM closure cannot reach scene traversal.
- Cache local frame, dimensions, seed, primitive type and ramp data once after baseHit; candidateBaseDistance/candidateReliefDistance evaluate one shape only.
- Use bounded layers and safeguarded secant refinement, normal scene continuation excluding rejected foreground; retain cube rotation and surfaceInset/vertex colors.
- Test both tiers, flat Low/Medium, thin carpet/backgrounds, no holes, bounded candidate calls, shader compilation/visual distinctions.
- Files: src/shaders.js, tests/relief-webgl.mjs, tests/relief-architecture.test.js.

## Task 3 - Adaptive quality, Worker and fallback (runtime agent)
- First write/observe failures for >250ms, startup Low, sustained pressure, manual stability and asynchronous lifecycle.
- Update quality thresholds/hysteresis; real observed renderMs feedback; no main RAF sampling in Worker mode.
- Cover busy/dead/context-lost Worker, hidden tab watchdog, resize, cancellation, switching mid-render, frame IDs, one in-flight plus latest queued, bounded recovery.
- Stage real candidate first frame at safe resolution; do not discard previous renderer before usability. Fallback has async compilation/bounded work policy and explicit limitation of uninterruptible GL driver calls.
- Files: src/quality.js, src/renderer.js, src/renderer-worker.js, src/renderer-client.js, only necessary src/app.js/UI integration; focused tests.

## Task 4 - Integration and publication
- Preserve all existing test cases; update only expectations intentionally changed by this task (auto starts Low and renderer files no longer hash-frozen), retain the original gameplay hashes; strip only explicit render exclusion gates when comparing the unchanged shader primitives/union.
- Run all Node tests, syntax/static/42-room regressions and course replays, WebGL probes, real browser startup/manual quality/failure/responsiveness tests, and benchmarks.
- Review full diff independently, fix actionable findings, document measured limits and precise desktop/mobile steps.
- Clean commits on fix/candidate-pom-render-stability; push only that branch and create PR, attach URL. Do not merge or publish main.

## Measured implementation refinements
- D3D11 still exceeded bounded compile probes after candidate-only POM. Production High/Cinematic now separate surface and lighting programs, with an RGBA8 depth/instance handoff, a GPU-baked height lattice, and one shared 15-sample relief-lighting call site.
- The measured Cinematic pixel budget is 2.2 MP; High remains 1.5 MP. Compilation and render budgets are separate: 60/90/180 seconds for aggregate tier preparation, 12 seconds for a first/subsequent frame, and immediate adaptive pressure at 200/1000 ms.
- Startup exposes usable Low while the saved manual preference prepares separately. Auto uses bounded candidate workers, caches downgrade tiers, and records failed/pressure-cancelled targets to prevent repeated compiler churn.
- Scale applies after the tier pixel cap, and a still-pending GPU query over two seconds signals emergency rather than recovery headroom.
- Publication evidence separates software WebGL, physical NVIDIA benchmarks, controlled browser lifecycle checks and the physical-GPU application smoke. Cold preparation remains slow and is reported explicitly.
