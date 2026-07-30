# Ethiopia Football Universe ⚽🇪🇹

A production-oriented, responsive Ethiopian football web game and management universe. The application combines a playable WebGL match engine with club discovery, career simulation, tactics, competitions, youth development, community events, localization and accessibility.

## What is implemented

- **Phase 2 playable 3D match** — React Three Fiber rendering, Rapier physics, an official 105 × 68 m pitch, 22 articulated athletes, AI pressure, goals, accelerated match time and responsive controls.
- **Athlete realism system** — multiple body builds and skin tones, two-segment limbs, layered jog/sprint gait, fatigue, breathing, head tracking, dribbling, kick animation, goalkeeper variation, detailed kits and dynamic shirt names/numbers.
- **Advanced football physics** — regulation-scale rigid body, aerodynamic drag, Magnus-style spin, wet/dry friction, subtle impact deformation, panel detail and high-speed motion trails.
- **Reactive pitch** — GPU-instanced grass, wind sway, wet-pitch sheen, puddles, boot and ball scuffs, grass particles, raised markings and animated goal nets.
- **Broadcast camera director** — broadcast, automatic director, follow, ball and free 8D cameras with predictive look-ahead, dynamic FOV, collision-safe limits, impact shake and buffered cinematic replays.
- **Stadium atmosphere** — quality-scaled instanced crowds, goal reactions, crowd waves, scrolling LED advertising, waving Ethiopian-color flags, dugouts, tunnel structure and floodlights.
- **Environment system** — afternoon, golden hour and night lighting plus clear, overcast, rain and wind conditions.
- **Graphics presets** — Performance, Balanced and Ultra profiles controlling DPR, grass, crowd density, rain, shadows and surface effects.
- **Club universe** — searchable, filterable registry seeded with Premier League, Higher League and historic/community clubs.
- **Persistent manager career** — club selection, fixtures, budget, training, recovery, scouting, facility upgrades, morale, fitness, reputation and board objectives.
- **Tactical laboratory** — formations, mentality, pressing, width, tempo and team instructions.
- **Competition, academy and community modules** — league tables, fixtures, awards, regional prospects, events and moderation principles.
- **Languages and accessibility** — English, Amharic, Afaan Oromo and Tigrinya foundations, reduced motion, appearance controls and mobile-first layouts.
- **Offline-ready PWA** — installable manifest, service worker and local persistence.

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
- Cameras: Broadcast, Director, Follow, Ball and Free 8D
- Free camera vertical movement: `Q` / `R`
- Replay: use the Replay control or score a goal
- Mobile: on-screen directional and action controls

## Architecture

```text
src/
├── components/      # Product surfaces and broadcast match interface
├── data/            # Data-driven clubs and localized content
├── hooks/           # Persistent local state
├── game/            # Rendering, physics, athletes, grass, stadium, cameras and effects
├── App.tsx          # Application shell and route state
├── styles.css       # Responsive design system
└── types.ts         # Shared domain types
```

The match engine uses original procedural assets so the repository remains runnable and legally clean. The architecture can later accept licensed GLTF athletes, motion-capture clips, KTX2/Basis materials, scanned stadiums, professional audio and server-authoritative services without replacing the product shell.

## Data and licensing

The club list is a structured research seed, not an assertion of official licensing. Official club badges, kits, sponsors, player names, likenesses, stadium scans, chants, music and competition branding require rights-holder approval before commercial release. Current visual identities, athletes and stadium elements are original placeholders.

## Deployment

- Pull requests and branch pushes run dependency installation, ESLint and production build checks.
- Merges to `main` build and deploy `dist` through GitHub Pages.
- Vite uses a relative asset base for repository-path deployment.

## Product roadmap

1. Core web vertical slice — implemented.
2. Phase 1 3D engine foundation — implemented.
3. Phase 2 realism, atmosphere and replay systems — implemented.
4. Licensed-quality GLTF athletes, professional mocap and compressed PBR asset packs.
5. Advanced officiating, set pieces, goalkeepers, tactical AI and commentary/audio buses.
6. Real backend, accounts, cloud saves and live operations.
7. Server-authoritative online multiplayer and spectator mode.
8. Native PC/Android clients with shared services.
9. Women’s football, youth national teams and additional divisions.

## Legal

This repository does not claim affiliation with the Ethiopian Football Federation, FIFA, CAF, any club, player, competition or sponsor. All third-party marks remain the property of their respective owners.
