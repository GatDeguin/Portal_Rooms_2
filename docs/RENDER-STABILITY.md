# Render stability audit and release validation

## Scope and baseline

Compare `9fb2194c200b694a8b340219507894c55970ae3b` (before relief) with `9e3716927e03d2861cb1f6508676fb350106fe76` (regression). The delivered entry point is `index.html -> src/app.js`. Root JavaScript copies are legacy and were not edited. This fix retains silhouette relief and procedural vertex colors; it does not revert the feature.

Implementation and regression source: commit `4bcca09379f859eb252050fbf2a2b347145d9ac8`. Benchmark records retain their original `WORKTREE` labels and generated-shader hashes; the final Auto recovery guards were subsequently validated by the complete Node and controlled-browser reruns.

## Confirmed root cause

`mapReliefScene()` duplicated the scene union: 38 primitive candidates for ordinary targets, 39 for the portal, including disabled uniform slots that early-return. Each High pixel could run 40 POM samples and four refinements; Cinematic could run 64 plus six. That means up to 44/70 extra complete unions (1,672-1,716 / 2,660-2,730 primitive calls), after the primary march already found a surface. Dynamic branches and disabled objects reduce actual work, so these are structural upper bounds, not measured instruction counts.

This cost is per primary visible pixel with relief. It is not repeated in secondary reflection rays: `quickMat()` remains a cheap mean-pigment approximation. Relief also adds six height samples for the normal gradient and five for each of the key/rim light visibility probes (ten combined). Those height samples do not traverse the scene. Procedural vertex colors interpolate eight local lattice colors once per primary material; they remain intact. Ordinary shadow, AO, reflection and cinematic GI budgets were not increased by this fix.

Unchanged conditional scene-query budgets per shaded primary pixel (loops often exit early):

| Query | Low | Medium | High | Cinematic |
|---|---:|---:|---:|---:|
| Primary envelope march | 88 | 112 | 136 | 176 |
| AO | 3 | 4 | 6 | 8 |
| Key-light shadow | 16 | 28 | 44 | 64 |
| Additional rim shadow | 0 | 0 | 44 | 64 |
| Reflection traversal | 12 | 24 | 36 | 2 × 56 |
| Short GI bounce | 0 | 0 | 0 | 3 |

These are upper bounds when the corresponding shading branch executes, not a sum that every pixel always pays. POM is not invoked by those secondary traversals. The regression additionally evaluated a six-query full-scene normal for relief footprint, besides the six-query shading normal. Successful candidate refinement now uses local-primitive normals instead. The production lighting pass shares one central height sample: six gradient samples plus eight light probes and that center total fifteen local samples; there is no need to remove the visible feature to remove its duplicated scene traversal.

The resolution scale also previously multiplied DPR before applying the tier pixel cap: on large/high-DPI displays, even scale 0.5 could leave the same capped pixel count. It now multiplies the already capped target, so a catastrophic Auto recovery can actually reduce Low to one quarter of its pixel budget. The scale-order change alone preserves scale-1 dimensions. Separately, the measured Cinematic cap changes from 3.2 MP to 2.2 MP; High remains at 1.5 MP.

The old Worker sampled main-thread RAF intervals, capped at 250ms. `AdaptiveQuality.sample()` discarded samples above 250ms. Auto started Medium, and pausing cleared the watchdog even when a Worker frame remained outstanding. These paths hid the actual failure instead of triggering a downgrade.

## Candidate-only relief

1. Normal scene marching finds a base hit using the unchanged scene SDF.
2. `reliefCandidate()` resolves that material family to one instance once. It caches shape, extent, local ray, pigment coordinates, seed and ramp metadata.
3. `candidateBaseDistance()` evaluates only the selected box, rounded box, cylinder, ring or ramp. `candidateReliefDistance()` adds the existing `surfaceInset()` field. Neither function selects scene objects.
4. Quadratically spaced layers cover the finite candidate envelope while concentrating samples near the entry. High uses eight layers plus three safeguarded secant refinements; Cinematic uses fourteen plus four. Low, Medium and mediump have zero silhouette POM.
5. If no displaced surface is found, normal scene marching resumes with that instance excluded from the existing scene union. Starting at the entry, rather than jumping to its bounding-box exit, also finds thin surfaces overlapping its envelope. This is a variant of envelope continuation: the rejected candidate is absent from subsequent queries, so it cannot block the ray.
6. Excluded instance keys accumulate across at most two candidates in High and three in Cinematic. This prevents foreground resurrection after a later miss. The next ordinary surface uses its envelope when that bounded continuation budget is exhausted.
7. Instance resolution respects those same exclusion keys. Hit coordinates, seed and geometric normal are cached for primary shading; exclusions are then reset before secondary reflection/shadow queries. Objects sharing a material cannot steal each other's relief or vertex-color coordinates.

The normal comes from the cached primitive, avoiding full-scene normal queries on successful relief hits. A background without relief caches its normal before excluded foregrounds are restored. The primitive definitions, positions, dimensions and union order match their original hash after stripping only the explicit rendering exclusion gates. Physical collision code, level geometry, input, storage and the base camera remain protected by unchanged hashes.

The architecture regression walks the transitive GLSL call graph from POM. It rejects scene traversal, unions, object selection and object-uniform references anywhere in that graph, so renaming a full-scene wrapper cannot bypass the guard.

## Bounded programs and height reuse

On the tested D3D11 backend, reducing runtime POM work alone did not resolve shader preparation. A monolithic High/Cinematic program still exceeded the diagnostic compile limits. High/Cinematic highp therefore use two programs: a surface pass performs the primary scene hit, candidate refinement and optional continuation; a lighting pass reconstructs the recorded instance and applies the existing material/lighting model. Low, Medium and mediump retain a single pass.

The intermediate target is universally renderable RGBA8 with NEAREST filtering. RG stores 16-bit depth over 24 world units (maximum rounding error 0.183 mm, below the original 1 mm hit tolerance); BA stores the exact 16-bit instance key. Dithering is disabled only while writing this target. A miss keeps its depth for the original atmosphere calculation. The forced instance selector is reset before secondary rays; scene queries in the lighting program always see the original union. Targets are reused and resized transactionally, and a failed second program cannot replace a working renderer.

The original periodic relief lattice is generated once on the GPU into a 256×256 RGBA8 texture, retaining the original hash arithmetic and quintic interpolation. Filtered lookup replaces repeated hash trees in the height field; no CPU approximation or downloaded asset is involved. Quantization/filtering is approximate: the GPU probe bounds the tested noise difference to 0.01. Original material noise and procedural vertex-color interpolation remain analytic and unchanged.

Production lighting shares one bounded 15-sample height loop between its six central-difference normal probes and two four-step relief shadows, with one common center sample. It has one height-field call site, avoiding repeated expansion of the material tree by WebGL 1 compilers. The numerical regression compares the sampling calculation with the original formulas over 500 generated cases. Custom material fixtures retain the standalone wrappers. These changes address compiler size and render cost together; measured cold preparation and frame results are reported separately, without claiming that asynchronous preparation makes compilation itself fast.

## Timing, safety and evidence

See [runtime lifecycle and limitations](RENDER-STABILITY-RUNTIME.md) and [measured benchmarks](RENDER-STABILITY-BENCHMARKS.md). CPU submission is not GPU completion. Production uses bounded asynchronous `EXT_disjoint_timer_query` when available, plus observed Worker draw/bitmap delivery time and independent main-thread watchdogs/backpressure. `gl.finish()`/readback are restricted to diagnostics/tests. Software-rendering measurements are explicitly labeled. The benchmark separately verifies whether Chrome uses the installed NVIDIA RTX 3060 Ti through D3D11; hardware and software results must not be combined. Mobile validation remains a separate release check.

## Completed verification

| Check | Result | Scope |
| --- | --- | --- |
| Node regression suite | 508 passed | Shader architecture/budgets, quality, worker lifecycle, resource rollback and unchanged gameplay/save contracts |
| Syntax/import/HTML | passed | 18 runtime modules, 134 unique IDs |
| Course verification | 275 passed | Routes and all 42 level definitions |
| Static HTTP verification | 20 files passed twice | Root serving and a project subdirectory matching Pages URL structure |
| Existing UI / quality / experience | 40 / 17 / 80 passed | Real DOM/input/storage with explicitly simulated GL |
| Worker/application scheduling | 34 passed | Native workers, controlled GL, all saved quality modes and fault injection |
| Relief WebGL | 72 passed | 49 pixel probes, 20 profile compiles, 3 production Cinematic renders |
| Original render assertions via WebGL adapter | 126 frames passed | Includes all 42 levels and effects-off parity; SwiftShader, not physical GPU |
| Original material assertions via WebGL adapter | 23 frames, 30 checks passed | Same material assertions as the EGL path; SwiftShader |
| Physical application smoke | 15 passed | RTX 3060 Ti/D3D11, saved Cinematic startup, simultaneous candidate/working workers, gameplay, resize and preserved saves |
| Physical frame-budget guards | 2 passed | High worst 22.8 ms < 35 ms at 1632×918; Cinematic worst 39.3 ms < 50 ms at 1968×1107 |
| Software frame-budget guard | not consistently met | The full SwiftShader High/Cinematic matrix exceeded 1600 ms; failed runs are retained in the benchmark evidence |

The original EGL runner remains available; this Windows host used the browser WebGL adapter because libEGL was unavailable. The shader benchmark is reported separately, including failed/censored runs and timing limits. Passing pixel/unit assertions does not imply a frame-time guarantee.

The physical application test had a 45.44-second cold Low startup and a 159.36-second Cinematic preparation while Low continued rendering. The maximum main-thread heartbeat gap was 1.075 seconds. These are significant remaining preparation/jank costs, not an instant-start claim. Mobile physical hardware has not been validated. See [the hardware report](RENDER-STABILITY-HARDWARE.json) and [runtime limitations](RENDER-STABILITY-RUNTIME.md).

## Automated commands

The normal `npm test` suite includes the shader call-graph budget and Worker/quality regressions. Keep the existing checks and run the real pixel probes as well:

```sh
npm test
npm run check
npm run test:course
npm run test:static
npm run test:ui
npm run test:quality
npm run test:experience
npm run test:relief
npm run test:stability
npm run test:webgl
npm run test:materials:webgl
```

Browser suites require Playwright and Chrome/Chromium. Set `CHROMIUM_PATH` to an installed executable and `PLAYWRIGHT_MODULE` to a Node Playwright installation when it is not resolvable as `playwright`. Python suites require `playwright`, `Pillow` and `numpy`; on Windows use Python UTF-8 mode (`PYTHONUTF8=1`) and substitute `python` for `python3` if necessary. The `--webgl` adapter preserves the original EGL pixel/material assertions while using actual browser WebGL; original EGL commands remain available on hosts with libEGL. Simulated UI/Worker suites explicitly label their simulated driver and do not claim GPU validation.

Benchmark commands, exact source revisions, backend identification, internal resolutions, sample counts and external timeouts are recorded in the benchmark document. Synchronized timing uses `finish/readPixels` only inside those test harnesses.

## Exact manual validation

Use a separate browser profile or export your existing localStorage before deliberately injecting failures. Normal tests do not require clearing saves.

```sh
git fetch origin
git switch fix/candidate-pom-render-stability
python -m http.server 8080
```

Open `http://localhost:8080/`. To test a Pages-style prefix, stop that server, run `python -m http.server 8080 --directory ..` from the checkout, and open `http://localhost:8080/Portal_Rooms_2/` (replace `Portal_Rooms_2` with the actual checkout folder name). All imports and Worker URLs must return HTTP 200 without absolute-root paths.

### Desktop

1. Load an existing save; note current/unlocked rooms and best times. Start a room, move with the original controls, pause/resume, restart, return to the room list and reload. Saved records must remain unchanged except ordinary gameplay progress.
2. In Settings choose each of Auto, Low, Medium, High and Cinematic; reload after each selection. Auto starts Low and may advance with measured headroom; it never selects Cinematic. Explicit choices stay selected unless a visible startup failure message explains a temporary rescue renderer.
3. Compare the same camera/room in Medium, High and Cinematic. Inspect oblique floor joints, rounded cube edges, carpet behind the cube, ramps/platforms and the final portal. High must have actual inward relief, and Cinematic retains its finer relief/reflections/lighting budget. Look for transparent holes, flickering foreground returns and missing thin layers.
4. While a heavy tier is preparing, close Settings, choose another tier, resize the window and hide/show the tab. Menus must remain responsive; cancelled results must not override the last choice. A failed candidate must preserve the previous usable renderer and show an error.
5. Keep Auto running under load. A very slow/catastrophic frame should immediately reduce scale/tier. Sustained moderate pressure reduces quality progressively; recovery needs sustained headroom rather than oscillating each frame.
6. Confirm all 42 room entries remain present. Exercise a simple room, obstacles, ramps/platforms and room 42. Automated route/physics evidence is separate from a human playthrough of all rooms.

### Mobile and physical GPU release gate

1. Keep the desktop server running and connect the phone to the same LAN. Run `ipconfig` on Windows (or inspect network settings) to find the desktop IPv4 address, then open `http://<desktop-IP>:8080/` in Android Chrome and iOS Safari. If serving the parent directory, append the checkout folder name as above. Allow the server through the local firewall if prompted. This tests touch/input and rendering; sensor permissions need an HTTPS preview of this branch. The existing main Pages URL still serves the old build until merge/deploy.
2. Repeat startup with all five saved quality modes, then portrait/landscape resize, app background/foreground and Settings cancellation. Verify touch controls and existing save records.
3. Start with Auto and watch the reported tier. Test High/Cinematic explicitly only after Low/Medium are usable. If preparation fails, confirm the visible warning and prior renderer remain available.
4. Inspect the same material/silhouette cases at real device resolution. Record device, OS, browser, physical GPU, internal resolution, first usable frame, mean/p95/worst and any thermal throttling. Repeat after several minutes, not just immediately after launch.
5. Capture a remote browser performance trace during the same scenes before claiming a mobile frame-rate target. The provided Node benchmark launches desktop Chromium; it is not an Android/iOS automation harness. Neither SwiftShader nor one desktop GPU certifies mobile frame time.

## Remaining limits

The full SwiftShader matrix did not meet the predeclared 1600 ms warm-frame limit for High/Cinematic. A contemporaneous paired simple-scene run improved High from 2472.84 to 1386.90 ms mean, but that does not erase the other failures or certify stable software performance. The physical RTX frame-budget checks passed separately. Treat software rendering and untested mobile devices as remaining performance limits; Auto and watchdog protection remain necessary.

WebGL 1 has no universally available asynchronous fence/timer. A browser/driver call on the main thread cannot be interrupted by a JavaScript timeout; the fallback therefore rejects unobservable heavy preparation and uses a conservative rescue path. Worker termination protects the application event loop, but cannot promise recovery from an operating-system-wide GPU driver hang. Coarse POM is bounded approximate surface refinement, not exact displaced geometry, and secondary shadows/reflections continue to use the original envelope. No gameplay dimensions or save schema are changed.
