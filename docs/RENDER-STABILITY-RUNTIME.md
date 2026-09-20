# Rendering stability runtime

## Startup and quality changes

Startup first presents a validated Low image. Auto begins at Low; a stored Medium, High, or Cinematic preference is then prepared in a separate candidate worker while the Low renderer remains functional. The menu displays the requested preference and a cancel action. Starting or pausing gameplay does not cancel that preparation. Explicit cancellation, leaving Settings, hiding the tab, navigating away, or choosing another quality does. Startup completion, cancellation, and failure preserve the saved preference and progress; failure keeps Low with a visible explanation. Only a successful explicit quality selection normally writes the preference.

A candidate must draw the actual scene at its selected drawing size and deliver a usable bitmap before replacing the previous renderer. The previous worker remains alive until presentation succeeds. Failed presentation restores its size and requests its image even while paused. Cancellation, stale selection, timeout, context loss, or draw failure releases candidate resources. The bootstrap accepts AbortSignal, so pagehide can terminate it before the app has received a renderer. A back-forward cached page whose bootstrap was aborted reloads on restoration.

Auto tier promotions also use candidate workers; the active worker proposes the tier rather than compiling it inside a frame request. A proposal emitted before ready is retained until the candidate's first image is presented. An Auto candidate targeting High caches Low, Medium, and High within the same 180-second aggregate limit; explicit High/Cinematic candidates still prepare Low plus the requested tier. Emergency descent to Medium and later recovery to High reuse those programs without another worker or compilation. Failed Auto targets are blocked for the session, preventing repeated compilation every headroom window. Pressure-triggered cancellation also blocks the target; duplicate same-target proposals leave the existing candidate pending. User cancellation or supersession does not permanently block a tier; a successful explicit retry clears that tier's failure. Auto can recover a failed active worker once at Low. Before creating the rescue worker, it warns the app, which immediately pauses gameplay so physics cannot continue behind a frozen image. While recovery is pending, resume and starting/restarting a room show a brief wait message without advancing physics or adding an attempt. Successful recovery preserves the saved mode and progress and stays paused until the user resumes; a second failure shows the recoverable error UI instead of spawning a loop.

## Adaptation and measured work

Auto promotes Low → Medium → High after three consecutive windows below 18.5ms, never to Cinematic. Each window closes at 2000ms of measured work or 120 samples, whichever comes first, with at least ten samples. A window above 28ms reduces rendering cost. A single observed frame of at least 200ms reduces Auto immediately; at least 1000ms selects Low at half scale. Explicit quality choices retain their tier and scale.

`drawingSize` applies adaptive scale after the tier's DPR and pixel cap. Therefore half scale reduces both output dimensions even on displays already limited by the pixel cap, instead of leaving emergency rendering at the same pixel count. The regression covers capped large displays and all tier budgets.

Workers measure draw plus `transferToImageBitmap`; main-thread RAF intervals never drive worker adaptation. This wall duration describes submission and delivery, not guaranteed GPU execution. With WebGL1 [EXT_disjoint_timer_query](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query/), at most one query is pending. Valid GPU time contributes the greater of wall and GPU duration, once per frame. Emergency wall pressure acts immediately; later catastrophic GPU evidence can escalate it without adding a duplicate recovery sample.

Availability is checked before query age. An already completed query polled after a hidden-tab delay uses its real GPU duration. A query still unavailable after two seconds contributes at least its elapsed wait and triggers emergency pressure. Disjoint or invalid results cannot turn fast CPU submission into promotion headroom, although observed slow CPU work still counts. Completed, invalid, expired, and destroyed queries are deleted. First-image validation waits asynchronously and boundedly for GPU timing, with status distinguishing valid GPU evidence from wall-only, disjoint, or expired results.

## Deadlines and backpressure

| Session preparation | Aggregate limit |
| --- | --- |
| Initial Auto / Low | 60 seconds |
| Medium, including rescue Low | 90 seconds |
| High / Cinematic, including rescue Low | 180 seconds |

The client enforces one absolute preparation limit across initialization. Internal rescue Low and requested-program preparation receive a decreasing remaining budget. A single `prepared` message switches to the independent 12-second first-image deadline; duplicate messages cannot extend it. Every subsequent in-flight frame has its own 12-second watchdog. Explicit `timeoutMs` overrides both phases for tests or embedding callers; `prepareTimeoutMs` independently overrides preparation. Compilation time is not deducted from first-image validation.

The budgets reflect NVIDIA GeForce RTX 3060 Ti / ANGLE D3D11 benchmark measurements in fresh Chrome processes/profiles (driver caches not cleared): baseline Low approximately 30s and Medium 34s; final split High 65.8s (surface 9.6s, shade 56.2s); Cinematic 124.4s (surface 16.4s, shade 108.1s). Both heavy tiers completed four scene checks. Cinematic plus roughly 30s of rescue Low leaves about 25s within the aggregate cap. These are preparation allowances, not acceptable frame times or FPS targets.

There is one frame in flight and one latest queued packet. IDs reject stale or duplicate replies and close their bitmaps without releasing a newer request. Pause, hidden tabs, and menu transitions discard queued work but retain the watchdog for work already in flight. Browser suspension can delay timer delivery. Context loss, worker errors, and navigation release the corresponding sessions.

## Rendering resources and fallback limits

High/Cinematic highp use two cached programs: a surface pass packs depth and candidate identity into a nearest-filtered RGBA8 target, then a shading pass reads it from texture unit 1. Both receive identical scene uniforms and share one GPU timing query. Surface packing temporarily disables dithering. The target is reused until drawing size changes; incomplete replacement allocation preserves the prior target. Low, Medium, and mediump use one pass. Program preparation is transactional and both programs are deleted on failure or destruction.

The implemented highp relief cache bakes one 256×256 RGBA8 lattice with the backend's GLSL hash, preserving its floating-point behavior rather than substituting CPU double arithmetic. Padding repeats the period-251 lattice; filtering is LINEAR with CLAMP_TO_EDGE and no mipmaps. The bake restores its GL bindings, attributes, masks, and capabilities. Low/Medium and mediump skip it. Heavy draws share the cached texture on unit 0; destruction releases it once.

Without workers, the main-thread fallback first prepares Low and uses KHR parallel compilation when available. High/Cinematic require both KHR and GPU timing support. Their first-draw query is awaited by identity: only a valid GPU result permits commitment; invalid, disjoint, expired, or absent evidence refuses the choice visibly and retains the working quality. Auto promotions use the same validation and apply the candidate cost before committing. Fallback adaptation combines observed CPU draw cost, RAF pressure, and valid GPU timing without double sampling.

JavaScript cannot interrupt a synchronous WebGL driver call. KHR polling makes pending compilation cancellable between calls, but compile/link, allocation, or first-use drawing can still block the main-thread fallback. A timeout or worker termination cannot guarantee interruption of an operating-system GPU driver or prevent interference between contexts sharing that driver. Without valid GPU timing, bitmap delivery and error checks do not independently prove GPU completion. Production performs no `gl.finish` or `readPixels`; it does not keep a blocking GPU-completion check in the render loop.

## Verification and hardware evidence

The Node regression suite covers quality thresholds, capped resolution scaling, timing expiry, aggregate budgets, duplicate readiness messages, candidate rollback, startup cancellation, and resource lifetime.

`node tests/render-stability-browser.mjs` runs the real app, DOM, storage, and native Worker scheduling against a controlled software Canvas2D WebGL double. GPU and software WebGL rasterization are disabled. Its 34 checks cover all five saved startup modes, usable Low while a saved candidate prepares during gameplay, cancellation, pagehide during initial compilation, failed/timed-out Cinematic, UI heartbeat during worker stalls, preserved storage, backpressure, resize, and bounded recovery. Results: [RENDER-STABILITY-BROWSER.json](RENDER-STABILITY-BROWSER.json). This validates scheduling and UI behavior, not shaders or GPU performance.

The existing simulated suites also pass: `tests/browser.py --ui-only` 40 checks, `tests/quality-browser.py` 17 checks, and `tests/experience-browser.py --offline` 80 DOM courses. Their GL doubles implement the required compile/timing contracts and disable real GPU work. Use `CHROMIUM_PATH` for browser selection and `PYTHONUTF8=1` on Windows. Node harnesses accept `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH`, with CLI overrides where documented.

Historical evidence is preserved separately: the original 12-second startup cap terminated real Low on NVIDIA/D3D11 at 12065.5ms; the app displayed the timeout at 12076.1ms and preserved its saved preference. This was a censored cold-start failure, not a frame-performance sample: [RENDER-STABILITY-BROWSER.hardware-low.json](RENDER-STABILITY-BROWSER.hardware-low.json).

The completed real-app hardware check used `node tests/render-stability-hardware.mjs`, real workers, production budgets, and NVIDIA/D3D11 with exclusive test GPU access. Its results are below. This check is separate from the optional `--real-worker-low` mode of the simulated-browser harness and from the shader benchmark matrix. See [RENDER-STABILITY-BENCHMARKS.md](RENDER-STABILITY-BENCHMARKS.md) for measured shader performance and backend details.

## Physical-GPU application result

The saved-Cinematic application smoke passed all 15 checks on NVIDIA RTX 3060 Ti / ANGLE D3D11 with real `KHR_parallel_shader_compile` and `EXT_disjoint_timer_query`. Low first became usable after 45.44 seconds. While the saved Cinematic candidate prepared for 159.36 seconds, the working Low renderer returned 7,867 frames; gameplay, pause/resume and resizing remained functional. The first Cinematic bitmap arrived 206.39 seconds after navigation. Saved settings, best times and progression were unchanged except the one legitimate gameplay attempt.

This deliberately cold run disabled Chromium shader disk cache (driver caches were not cleared). The maximum main-thread heartbeat gap was 1.075 seconds: the result demonstrates continued responsiveness during long preparation, not a promise of zero transient jank. No uncaught app/console errors occurred. All assertions, exact metrics and backend evidence are retained in [the compact hardware report](RENDER-STABILITY-HARDWARE.json); its raw 7.3 MB repeated frame trace is local test output, identified by SHA-256 in that report. The test is `node tests/render-stability-hardware.mjs` on the documented Windows/NVIDIA environment. Later Auto-only cache/pressure-cancellation changes were separately reviewed and unit-tested; they do not alter this manual-Cinematic path.

## WebGL specification references

The [WebGL 1 EXT_disjoint_timer_query specification](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query/) provides asynchronous elapsed GPU timing, requires returning to the event loop before results can become available, and invalidates timing during disjoint events. The implementation polls between tasks and never treats unavailable/disjoint results as fast GPU work. [KHR_parallel_shader_compile](https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/) supplies a completion-status query for asynchronous program preparation. Neither extension makes arbitrary synchronous driver calls preemptible from JavaScript.

The final Auto recovery safety change adds an immediate pause before rescue-worker preparation. It is specific to automatic active-worker recovery and does not alter the explicitly selected High/Cinematic path validated by the hardware probes. All 34 controlled-browser checks passed on the final source, including warning-before-readiness, blocked Resume/Restart during recovery without starting an attempt, and remaining paused after recovery. The complete Node suite passed 508 tests.
