# Render stability benchmarks

This benchmark measures real WebGL shader compilation and synchronized drawing from exact Git source snapshots. It separates JavaScript preparation from driver work deferred until a program is linked or first used. The public evidence is consolidated in [RENDER-STABILITY-BENCHMARKS.json](./RENDER-STABILITY-BENCHMARKS.json); raw diagnostic runs are retained under the ignored `test-results/stability/archives/benchmarks/2026-09-20/` directory.

## Regression reproduced

The source change from `9fb2194c200b694a8b340219507894c55970ae3b` to `9e3716927e03d2861cb1f6508676fb350106fe76` added `POM_STEPS=40` on High and `POM_STEPS=64` on Cinematic. Each POM step called the full relief scene traversal, and secondary normal and visibility work added more height samples.

At 640 x 360 High on the simple scene, exact before/after snapshots on SwiftShader produced:

| Revision | Prepare | First usable | First synchronized draw | Warm mean |
| --- | ---: | ---: | ---: | ---: |
| before9fb | 18.9 ms | 45,423.8 ms | 45,400.4 ms | 890.6 ms (n=1) |
| regression9e | 23.7 ms | 55,217.5 ms | 55,188.8 ms | 1,428.5 ms (n=1) |

The regression increased first usable time by 21.6% and the warm draw by 60.4% in this controlled pair. Compile/link returned in about 20 ms on this backend while the first synchronized draw took tens of seconds, confirming deferred software-driver JIT work. Earlier 30-second attempts were externally terminated inside the first draw and remain in the consolidated JSON as censored lower bounds.

## Historical software matrix

This 640 x 360 matrix used one cached program per revision and tier across all four scenes and five synchronized warm draws per cell. Scene values are **mean / p95 / worst** milliseconds. With n=5, nearest-rank p95 equals the maximum and is only a schema-consistent tail indicator.

| Revision | Tier | Prepare | First usable | Simple | Obstacles | Ramps/platforms | Portal/final |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| before9fb | Low | 18.1 | 32,754.8 | 445.7 / 447.7 / 447.7 | 566.7 / 626.6 / 626.6 | 442.1 / 444.0 / 444.0 | 479.0 / 614.0 / 614.0 |
| before9fb | Medium | 18.7 | 35,102.9 | 681.7 / 726.9 / 726.9 | 607.2 / 728.4 / 728.4 | 607.8 / 733.1 / 733.1 | 524.3 / 526.9 / 526.9 |
| before9fb | High | 19.5 | 45,751.7 | 1,011.6 / 1,223.3 / 1,223.3 | 1,043.5 / 1,184.3 / 1,184.3 | 1,037.8 / 1,175.2 / 1,175.2 | 1,161.8 / 1,325.3 / 1,325.3 |
| before9fb | Cinematic | 19.3 | 60,725.4 | 1,270.3 / 1,438.1 / 1,438.1 | 1,445.7 / 1,501.7 / 1,501.7 | 1,270.2 / 1,546.0 / 1,546.0 | 1,400.4 / 1,589.3 / 1,589.3 |
| regression9e | Low | 19.5 | 37,630.8 | 585.6 / 659.2 / 659.2 | 511.8 / 653.2 / 653.2 | 473.4 / 476.3 / 476.3 | 510.6 / 651.9 / 651.9 |
| regression9e | Medium | 19.7 | 38,924.1 | 597.8 / 768.4 / 768.4 | 694.0 / 801.2 / 801.2 | 552.1 / 557.6 / 557.6 | 652.7 / 771.3 / 771.3 |
| regression9e | High | 24.3 | 55,217.6 | 1,741.7 / 1,997.7 / 1,997.7 | 1,536.3 / 2,072.2 / 2,072.2 | 1,793.5 / 2,135.6 / 2,135.6 | 1,903.4 / 2,201.3 / 2,201.3 |
| regression9e | Cinematic | 22.9 | 69,868.0 | 1,996.1 / 2,251.6 / 2,251.6 | 1,924.8 / 2,413.7 / 2,413.7 | 2,132.2 / 2,489.9 / 2,489.9 | 2,049.2 / 2,595.1 / 2,595.1 |

These are software-rendering measurements from `ANGLE (Google, Vulkan ... SwiftShader Device (Subzero), SwiftShader driver)`. They are evidence of the regression and are not physical-GPU frame rates.

## Historical physical-GPU boundary

The RTX 3060 Ti D3D11 run used two discarded warmup draws and ten measured draws. The exact before snapshot completed all tiers. The regression completed Low and Medium, but High and Cinematic did not return from preparation before the external 120-second watchdog.

| Revision | Tier | Status | Prepare / lower bound | Warm means by scene |
| --- | --- | --- | ---: | --- |
| before9fb | Low | passed | 30,264.8 ms | 2.42 / 2.67 / 3.81 / 3.13 ms |
| before9fb | Medium | passed | 34,292.3 ms | 3.40 / 4.71 / 3.21 / 4.20 ms |
| before9fb | High | passed | 60,314.5 ms | 5.55 / 5.32 / 5.48 / 5.70 ms |
| before9fb | Cinematic | passed | 84,597.3 ms | 6.29 / 6.17 / 6.35 / 7.30 ms |
| regression9e | Low | passed | 38,558.5 ms | 2.69 / 2.97 / 2.97 / 2.75 ms |
| regression9e | Medium | passed | 37,367.7 ms | 3.07 / 3.16 / 3.24 / 3.35 ms |
| regression9e | High | censored | >120,128 ms | no draw reached |
| regression9e | Cinematic | censored | >120,103 ms | no draw reached |

The renderer was `ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti ... Direct3D11 vs_5_0 ps_5_0, D3D11)`. The harness rejects a hardware run if the unmasked renderer contains `SwiftShader`.

## Final software candidate and strict guard

The final worktree was measured on SwiftShader with the same four scenes, five draws, no discarded warmup, one round, a 240-second external limit per tier, and a **1,600 ms worst-warm guard declared before the run**. The guard is a local diagnostic threshold and not a CI or hardware guarantee.

| Tier | Status | Prepare | First usable | Simple | Obstacles | Ramps/platforms | Portal/final |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Low | pass | 56.9 | 38,794.8 | 1,028.40 / 1,218.90 / 1,218.90 | 1,071.26 / 1,410.60 / 1,410.60 | 1,205.66 / 1,498.40 / 1,498.40 | 1,098.96 / 1,296.60 / 1,296.60 |
| Medium | pass | 42.3 | 39,252.1 | 837.66 / 952.50 / 952.50 | 846.48 / 975.80 / 975.80 | 817.32 / 962.90 / 962.90 | 766.14 / 974.30 / 974.30 |
| High | **fail** | 94.4 | 51,471.8 | 2,503.58 / 2,983.50 / 2,983.50 | 2,711.82 / 3,721.60 / 3,721.60 | 2,131.24 / 2,573.10 / 2,573.10 | 1,739.58 / 2,086.20 / 2,086.20 |
| Cinematic | **fail** | 97.2 | 68,580.8 | 1,911.36 / 2,415.10 / 2,415.10 | 2,263.70 / 2,540.60 / 2,540.60 | 2,290.24 / 2,512.60 / 2,512.60 | 2,072.58 / 2,396.10 / 2,396.10 |

Values are **mean / p95 / worst** milliseconds. High and Cinematic recorded every requested scene before returning failure; both exceeded the guard in all four cells. Medium also shows the importance of repetition: an immediately preceding process exceeded the guard once at 1,731.3 ms, while the complete repeat above stayed below 976 ms in every cell.

A same-campaign simple-scene control used identical launch flags, warmup, sample count, guard, and fresh-process policy for all three sources:

| Revision | Tier | Status | First usable | Warm mean | Warm worst |
| --- | --- | --- | ---: | ---: | ---: |
| before9fb | Low | pass | 33,908.9 | 488.02 | 626.30 |
| regression9e | Low | pass | 41,645.1 | 782.54 | 1,011.70 |
| fixed | Low | pass | 37,653.0 | 723.62 | 887.10 |
| before9fb | High | pass | 45,716.1 | 1,054.08 | 1,192.90 |
| regression9e | High | fail | 65,658.9 | 2,472.84 | 3,225.20 |
| fixed | High | pass | 45,499.4 | 1,386.90 | 1,448.90 |

In this paired control, fixed High reduced warm mean by 43.9% and worst time by 55.1% versus 9e; fixed Low reduced mean by 7.5%. The full matrix still fails the software guard for High and Cinematic, so the evidence supports a regression improvement and also shows that the software threshold is not met consistently. It does not justify treating SwiftShader numbers as physical-GPU performance.

## Final candidate on RTX 3060 Ti

High and Cinematic use a generated relief-noise LUT and two programs: a surface pass and a shade pass. Both tiers completed within a 180-second external group limit. In the 640×360 matrix runs, shader-link time varied materially between fresh Chrome processes: total preparation ranged from 65.8 to 95.9 seconds for High and from 99.3 to 124.4 seconds for Cinematic. The repeated two-round run measured these stages:

| Tier | LUT | Surface program | Shade program | Total prepare | First usable |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low | none | none | 22,195.0 ms | 22,195.0 ms | 22,804.3 ms |
| Medium | none | none | 53,109.8 ms | 53,109.8 ms | 53,954.3 ms |
| High | 6.0 ms | 28,530.0 ms | 67,339.4 ms | 95,888.9 ms | 95,929.7 ms |
| Cinematic | 7.1 ms | 17,396.2 ms | 81,899.5 ms | 99,315.7 ms | 99,363.2 ms |

Each scene and round used three warmup draws followed by ten measured draws. Round 1 is preserved rather than discarded; round 2 repeats all four scenes in the same WebGL context and program pair.

| Tier | Round | Simple | Obstacles | Ramps/platforms | Portal/final |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low | 1 | 10.25 / 16.00 / 16.00 | 8.43 / 15.40 / 15.40 | 8.42 / 14.60 / 14.60 | 9.93 / 17.90 / 17.90 |
| Low | 2 | 9.68 / 16.10 / 16.10 | 8.35 / 15.80 / 15.80 | 10.23 / 16.70 / 16.70 | 9.22 / 13.80 / 13.80 |
| Medium | 1 | 14.93 / 22.90 / 22.90 | 18.94 / 35.20 / 35.20 | 6.25 / 19.60 / 19.60 | 5.86 / 14.20 / 14.20 |
| Medium | 2 | 2.42 / 3.20 / 3.20 | 2.38 / 3.20 / 3.20 | 2.16 / 2.90 / 2.90 | 2.21 / 3.00 / 3.00 |
| High | 1 | 9.97 / 33.20 / 33.20 | 4.05 / 4.50 / 4.50 | 3.92 / 4.60 / 4.60 | 3.83 / 4.40 / 4.40 |
| High | 2 | 3.48 / 4.10 / 4.10 | 3.52 / 4.20 / 4.20 | 3.59 / 4.10 / 4.10 | 3.83 / 4.60 / 4.60 |
| Cinematic | 1 | 5.34 / 6.50 / 6.50 | 5.17 / 5.90 / 5.90 | 4.73 / 5.60 / 5.60 | 4.85 / 5.50 / 5.50 |
| Cinematic | 2 | 4.42 / 5.10 / 5.10 | 4.55 / 5.20 / 5.20 | 4.45 / 5.20 / 5.20 | 4.77 / 5.50 / 5.50 |

Values are **mean / p95 / worst** milliseconds. With n=10, nearest-rank p95 also equals the maximum. High's first round simple-scene tail is a real retained warmup effect; by round 2 all four scenes converge to 3.48-3.83 ms.

## Resolution cap evidence

All stress sizes keep a 16:9 aspect ratio. A single compiled program pair is reused across resolutions within each tier.

| Tier | Internal size | Pixels | Round 1 mean / p95 / worst | Round 2 mean / p95 / worst |
| --- | ---: | ---: | ---: | ---: |
| High | 1632 x 918 | 1,498,176 | 20.45 / 23.40 / 23.40 | 19.87 / 20.10 / 20.10 |
| High | 1968 x 1107 | 2,178,576 | 28.06 / 28.30 / 28.30 | 28.31 / 28.60 / 28.60 |
| Cinematic | 1968 x 1107 | 2,178,576 | 36.14 / 39.40 / 39.40 | 34.53 / 34.90 / 34.90 |
| Cinematic | 2064 x 1161 | 2,396,304 | 38.21 / 39.30 / 39.30 | 38.03 / 38.20 / 38.20 |
| Cinematic | 2384 x 1341 | 3,196,944 | 49.98 / 50.70 / 50.70 | 49.95 / 50.60 / 50.60 |

The selected Cinematic limit is a 2,200,000-pixel budget applied dynamically to the current aspect ratio and DPR. The nearby 1968 x 1107 benchmark size is 2,178,576 pixels, about 0.98% below that budget. Its steady round mean is about 31% lower than the 3.20 MP result (34.53 versus 49.95 ms). The High limit remains a 1,500,000-pixel dynamic budget; the 1632 x 918 sample is 1,498,176 pixels, about 0.12% below it, and measured 19.87 versus 28.31 ms at 2.18 MP.

The harness supports a strict `--max-warm-ms` guard without discarding evidence. The 35 ms High and 50 ms Cinematic limits were then declared before separate shipping-size runs:

| Tier | Profile size | Guard | Status | Warm mean / p95 / worst | First usable |
| --- | ---: | ---: | --- | ---: | ---: |
| High | 1632 x 918 | 35 ms | pass | 21.79 / 22.80 / 22.80 ms | 81,590.4 ms |
| Cinematic | 1968 x 1107 | 50 ms | pass | 35.72 / 39.30 / 39.30 ms | 86,589.6 ms |

Both guards passed on this RTX 3060 Ti. They remain host-specific checks for sizes close to the dynamic budgets, not universal hardware guarantees.

## Diagnostic compile evidence

One-pass production High and multiple structurally reduced test-only variants remained censored at the D3D link stage after 90-180 seconds. Disabling POM entirely compiled in 54.9 seconds, while a split High candidate compiled and drew and the corresponding Cinematic shade pass initially remained censored. Removing secondary relief shading reduced High frame time but did not make that Cinematic shade program link within 120 seconds. This evidence motivated the final split pipeline and reduced shade call graph. The consolidated JSON records each diagnostic's source hash, translated-source size, ANGLE loop markers, exact last phase, and lower bound. Test-only degraded variants are labelled as diagnostics and are not shipping results.

A corrected test-only High pass timing run added `gl.finish()`, one-pixel `readPixels`, and `gl.getError()` while the surface framebuffer was still bound. The surface readback was RGBA `[88, 170, 1, 44]`, which decodes to depth 8.312 within the 0-24 range and nonzero key 300. Its five warm samples measured surface **558.48 / 682.30 / 682.30 ms**, shade **1,612.42 / 1,927.60 / 1,927.60 ms**, and total **2,170.94 / 2,607.60 / 2,607.60 ms**. Both passes contribute materially; shade accounts for about 74% of the measured mean in this diagnostic. An earlier no-readback pass timing result was implausible and is excluded from conclusions while retained in the raw archive.

## Method and usage

[render-benchmark.mjs](../tests/render-benchmark.mjs) snapshots tracked source files from historical revisions. For `WORKTREE`, it snapshots tracked and untracked nonignored `src/` files so new renderer modules are included. The matching fixture exporter runs the production uniform packing and shader generator from that snapshot. The benchmark then launches a fresh Chrome child per revision/profile/tier, prepares the LUT when present, compiles one or two production programs, reuses them across scenes or resolutions, synchronizes every draw with `gl.finish()` and a one-pixel `readPixels`, and records JSONL before every blocking stage. The coordinator kills the whole child tree on timeout and retains partial events as `censored_timeout`. Fresh browser processes were used, but the benchmark did not clear the driver shader cache; preparation times therefore include uncontrolled driver-cache state and show substantial run-to-run variance.

Set `PLAYWRIGHT_MODULE` when Playwright is not locally installed. Set `CHROMIUM_PATH` to choose a system browser; otherwise the harness uses the standard Windows Chrome path when present and falls back to Playwright's bundled Chromium. These are PowerShell commands on one line, so they can be copied without `cmd.exe` continuation syntax:

```powershell
$env:PLAYWRIGHT_MODULE='<absolute-path-to-playwright-module>'; node tests/render-benchmark.mjs --revisions before9fb=9fb2194c200b694a8b340219507894c55970ae3b,regression9e=9e3716927e03d2861cb1f6508676fb350106fe76 --profiles matrix --warm 5 --timeout-ms 150000 --output test-results/stability/historical-software-matrix.json
```

```powershell
$env:PLAYWRIGHT_MODULE='<absolute-path-to-playwright-module>'; node tests/render-benchmark.mjs --revisions fixed=WORKTREE --profiles matrix --tiers high,cinematic --warmup 3 --warm 10 --scene-rounds 2 --timeout-ms 180000 --hardware --output test-results/stability/final-candidate-matrix-rounds2.json
```

```powershell
$env:PLAYWRIGHT_MODULE='<absolute-path-to-playwright-module>'; node tests/render-benchmark.mjs --revisions fixed=WORKTREE --profiles high_caps,cinematic_caps --warmup 3 --warm 10 --scene-rounds 2 --timeout-ms 180000 --hardware --output test-results/stability/final-candidate-caps-rounds2.json
```

```powershell
$env:PLAYWRIGHT_MODULE='<absolute-path-to-playwright-module>'; node tests/render-benchmark.mjs --revisions fixed=WORKTREE --profiles release_high --warmup 3 --warm 10 --scene-rounds 1 --max-warm-ms 35 --timeout-ms 180000 --hardware --output test-results/stability/final-release-high-guard.json
```

```powershell
$env:PLAYWRIGHT_MODULE='<absolute-path-to-playwright-module>'; node tests/render-benchmark.mjs --revisions fixed=WORKTREE --profiles release_cinematic --warmup 3 --warm 10 --scene-rounds 1 --max-warm-ms 50 --timeout-ms 180000 --hardware --output test-results/stability/final-release-cinematic-guard.json
```

The synchronized draw path and the strict warm-time guard exist only in this benchmark harness. Production rendering does not call `gl.finish()` or `readPixels`.
