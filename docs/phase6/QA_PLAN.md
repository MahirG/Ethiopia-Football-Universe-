# Phase 6 QA plan

## Automated gates

- `npm run phase6:validate`
- `npm run lint`
- `npm run build`
- Existing audio, human, world and Phase 5 validators must remain green.

## Identity and cloud saves

- First launch creates one stable guest identity per browser.
- Display-name and region updates persist across reloads.
- A newer cloud revision cannot be overwritten by an older revision.
- Missing cloud configuration preserves local progression and communicates offline status.
- Network errors never erase local career, match history or accessibility settings.

## Matchmaking

- Every mode creates a ticket with the correct team size, ping ceiling and reconnect window.
- Skill and latency windows expand gradually rather than jumping immediately.
- Fair-play scores below 40 prevent queue entry.
- Cancelled tickets are removed.
- Match found, ready check, connection and room states are deterministic.

## Rooms and reconnect

- Private room codes are normalized and expiry enforced by the production service.
- Duplicate joins do not duplicate participants.
- Ready state transitions to playing only when all required participants are ready.
- Heartbeats update only the caller’s participant row.
- Reconnect resumes from the last acknowledged sequence and snapshot revision.

## Integrity

- Duplicate or decreasing sequences are rejected.
- Excessive clock drift, field positions, magnitudes, input rates and shot cadence are rejected.
- Event hashes change when any canonical input field changes.
- Final score and rating cannot be accepted from a client payload.

## Load and resilience targets

Before public launch, provisioned infrastructure must demonstrate:

- Queue p95 under 45 seconds in populated modes.
- Match-authority acknowledgement p95 under 100 ms within the selected region.
- Reconnect success above 98% during a 90-second window.
- No lost acknowledged events under process restart tests.
- Stable operation during at least 10,000 concurrent queue tickets and 1,000 active rooms in staged load testing.
