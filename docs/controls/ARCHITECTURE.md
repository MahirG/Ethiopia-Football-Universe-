# Universal Football Control Architecture

The runnable web game now separates raw device signals from football intention. Keyboard, mouse, Gamepad API and touch controls feed semantic actions such as movement, sprint, shield, pass, through pass, lob pass, shoot, tackle, switch and cancel. Player simulation consumes those actions without changing ball physics or athlete attributes by device.

## Runtime layers

1. **Raw device input** — keyboard, mouse, browser Gamepad API and pointer events.
2. **Interpretation** — dead zones, sensitivity, hold duration, press/release transitions and active-device detection.
3. **Football intention** — normalized movement plus semantic action sets.
4. **Human simulation** — biomechanics, contact calculation, pending-action buffer and physically possible cancellation.
5. **Feedback** — automatic prompt switching, scalable touch UI and optional haptics.

## Implemented platform behavior

- Keyboard, mouse, Xbox/PlayStation-style browser gamepads and touch screens.
- Seamless device switching without resetting possession, camera or match state.
- Analog gamepad movement and analog virtual joystick movement.
- Separate mobile pass, through, lob, shoot, tackle, switch, sprint, shield and skill controls.
- Fixed/floating joystick setting, left-handed layout, touch scale, opacity and sensitivity.
- Gamepad dead-zone and sensitivity calibration controls.
- Action hold duration, release events, input buffering and early cancel support.
- Local settings persistence and automatic device-aware control prompts.
- The same match physics and contact solver for every input method.

## Production extensions

Native console SDK glyphs, adaptive-controller vendor APIs, cloud-latency compensation, authoritative online validation, gyro aiming, eye tracking and ranked matchmaking input pools remain integration points for their target platforms. They are not falsely emulated in the browser build.
