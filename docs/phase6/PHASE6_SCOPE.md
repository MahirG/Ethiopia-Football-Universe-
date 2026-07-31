# Phase 6 — Connected Football Platform

Phase 6 adds the persistent online-services layer required to turn Ethiopia Football Universe from a strong local football simulation into a connected competitive platform.

## Scope

- Guest and cloud player identities.
- Cross-device cloud saves with revision/conflict handling.
- Ranked, friendly, tournament, co-op and club matchmaking modes.
- Region, latency, skill and fair-play aware queue expansion.
- Ready checks, room codes, reconnect windows and resumable sessions.
- Seasonal ratings, divisions, leaderboards and rewards without pay-to-win mechanics.
- Input sequencing, hash-chained match events, impossible-state checks and moderation evidence.
- Live-operations schedules, maintenance notices and competition eligibility.
- Native WebSocket match-server contract plus a deterministic offline/local simulator.
- Optional Supabase REST persistence, SQL schema, Row Level Security and Edge Function contract.

## Production boundary

The repository can ship the complete client, data, schema and server contract without pretending an authoritative fleet is already operating. Real low-latency online matches require provisioned Supabase credentials, a deployed match-authority service, regional realtime infrastructure, monitoring, abuse operations and load testing. When those services are absent the product remains playable through its deterministic local/offline gateway.
