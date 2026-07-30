# Ethiopia Football Universe ⚽🇪🇹

A production-oriented, responsive web game prototype and product portal for Ethiopian football. It combines a playable WebGL 3D match engine with club discovery, manager career simulation, tactics, competitions, youth development, community events, data administration concepts, localization and accessibility.

## What is implemented

- **Playable 3D match prototype** — React Three Fiber rendering, Rapier rigid-body football, 22 procedural athletes, official 105 × 68 m pitch geometry, AI pressure, goals, accelerated match time, weather, dynamic lighting and touch controls.
- **Club universe** — searchable, filterable registry seeded with Premier League, Higher League and historic/community clubs.
- **Persistent manager career** — club selection, fixtures, budget, training, recovery, scouting, facility upgrades, morale, fitness, reputation and board objectives.
- **Tactical laboratory** — formations, mentality, pressing, width, tempo and team instructions.
- **Competition center** — league table, fixtures, awards and extensible tournament modes.
- **Youth academy** — generated regional prospects, ratings, potential and traits.
- **Community** — local and online event discovery, event joining and safety/moderation principles.
- **World database** — schema-oriented club registry and CMS-ready administrative module design.
- **Languages** — English, Amharic, Afaan Oromo and Tigrinya interface foundations.
- **Accessibility** — appearance controls, reduced motion, contrast, input assistance and mobile-first layouts.
- **Offline-ready PWA** — installable manifest, service worker and local persistence.
- **Ethical design** — no pay-to-win mechanics; licensed assets remain replaceable data layers.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

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
- Pause/resume: `P`
- Camera: broadcast, follow, ball and free 8D modes
- Free camera vertical movement: `Q` / `R`
- Mobile: on-screen directional and action controls

## Architecture

```text
src/
├── components/      # Product surfaces and playable game view
├── data/            # Data-driven clubs and localized content
├── hooks/           # Persistent local state
├── game/            # Three.js scene, Rapier physics, pitch, stadium, athletes and cameras
├── App.tsx          # Application shell and route state
├── styles.css       # Responsive design system
└── types.ts         # Shared domain types
```

The browser prototype is intentionally modular so a later production game stack can replace local simulation and persistence with server-authoritative game services, PostgreSQL, Redis, matchmaking, secure authentication, moderation and a role-based CMS.

## Data and licensing

The club list is a structured research seed, not an assertion of official licensing. Official club badges, kits, sponsors, player names, likenesses, stadium scans, chants, music and competition branding require rights-holder approval before commercial release. The current visual identities are original placeholders.

League membership and competition formats can change. The application treats club and competition data as updateable content rather than hardcoded game logic.

## Deployment

- Pull requests and branch pushes run lint and production build checks.
- Merges to `main` build and deploy the `dist` output through GitHub Pages.
- Vite uses a relative asset base so the project works under the repository path.

## Product roadmap

1. Core web vertical slice — implemented.
2. Phase 1 3D engine foundation — implemented.
3. Asset realism pass: GLTF athletes, mocap animation and compressed PBR materials.
4. Advanced replays, crowd reactions, weather and broadcast cinematics.
5. Real backend, accounts and cloud saves.
6. Expanded player database and licensed assets.
7. Server-authoritative online multiplayer.
8. Native PC/Android game client with shared services.
9. Women’s football, youth national teams, additional divisions and commentary packs.

## Legal

This repository does not claim affiliation with the Ethiopian Football Federation, FIFA, CAF, any club, player, competition or sponsor. All third-party marks remain the property of their respective owners.
