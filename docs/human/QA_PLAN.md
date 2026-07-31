# Human-player QA and validation plan

## Automated gates

- `npm run human:validate`: architecture/data coverage and fairness policy.
- ESLint with zero warnings.
- Strict TypeScript build.
- Production Vite bundle.
- Existing audio database validation.

## Gameplay tests

1. Acceleration from rest, sprint top speed and fatigue degradation.
2. 30°, 60°, 90°, 135° and 180° turns at multiple speeds and surfaces.
3. Foot-plant displacement and visible skating measurements.
4. First touches at varied speed, spin, height, weak foot, pressure and rain.
5. Passing/shooting contact-point and trajectory synchronization.
6. Close/sprint/protective dribble touch distances.
7. Fair, late, reckless, last-man and dangerous tackle outcomes.
8. Shoulder contacts at different masses and relative velocities.
9. Goalkeeper set position, visual delay, dive direction, parry/catch/slip and screened shots.
10. Persistent fatigue, confidence, frustration and injury behavior across a full match.
11. Head scans before reception and non-ball visual attention.
12. Relationship influence on passing/support without deterministic exclusion.

## Visual tests

- Broadcast, follow, ball, free and replay cameras.
- LOD transitions at all quality presets.
- Eye focus, blink timing, eyelid contact and mouth/breathing transitions.
- Skin roughness, sweat, rain mixing, hair compression and dirt progression.
- Jersey panels under sprint, stop, rain and contact.
- No detached limbs, clipping eyes, frozen face, inverted knees or floating feet.

## Performance tests

- Low-end Android-class GPU profile, integrated laptop GPU and high-end desktop.
- 60 FPS target during standard broadcast gameplay.
- Stable frame pacing and input latency under rain, Ultra crowd and replay.
- Detailed-player count/draw calls by camera mode.
- Memory stability during repeated resets and long sessions.

## Expert review

Final physical approval requires professional footballers, coaches, sports scientists, goalkeeping specialists, animators, digital-human artists and football analysts. Reference footage must be licensed for development use. No feature is approved solely because it looks cinematic.
