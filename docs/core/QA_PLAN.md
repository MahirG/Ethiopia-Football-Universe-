# Core Gameplay QA Plan

## Determinism and authority

- Replay the same seed and event stream and verify identical score, restarts, cards, possession transitions and statistics.
- Reject duplicate goal, card, substitution and restart event IDs.
- Verify stale, reordered and impossible inputs are rejected without moving authoritative state.

## Physical football scenarios

Validate crowded penalty areas, high-speed counters, wet sliding tackles, strong wind, goalkeeper collisions, multiple deflections, last-minute penalties, red cards, aerial multi-player contact, goal-line clearances, millimetric offside, VAR reversals, weak-foot volleys, knuckleballs, referee contact, wet-ball drops, extra-time fatigue and shootout sudden death.

## Acceptance gates

- Entire ball must cross the entire line.
- No rule or scoring decision may depend on animation completion.
- No AI-only ball attraction, speed boost or physics exception.
- Goalkeeper decisions must use delayed observation and current trajectory only.
- Possession must be confidence-based and may become loose without tackle animations.
- Passing, shots and touches must expose physical causes for error.
- Pressing must increase fatigue and open space elsewhere.
- Weather and surface effects must apply symmetrically.
- Statistics and xG must be observational and must never influence outcomes.
- Mobile performance scaling must reduce visual cost before simulation rules.

Run `npm run core:validate`, `npm run lint`, and `npm run build` before release.
