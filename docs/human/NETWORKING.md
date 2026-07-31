# Competitive networking policy

## Authority

- Server-authoritative: ball, collisions, tackle validity, goals, offside, cards and injuries affecting gameplay.
- Client-predicted: local input and short-horizon locomotion.
- Interpolated: remote player transforms and animation state.
- Cosmetic-only local: facial micro-expression, sweat particles, cloth micro-motion and non-critical audio variation.

## Implemented foundation

`PlayerSnapshotBuffer` accepts monotonically ordered snapshots and samples a delayed render time. `reconcilePredictedState` blends small errors and hard-corrects only beyond the configured threshold. `SemanticContactGuard` prevents duplicate client/server contact effects.

## Production backend requirements

- 60 Hz authoritative simulation or a validated lower-tick model with sub-step ball/contact solving.
- 20 Hz or better snapshot stream with input sequence acknowledgement.
- Lag-compensated contact validation constrained by fairness windows.
- Signed authoritative events for goals/cards/penalties.
- Server-side movement and impossible-contact anti-cheat checks.
- Replayable deterministic event log for disputes and spectator synchronization.
