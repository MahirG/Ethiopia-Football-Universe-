# EFU Phase 4 — Mobile Football Experience

Stacked on Human Realism Phase 3 (draft PR #33).

## Implemented in this branch

1. **Robust two-thumb inputs** (`src/input/UniversalControlsOverlay.tsx`): independent pointer ownership for nine game actions, safe capture/cleanup on pointer cancellation, loss, blur and unmount, pressed state, keyboard-accessible buttons, left-handed layout. Moving and pressing buttons are independent.
2. **Fixed/floating analog joystick**: floating origin is based on first contact (bounded inside the pad); central dead zone and sensitivity are configurable using the existing persistable control settings. Both touch and controller analog axes now share pure `normalizeStick` and `projectTouchStick` helpers.
3. **Standard browser gamepad cleanup** (`src/input/useUniversalInput.ts`): radial stick dead zone, connection/disconnection transitions, safe release of held actions and visibility/blur cleanup. Existing A/B/X/Y and shoulder mappings are preserved; no unsupported device mapping promises.
4. **Keyboard accessibility**: do not steal Tab, prevent typing into forms, preserve arrow/WASD gameplay, and assign tactics shortcut to `M` rather than Tab.
5. **Premium match HUD** (`src/input/mobile-football.css`): compact 2-row action grid with independent modifier row on small screens, balanced gold/emerald design, pressed/focus feedback, left-hand mirroring, safe-area padding and reduced-motion support.
6. **Settings**: exposed touch dead-zone slider, retained previous touch size/sensitivity/transparency/haptics controls, and clarified current controller mapping. Settings persist in the existing `efu-universal-control-settings-v1` key.
7. **Validation**: `scripts/mobile-controls-validate.mjs` tests radial analog math, touch direction/dead zones/clamping, interrupts/controller source guards, keyboard focus and responsive style wiring; runs before the TypeScript/Vite production build.

## Constraints and honest limitations

- This is the **touch/controller engineering and UI implementation**, not a native Android APK or a certified Bluetooth controller driver.
- A connected controller must be exposed by the Android browser/WebView Gamepad API to work. Exact button layout may vary with hardware, browser and OS.
- True floating joystick is currently bounded to the existing on-screen pad, not a free-roaming full-screen gesture surface.
- The current action layout is touch-first and responsive, but has not yet been measured in a running match on physical Android hardware.
- The game already tracks action hold durations; this PR adds visual pressed states, **not** a new aim/shot power simulation or false visual charge meter.
- No new input commands or modifications to scorekeeping, physics, AI, character rigs, league data, or career save schemas.
- Full controller re-binding, adaptive layout editor, native haptics and per-device calibration remain later engineering work.

## Manual QA gates

- [ ] Verify a complete 11v11 live match on a compact Android phone (320 / 360 / 393 CSS px), including orientation changes.
- [ ] Hold joystick and shoot simultaneously; verify independent release and no stuck inputs.
- [ ] Test a fast pass/tackle/sprint sequence, cancelled gestures, browser notifications, background/foreground, and switching presets.
- [ ] Test left-handed UI at portrait and landscape widths and on a tablet.
- [ ] Connect and disconnect a Bluetooth/USB standard-mapped controller while in a match; verify touch recovery and release of held actions.
- [ ] Confirm `Performance`, `Balanced`, `Ultra` have playable frame times with touch HUD overlay.
- [ ] Confirm keyboard navigation and screen-reader labels work outside the game.
- [ ] Run lint, all validators, TypeScript and production build; review screenshots before merge.

## Merge policy

Keep draft PR stacked on PR #33 until real-device QA and review. No direct push or merge to `main`.
