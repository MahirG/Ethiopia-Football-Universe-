# Existing Audio Audit

## Engine and targets

Ethiopia Football Universe is a Vite, React 19, React Three Fiber, Three.js and Rapier browser game. It targets modern desktop and mobile browsers, installs as a PWA, and deploys through GitHub Pages/Vercel. The correct native technology is the Web Audio API with browser speech synthesis and data files that can later be consumed by a native or middleware-backed client.

## Pre-upgrade state

The project previously had:

- one looping filtered-noise crowd source;
- four procedural effects: pass, shot, save and goal;
- basic kickoff, halftime and full-time whistle tones;
- one Amharic speech-synthesis phrase table;
- one stadium-volume control and one commentary-volume control.

It did not have a semantic event bus, audio assets database, independent buses, snapshots, voice limits, spatial audio, profiles, language packs, PA announcements, UI/career/music audio, legal registry, debug tools, tests, or designer documentation.

## Risks found

1. Browser autoplay requires user activation before AudioContext and speech playback.
2. Native Amharic/Afaan Oromo/Tigrinya/Somali speech quality depends on installed browser/OS voices.
3. No licensed recordings were supplied, so shipping real chants, anthems, commentary actors or songs would be legally unsafe.
4. The game does not yet model every football event (VAR, substitutions, cards, injuries, shootouts), so those audio events are implemented and testable through the semantic event lab, ready for future gameplay sources.
5. Mobile devices need stricter voice limits and fewer continuous layers.

## Resolution

The upgraded runtime uses legal procedural synthesis for playable coverage and marks recorded-content slots as placeholders. It provides replacement paths, rights metadata, validation, quality presets, lazy language loading, event deduplication, and designer-facing configuration.
