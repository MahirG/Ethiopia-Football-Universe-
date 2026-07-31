# Phase 6 connected-platform architecture

## Runtime layers

1. **Identity layer** — creates an offline-safe guest identity and upgrades to an authenticated cloud owner when Supabase Auth is connected.
2. **Gateway layer** — exposes one interface for identity, cloud saves, matchmaking, rooms, leaderboards and heartbeats. `LocalOnlineGateway` is deterministic and always available; `SupabaseOnlineGateway` attempts the secured Data API and falls back without deleting local progress.
3. **Matchmaking layer** — starts with a narrow rating and latency search, then expands both over time while respecting fair-play restrictions and mode-specific ceilings.
4. **Session layer** — owns room codes, participants, ready checks, authority region, reconnect window and last acknowledged state.
5. **Integrity layer** — sequences inputs, canonicalizes payloads, hash-chains evidence and rejects impossible position, cadence, clock and rate states.
6. **Persistence layer** — stores revisioned, checksummed cloud envelopes. Higher revisions cannot be silently replaced by older devices.
7. **Live operations layer** — defines seasons, events, eligibility, maintenance windows and non-pay-to-win competitive rewards as data.

## Authority boundary

The client predicts movement and presentation for responsiveness. A production server owns score, clock, ball state, contacts, cards, offsides, restarts, final result and rating changes. Reconnect restores the last acknowledged sequence and authoritative snapshot.

## Offline boundary

When no cloud configuration exists, the same UI and contracts run through local storage. This is not represented as a live multiplayer service; it is a deterministic development and offline-safe fallback.

## Environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or project publishable key supplied through the existing variable name
- `VITE_EFU_MATCH_SERVER_URL` for a future regional WebSocket authority service

No service-role or secret key belongs in the browser.
