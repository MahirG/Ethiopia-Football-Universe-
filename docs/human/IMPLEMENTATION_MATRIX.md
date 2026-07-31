# Master-prompt implementation matrix

| Prompt area | Repository implementation | Status |
|---|---|---|
| Digital human quality | Unique procedural anatomy, face geometry, age, asymmetry, role profiles, LOD | Implemented procedural foundation; licensed scans remain external |
| Skin | Physical material, region-independent roughness baseline, sweat/wetness/dirt progression | Implemented scalable browser approximation; multilayer scan textures external |
| Faces/eyes | Jaw/nose/lips/ears, eyes/irises/pupils, moisture, blinking, scanning, emotion | Implemented |
| Hair/facial hair | Six styles, beard profiles, speed/rain response, detail LOD | Implemented procedural approximation; strand groom assets external |
| Clothing/equipment | Jersey/short/sock/boot/goalkeeper material response, light cloth panels, stains | Implemented lightweight runtime; full cloth capture/native solver external |
| Biomechanics | Turn-rate, acceleration, braking, pelvis/torso counter-rotation, foot plants, balance | Implemented |
| Locomotion | Walk/jog/run/sprint, curved movement, deceleration, corrective steps, slip/stumble | Implemented procedural system; professional motion-matching database external |
| Movement signatures | Stride, cadence, arm swing, posture, scan frequency, touch rhythm, celebration | Implemented |
| Ball contact | Contact point, angle, foot, momentum, ability, pressure, weather, impulse/torque | Implemented |
| First touch | Incoming speed/height/spin context, cushion/heavy touch/header, mistakes | Implemented |
| Dribbling | Close, sprint and protective touch cadence; physics-based touch distances | Implemented core techniques; specialist mocap skills are data-ready |
| Shooting | Power, placed, finesse, chip, volley, half-volley metadata and physical output | Implemented |
| Passing | Short, driven, through, lofted, cross and backheel metadata/physical output | Implemented |
| Heading | Head contact point, jump visual, heading technique and contextual direction | Implemented core |
| Contact/collisions | Rapier capsules, mass/velocity response, stumble/balance/injury | Implemented browser-active response |
| Tackling | Poke/slide technique, contact validation, foul/card assessment | Implemented core |
| Goalkeepers | Delayed observation, set position, dive/claim/parry/catch and distribution | Implemented |
| Intelligence | Perception + utility actions, passing lanes, space, pressure, offside, roles | Implemented |
| Human imperfection | Contextual error from pressure, weak foot, fatigue, confidence, weather | Implemented |
| Awareness/head movement | Scanning, ball/target tracking, independent head/eye direction | Implemented |
| Communication | Leadership/urgency-based calls and referee protests with audio routing | Implemented foundation; actor/lip-sync assets external |
| Personality | 14 dimensions affecting AI, risk, pressing, discipline and emotion | Implemented |
| Fatigue/fitness | Workload, altitude, recovery, speed/technique/breathing/posture effects | Implemented |
| Injuries | Impact/fatigue/joint-risk model, pain, balance and performance reduction | Implemented foundation; medical review required |
| Emotional continuity | Persistent confidence/frustration/focus/aggression/joy/pain/pressure | Implemented |
| Celebrations/reactions | Individual style, independent body/emotion response | Implemented core |
| Referee interaction | Foul/card logic and personality-dependent protest | Implemented core |
| Environment | Rain/wind/traction/wetness/fatigue/ball/cloth/hair effects | Implemented for supported weather |
| Relationships | Trust, chemistry, respect, rivalry, mentorship, frustration | Implemented |
| Motion capture | Capture plan, requirements and replacement architecture | Production plan delivered; source capture not supplied |
| Camera detail | High/low player LOD and close facial/material detail | Implemented |
| Movement audio | Force/surface footsteps, contacts, calls, pain, saves | Integrated with AAA audio system |
| Online | Snapshot buffer, interpolation, reconciliation and contact de-dup | Architecture implemented; server/backend not supplied |
| Performance | Three LOD presets, simplified far renderer, adaptive existing DPR | Implemented and CI validated; hardware profiling remains required |
| Quality validation | Metric targets, telemetry, validator, QA plan | Implemented |
