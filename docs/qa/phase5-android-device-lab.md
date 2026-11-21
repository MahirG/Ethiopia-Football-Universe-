# EFU Phase 5 — Android Match Readiness & Measured Device QA

**Branch:** `feature/efu-device-lab-phase5`  
**Stacked on:** Mobile Controls Phase 4 (PR #34)  
**Merge status:** Keep draft; not a hardware-certified release.

## Implemented

1. `FrameHealthMonitor` tracks browser-rendered frame intervals with a bounded 2,400-frame rolling window and exposes average observed FPS, P95/P99 frame time, slow frames above 33.33ms and total captured match time. Background gaps longer than 2 seconds are excluded.
2. `MatchPerformanceProbe` reads the **real React Three Fiber Canvas** during an opt-in, live capture and reports renderer draw calls, triangles, allocated geometry/texture counts and device pixel ratio. Renderer counts are approximate and **not** physical GPU-memory measurement.
3. The **Device Lab** is accessible from the match toolbar. It provides Start/Stop Capture, visible metrics, a self-reported Android test checklist, and an export of a local JSON file containing only graphics preset, viewport dimensions/orientation, selected input source and performance data. No logs are sent to any server.
4. More reliable interrupted controls: queued touch actions are discarded on blur, held actions are released, gamepad disconnections reset stale input-device state.
5. `npm run device:validate` exercises the actual in-scene integration, deterministic statistics, bounded memory, simultaneous actions, virtual-input interruption and local-only report export. It runs in `npm run build`.

## How to perform the physical Android test

1. Open the **Vercel preview for this feature branch**, not the production website. Select Match.
2. Select **Performance** graphics. Start a live match and play until the live phase begins (after any intro).
3. Scroll to the match toolbar, open **Device Lab**, tap **Start capture**, and continue playing with joystick and action buttons for several minutes. The capture operates in the running game even when the panel is closed.
4. Return to Device Lab and stop. Check rolling average FPS, P95 frame time, and percentage of slow frames. Export the JSON report from the phone.
5. Repeat at **Balanced** and **Ultra**. Only use Ultra on devices where it remains responsive.
6. Test joystick + shot + sprint simultaneously, rapid action changes, background/foreground interruptions, portrait/landscape rotation, and left-handed preset. No button should stay pressed.
7. If available, pair a standard-mapped Bluetooth/USB gamepad and test press/hold, controller disconnect during sprint, reconnect, and return to touch controls.
8. Play a **complete match** and inspect the final score and career-state persistence. Check for crashes, severe heat, loss of input and disappearing character models.

### Acceptance guidance (not guarantees)

- **30 FPS device target:** P95 frame duration at or below ~33ms with minimal long stalls during sustained real gameplay.
- **60 FPS device target:** P95 under ~20ms is preferable to allow rendering overhead.
- Responsiveness, reliable control releases, no overlapping HUD, no crashes and no corrupted saves are mandatory, regardless of FPS.
- The FPS sample is the browser's frame-loop observation, not input-to-photon latency. The tool cannot directly measure thermal throttling, CPU/GPU utilization or VRAM. Note these manually.
- Keep one consistent graphics preset and camera for comparisons; replays and pause screens can distort measurements.

## Known limits

- We cannot physically operate the user's Android phone through this GitHub repository. A successful CI build or preview deployment does not certify device compatibility.
- No screenshots or physical device measurements have been captured in this branch; the Device Lab is the instrument **for collecting them**.
- No automatic quality downgrade or controller-driver installation is implemented.
- These diagnostics are disabled unless the player opts in; they do not alter game physics, AI behavior, career schemas or match rules.

## Review / acceptance checklist

- [ ] CI lint, all validators, TypeScript and Vite build pass.
- [ ] Vercel feature preview deploys successfully.
- [ ] Physical Android runs: compact screen, landscape, touch interruptions and controller reconnection.
- [ ] Repeat gameplay on several device classes; record memory/heat externally.
- [ ] Full match and saved career state verified.
- [ ] Actual screenshots + exported device reports reviewed before merging PR #35 and its preceding stacked PRs.
