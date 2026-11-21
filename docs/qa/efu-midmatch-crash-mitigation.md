# EFU — Mid-match Android crash mitigation (hotfix)

Branch: `fix/efu-midmatch-renderer-recovery`, based on `feature/efu-device-lab-phase5` (draft PR #35). This is **not yet a production release**.

## What was observed from the source

- The live match clock triggered React state changes **10 times a second**. Each update propagated a new `world` value through the 3D environment.
- Stadium screens rebuilt and uploaded their **1024×512 WebGL canvas texture on every world-object update**, even when only the fractional match time changed. This consumed unnecessary GPU upload bandwidth.
- Player appearance materials were tracked in arrays without removing old entries when React detached the material, retaining references after replacements.
- No match-specific React error boundary or WebGL context-loss recovery UI existed. A renderer exception could take down the match experience instead of showing a safe restart option.
- Foul-contact detection created short-lived Vector3 clones in its nested 60 Hz loop.

These are credible stability/performance defects. **They are not proof of the exact crash observed on a particular phone.** Android may kill an app at the process level without notifying JavaScript, in which case a web error boundary cannot intercept it.

## What was changed

1. Clock updates now run every **250ms**, compensate using actual elapsed wall-clock time and clamp long background stalls. Core Rapier physics retains its existing fixed-step configuration.
2. Stadium texture uses half-size, no-mipmap allocation in Performance mode. Its text is refreshed in 5-match-minute buckets or when score/venue/phase changes; the actual HTML match clock remains live.
3. Player material tracking removes entries on detach.
4. New isolated `MatchSceneErrorBoundary` catches React rendering faults; the WebGL context watcher detects browser context loss/restoration and permits recovery attempts.
5. Recovery pauses the game, disables performance capture, releases held touch actions, switches to Performance quality and offers **Restart 3D graphics**. React match score and elapsed match minute stay present, but the ball and player simulation positions are rebuilt from the beginning when a new scene is mounted.
6. The inner match event loop now compares squared positions and velocities without repeated Vector3 allocations.
7. `npm run stability:validate` checks recovery wiring, reduced render workload, deterministic match-clock batching, material lifecycle and local-only crash diagnostics.

## Physical Android acceptance gates

- [ ] Reproduce original crash with phone/WebView model, approximate match minute and current quality preset.
- [ ] Open this branch's review deployment, start a live 11v11 match and play past the formerly problematic point.
- [ ] Repeat at least three full matches on Performance with sound disabled, then repeat with sound enabled to isolate audio vs GPU.
- [ ] Test entering half-time, resuming the second half, instant replay, goals and set pieces.
- [ ] Background the app during a shot, return and check for held buttons or freezes.
- [ ] Trigger WebGL context loss in a controlled developer test and verify the fallback UI, pause state, score retention and manual restart.
- [ ] Run Device Lab during a sustained match and export P95 frame time / draw-call measurements.
- [ ] Verify career files and results are not erased; verify the user's actual production domain and preview status.
- [ ] Review a runtime trace before declaring the original crash conclusively eliminated.

## Troubleshooting on phone

If the app closes entirely without an in-app recovery panel, the Android OS may be terminating the WebView process due to a GPU or memory fault. The next evidence should be the Android logcat crash segment from the same device or a screen recording of the exact moment, not a guess. In-app JavaScript errors are saved locally under `efu-last-client-crash`.

No external crash data is uploaded. Do not collect personal device identifiers or account details.
