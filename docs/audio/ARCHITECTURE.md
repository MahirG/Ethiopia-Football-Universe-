# Football Audio Architecture

## Runtime flow

`Gameplay/UI -> FootballAudioEventBus -> definition lookup -> cooldown/priority queue -> snapshot/mixer -> spatial or 2D renderer -> Web Audio destination`

Commentary and stadium announcements consume the same semantic event context but use separate priority, history, language and speech-synthesis logic.

## Modules

- `AudioProvider`: application-wide lifecycle, persistence, UI event delegation and profiler sampling.
- `FootballAudioEngine`: mixer buses, procedural renderers, snapshots, crowd/weather layers, spatial panners, cooldowns and voice stealing.
- `FootballAudioEventBus`: centralized semantic event dispatch.
- `catalog.ts`: complete event definitions, priorities, variation targets, routing and cooldowns.
- `profiles.ts`: data-derived supporter profiles for every club and stadium acoustic profiles.
- `commentary.ts`: five-language lead-commentary system, interruption priorities, recent-use suppression, captions and PA voice.
- `assets.ts`: async asset database, lazy loading, language unloading and rights status.
- `music.ts`: playlist metadata, shuffle, skip and track disabling.
- `network.ts`: semantic event packets and duplicate suppression for future online matches.
- `AudioSettingsPanel`: persistent bus volumes, languages, mono, dynamic range, captions and quality.
- `AudioDebugOverlay` and `AudioEventLab`: active voices, queue, memory estimate, crowd parameters, current snapshot and event triggers.

## Mixer buses

Master, Music, Commentary, Crowd, Stadium Announcer, Ball, Players, Referee, Weather, Environment, UI, Cinematics, Voice Chat and Replays.

## Snapshots

Main Menu, Team Selection, Pre-match, Normal Match, Dangerous Attack, Goal Celebration, Penalty, VAR Review, Half-time, Full-time, Replay, Pause Menu and Trophy Ceremony. Snapshot transitions use smooth gain targets; important speech reduces other buses without muting the stadium completely.

## Crowd model

Crowd output is calculated from intensity, home support, away support, match tension, attack threat, momentum, match importance, derby intensity and capacity ratio. Four independently filtered crowd layers represent foundation, home section, away section and percussion/chant energy. Home and away goal momentum alters these layers differently.

## Spatial model

Ball, players, referee, goal-frame and nearby physical events use HRTF panners. Commentary, UI, menu music and global crowd foundation remain 2D/hybrid. Event positions are supplied in pitch coordinates and can be made camera-relative through listener metadata.

## Recorded asset migration

Procedural sounds remain the fallback. A definition variation can later point to `AudioAssetDatabase` records. Missing or corrupt files resolve to procedural fallback rather than crashing. Long music/commentary assets are marked for streaming; short effects are decoded and pooled.
