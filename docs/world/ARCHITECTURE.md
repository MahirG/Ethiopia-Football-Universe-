# Living Football World Architecture

The world layer is data-driven and feeds the existing React Three Fiber/Rapier match rather than replacing it.

## Runtime pipeline

1. `WorldSelection` stores competition, venue, ball, importance, attendance, maintenance and accessibility choices.
2. `createMatchWorld` resolves immutable catalog records and computes attendance, pitch condition, crowd memory, staff, ceremony and telemetry from live match context.
3. `MatchView` updates the world state from score, time, weather, presentation phase and selected clubs.
4. `MatchScene` passes the state to pitch, ball, stadium and `WorldLayer` rendering.
5. `WorldLayer` renders venue architecture modifiers, operational staff, benches, officials, screens, choreography, arrival environment and trophy stage.
6. The audio engine already receives competition, stadium, crowd intensity, weather and event semantics; the world state makes those inputs consistent.

## Gameplay authority

Pitch grip, rolling resistance, bounce, waterlogging and ball coefficients are gameplay relevant. They are deterministic outputs and belong to authoritative online state. Decorative crowd motion, flags, vendors and ambient traffic remain local.

## Performance

Crowd and staff counts are capped by graphics tier. Existing instancing remains the primary crowd representation. Expensive architecture, screen and ceremony details scale down in Performance mode.
