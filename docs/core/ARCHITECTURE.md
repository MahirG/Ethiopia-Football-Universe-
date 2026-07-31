# AAA Core Match Gameplay Engine

The core layer is an authoritative, deterministic TypeScript simulation integrated into the live React Three Fiber/Rapier match. It does not replace the working rendering, human-athlete, audio or living-world layers; it coordinates them through explicit frame snapshots and gameplay decisions.

## Runtime modules

- `engine.ts` — authoritative orchestrator and frame transaction boundary.
- `stateMachine.ts` — duplicate-safe match phases and legal transitions.
- `clock.ts` — regulation time, stoppage accounting, added time and danger-aware ending policy.
- `physics.ts` — independent-ball environment forces, surface response, contact quality and possession confidence.
- `rules.ts` — entire-ball boundary tests, goals, legal restarts, offside lines, foul evidence and advantage.
- `tactics.ts` — attack/defend/transition shape, pressing intensity, compactness, rest defense and overloads.
- `referee.ts` — personality-bounded decisions, persistent fouling, cards, advantage and retrospective discipline.
- `goalkeeper.ts` — delayed perception, positioning, claims, dives, one-on-ones, parries and distribution.
- `setPieces.ts` — kickoffs, throws, corners, free kicks, penalties, walls, marking and restart assignments.
- `medical.ts` — contact/load injury evidence, head-injury protocol and substitution legality.
- `statistics.ts` — event-derived statistics, xG, highlights and authoritative replay frame capture.
- `controls.ts` — device-neutral input normalization and configurable assistance that preserves user direction.
- `network.ts` — sequence/timestamp validation, state sanity checks, correction telemetry and automation detection.
- `performance.ts` — platform simulation budgets and relevance-based update scheduling.
- `debug.ts` and `qa.ts` — gameplay visualisation data and acceptance findings.

## Integration contract

`MatchScene.Runtime` builds one immutable core frame from Rapier ball state, all 22 human runtime states, weather, pitch and match context. The core engine returns environmental acceleration, authoritative restart/goal decisions and telemetry. Rapier remains the source of physical motion; the core rules layer never teleports the ball to satisfy an animation. Ball reset occurs only after a legally detected stoppage.

The same snapshots, rules and solvers are used for the controlled player and AI. Difficulty changes AI decision cadence only; it never changes ball physics, player mass, rule thresholds or hidden outcome probabilities.

## Platform adaptation

The supplied Unreal Engine 5 architecture is translated to the existing web stack:

- Enhanced Input → normalized keyboard/gamepad/touch/accessibility input model.
- Chaos Physics → Rapier rigid-body simulation.
- Gameplay Tags / Message Subsystem → typed events and deterministic event stream.
- State Trees / Behavior Trees / EQS → utility AI, tactical phases and spatial perception.
- Motion Matching / Control Rig / IK → current procedural biomechanical and articulated athlete layers.
- Network Prediction / Replication Graph → snapshot buffers, authority validation and relevance scheduling.
- MetaSounds → semantic Web Audio engine.
- Automated Functional Testing / Gameplay Debugger → manifest validator, QA findings and debug frames.

External licensed mocap, scanned athletes, commercial server infrastructure and professional recording assets remain replaceable production inputs, not falsely embedded assets.
