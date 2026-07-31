# Ethiopia Football Universe ⚽🇪🇹

A production-oriented, responsive Ethiopian football web game and management universe. The application combines a playable WebGL match engine with club discovery, career simulation, tactics, competitions, youth development, community events, localization and accessibility.

## Live deployment

- Production: https://ethiopia-football-universe.vercel.app
- GitHub Pages workflow: deploys every merge to `main`

## What is implemented

- **AAA core match gameplay engine** — a deterministic, modular authority layer now drives independent-ball environmental forces, possession confidence, entire-ball goal/out detection, legal restarts, added-time accounting, tactical phases, pressing, referee evidence, VAR-ready reviews, goalkeeper reads, set pieces, medical protocols, substitutions, event-derived statistics/xG, replay capture, cross-device assists, network validation, anti-cheat telemetry and platform simulation budgets. All 95 supplied requirements are mapped in `docs/core/IMPLEMENTATION_MATRIX.md` and validated by `npm run core:validate`.
- **Phase 4 human match presentation** — improved anatomical silhouettes, proportionally varied faces and bodies, realistic hands, knees, calves, boots, hair and facial hair, plus smarter goalkeepers that read shots, move laterally and make reactive saves.
- **Live Amharic commentator** — spoken and captioned Amharic calls for introductions, kick-off, passing, shots, goalkeeper saves, goals, restarts, half-time, second-half and final results. Speech uses the browser voice engine and falls back to synchronized Ethiopic subtitles when an `am-ET` voice is unavailable.
- **Phase 3 prime match broadcast** — televised opening sequence, halftime and full-time packages, team celebrations, cinematic replay direction, live data panels and immersive presentation modes.
- **Procedural match audio** — browser-native crowd ambience, referee whistles, pass and shot impacts and goal surges without licensed sound files.
- **Dynamic atmosphere** — automatic afternoon-to-golden-hour-to-night progression, moving cloud banks, variable rain intensity, lightning flashes, floodlight shafts, lens flare and celebration confetti.
- **Facial and fatigue polish** — blinking, effort expressions, shouting, sweat response, dirt buildup, breathing, late-match posture and match-long stamina degradation.
- **Live match telemetry** — attacking territory, passes, shots, ball speed, controlled-player distance and stamina presented through a broadcast analytics panel.
- **Phase 2 playable 3D match** — React Three Fiber rendering, Rapier physics, an official 105 × 68 m pitch, 22 articulated athletes, AI pressure, goals, accelerated match time and responsive controls.
- **Athlete realism system** — multiple body builds and skin tones, two-segment limbs, layered jog/sprint gait, head tracking, dribbling, kick animation, goalkeeper variation, detailed kits and dynamic shirt names/numbers.
- **Advanced football physics** — regulation-scale rigid body, aerodynamic drag, Magnus-style spin, wet/dry friction, subtle impact deformation, panel detail and high-speed motion trails.
- **Reactive pitch** — GPU-instanced grass, wind sway, wet-pitch sheen, puddles, boot and ball scuffs, grass particles, raised markings and animated goal nets.
- **Broadcast camera director** — broadcast, automatic director, follow, ball and free 8D cameras with predictive look-ahead, dynamic FOV, collision-safe limits, optional impact shake and buffered cinematic replays.
- **Stadium atmosphere** — quality-scaled instanced crowds, goal reactions, crowd waves, scrolling LED advertising, waving Ethiopian-color flags, dugouts, tunnel, roof structure and floodlights.
- **Environment system** — dynamic match lighting plus fixed afternoon, golden hour and night presets; clear, overcast, rain and wind conditions with adjustable intensity.
- **Graphics presets** — Performance, Balanced and Ultra profiles controlling DPR, grass, crowd density, rain, shadows and surface effects.
- **Club universe** — searchable, filterable registry seeded with Premier League, Higher League and historic/community clubs.
- **Persistent manager career** — club selection, fixtures, budget, training, recovery, scouting, facility upgrades, morale, fitness, reputation and board objectives.
- **Tactical laboratory** — formations, mentality, pressing, width, tempo and team instructions.
- **Competition, academy and community modules** — league tables, fixtures, awards, regional prospects, events and moderation principles.
- **Languages and accessibility** — English, Amharic, Afaan Oromo and Tigrinya foundations, spoken/captioned Amharic match commentary, reduced motion, appearance controls, optional camera shake, independent stadium/commentary volume and mobile-first layouts.
- **Offline-ready PWA** — installable manifest, service worker and local persistence.


## Complete human-player simulation foundation

The match engine now runs each of the 22 footballers as an independent human simulation agent rather than a shared animation preset:

- deterministic position-specific bodies, faces, preferred feet, weak-foot ability, personalities and movement signatures;
- persistent fatigue, exertion, sweat, wetness, dirt, balance, confidence, frustration, pain and injury state;
- biomechanical acceleration, braking, turning-radius, traction, weight-transfer and planted-step locomotion;
- camera-dependent digital-human detail with articulated limbs, hands, feet, facial structure, blinking, eye focus, scanning, breathing and effort expressions;
- utility-based tactical perception of space, pressure, passing lanes, shooting lanes, offside, teammates, opponents, score and match time;
- physically calculated foot, head and goalkeeper-glove contacts using momentum, contact angle, technique, skill, pressure, fatigue, weather and weak-foot error;
- contextual first-touch mistakes, passing/shooting variation, dribbling cadence, tackles, fouls, cards, collision balance and injury risk;
- goalkeeper perception delay, set position, trajectory reading, lateral adjustment, claiming, catching and parrying without privileged shot-destination knowledge;
- relationship, communication, emotional-continuity and officiating reaction foundations;
- server-authoritative networking and interpolation policy, motion-capture capture plan, asset register, performance presets and professional-footage validation targets.

The runnable web build uses original procedural geometry and animation. Photogrammetry/scanned 150k–300k cinematic characters, full FACS facial capture, professional football mocap, strand hair, production cloth simulation and a real authoritative multiplayer server require external licensed assets, capture sessions and backend infrastructure. Those requirements are documented in `docs/human/` and `data/human/` rather than falsely represented as already supplied.

## Complete football audio system

The web game now includes a centralized, data-driven audio architecture rather than direct sound calls:

- semantic gameplay, UI, career, ceremony, online and replay events;
- 14 independently controlled mixer buses and 13 smooth mix snapshots;
- layered home/away crowd energy driven by tension, threat, momentum, importance, derby and capacity;
- distinct Ethiopian club supporter profiles and major-stadium acoustic profiles;
- spatial ball, player, goalkeeper, referee, frame and net events;
- dynamic rain, wind and environmental layers;
- Amharic, Afaan Oromo, English, Tigrinya and Somali commentary/PA foundations;
- commentary priorities, cooldowns, usage history, cancellation and pronunciation records;
- persistent volume, language, mono, dynamic-range, subtitle, caption and quality controls;
- menu/UI audio, procedural music metadata, career and ceremony event coverage;
- semantic multiplayer synchronization and duplicate suppression;
- audio profiler, designer event lab, legal asset replacement pipeline and automated validation.

The playable repository uses original procedural Web Audio synthesis and browser speech as legally safe fallbacks. Real chants, anthems, actor commentary and music remain clearly marked recording/licensing slots; no unauthorized online or broadcast audio is included. See `docs/audio/` and `data/audio/`.

## Run locally

```bash
npm install
npm run dev
```

## Production validation

```bash
npm run lint
npm run build
npm run preview
```

## Controls

- Move: `WASD` or arrow keys
- Sprint: `Shift`
- Pass: `E`
- Shoot: `Space`
- Tackle / challenge: `F`
- Finesse modifier: `Alt`
- Chip or loft modifier: `Q`
- Cameras: Broadcast, Director, Follow, Ball and Free 8D
- Free camera vertical movement: `Q` / `R`
- Replay: use the Replay control or score a goal
- Match data: use the chart control inside the broadcast frame
- Amharic commentary: use the radio control and independent `አማርኛ` volume slider
- Mobile: on-screen directional and action controls

## Architecture

```text
src/
├── core/            # Authoritative states, rules, physics, tactics, officials, set pieces, stats, networking and QA
├── components/      # Product surfaces and prime broadcast match interface
├── data/            # Data-driven clubs and localized content
├── hooks/           # Persistent local state
├── game/            # Rendering, physics, match orchestration, stadium, cameras and effects
├── human/           # Biomechanics, perception, utility AI, contacts, emotion, digital-human rig and networking
├── App.tsx          # Application shell and route state
├── styles.css       # Responsive design system
└── types.ts         # Shared domain types
```

The match engine uses original procedural assets so the repository remains runnable and legally clean. The architecture can later accept licensed GLTF athletes, motion-capture clips, KTX2/Basis materials, scanned stadiums, professional commentary and server-authoritative services without replacing the product shell.

## Data and licensing

The club list is a structured research seed, not an assertion of official licensing. Official club badges, kits, sponsors, player names, likenesses, stadium scans, chants, music and competition branding require rights-holder approval before commercial release. Current visual identities, athletes, sounds and stadium elements are original procedural placeholders.

## Deployment

- Pull requests and branch pushes run dependency installation, ESLint and production build checks.
- Merges to `main` deploy through the connected Vercel project and the GitHub Pages workflow.
- Vite uses a relative asset base for repository-path deployment.

## Product roadmap

1. Core web vertical slice — implemented.
2. Phase 1 3D engine foundation — implemented.
3. Phase 2 realism, atmosphere and replay systems — implemented.
4. Phase 3 cinematic polish, audio and broadcast presentation — implemented.
5. Phase 4 human athlete upgrade, goalkeeper AI and Amharic commentary — implemented.
6. Complete procedural human-player simulation foundation — implemented.
7. Licensed-quality scanned athletes, professional mocap and compressed PBR asset packs.
8. Advanced set pieces and expanded referee/VAR presentation.
9. Real backend, accounts, cloud saves and live operations.
10. Server-authoritative online multiplayer and spectator mode.
11. Native PC/Android clients with shared services.
12. Women’s football, youth national teams and additional divisions.

## Legal

This repository does not claim affiliation with the Ethiopian Football Federation, FIFA, CAF, any club, player, competition or sponsor. All third-party marks remain the property of their respective owners.


## Living football world system

The match now runs through a data-driven football-world layer with configurable competitions, tournament rules, Ethiopian venue archetypes, engineered surfaces, ball profiles, dynamic attendance, crowd groups and emotional memory, active benches and stadium staff, synchronized screens, match-day phases, cultural presentation, ceremonies, accessibility controls, world networking snapshots and automated validation. See `src/world/`, `data/world/` and `docs/world/`.

Run `npm run world:validate` to validate the competition, venue, surface, ball, operations and network manifests.

Run `npm run core:validate` to verify the complete 95-requirement gameplay manifest, module coverage and live match integration.
