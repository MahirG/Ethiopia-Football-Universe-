# Phase 6 security and privacy

## Competitive integrity

- Inputs are monotonic and hash chained.
- Server time, field bounds, input magnitude, action cadence and rate limits are checked before acceptance.
- Clients may predict movement but never author final results or rating changes.
- Reconnect state resumes from the last server acknowledgement.
- Reports can reference evidence event IDs without exposing private save data.

## Supabase controls

- Every exposed table enables Row Level Security.
- Policies name the `authenticated` role and combine it with ownership checks.
- UPDATE policies use both `USING` and `WITH CHECK`.
- The public leaderboard is a `security_invoker` view over a deliberately public ranked-entry policy.
- The browser never receives a service-role or secret key.
- The match-authority function forwards the caller JWT so inserts remain subject to that user’s RLS policies.

## Personal data

Public ranked surfaces contain only player ID, display name, division, rating, record, fair-play score and region preference. Cloud saves, device IDs, match evidence and reports remain owner scoped. The production service must add retention automation, account deletion, appeal handling and regional privacy review before launch.

## Abuse operations

The data taxonomy supports abusive names, harassment, hate speech, cheating, disconnect abuse, match fixing and spam. Automated scores may prioritize review but should not create irreversible sanctions without documented human-review and appeal processes.
