# Human football simulation architecture

## Runtime layers

### 1. Player identity

`profiles.ts` deterministically creates a unique profile for all 22 players:

- role-specific height, mass and athletic distribution;
- 16 anatomical dimensions and asymmetry;
- 15 facial dimensions, skin/eye/hair variation and hairstyle/facial-hair identity;
- preferred foot and weak-foot rating;
- 17 football/athletic abilities;
- 14 personality dimensions;
- eight movement-signature dimensions.

The generator is a legal procedural fallback. Licensed scans can replace visual profiles without changing gameplay identity.

### 2. Persistent human state

`state.ts` stores fatigue, short-term workload, sweat, wetness, dirt, traction, balance, injury and breathing. Emotional state stores confidence, frustration, focus, aggression, joy, pain, pressure and the last important event. State persists through live play rather than resetting after animations.

### 3. Perception and utility AI

`decisionAI.ts` gives every player a world model containing the ball, teammates, opponents, space, passing lanes, pressure, defensive danger, offside risk, score and match progress. It evaluates context-sensitive utilities for holding, support, pressing, marking, recovery, dribbling, passing, shooting, clearing, tackling and goalkeeper actions.

No AI receives a future shot endpoint. Goalkeeper decisions use a delayed observation buffer and visible ball velocity.

### 4. Biomechanics locomotion

`biomechanics.ts` limits acceleration, deceleration and turn rate according to agility, balance, mass, fatigue, injury and surface traction. High-speed direction changes have wider turn radii. `footPlantOffset` separates swing and planted phases to reduce skating and supports stance/turn correction.

### 5. Physical football contact

`ballContact.ts` calculates every gameplay contact from:

- player position and facing;
- target direction;
- contact foot and weak-foot penalty;
- technique, power, lift and spin;
- player momentum and mass;
- first-touch/passing/shooting/dribbling/tackling ability;
- pressure, confidence, fatigue, balance, incoming speed and weather;
- deterministic contextual error.

The ball remains a Rapier rigid body. Contact applies impulse and torque; it is never parented or snapped to a player.

### 6. Techniques

`techniques.ts` defines close/sprint/protective dribbling, short/driven/through/lofted passing, crosses, backheels, power/placed/finesse/chip shooting, volleys, headers, clearances, tackles and goalkeeper contacts. Each technique has preparation, recovery, power, lift, spin, error and preferred-contact metadata.

### 7. Physical contact, injuries and officiating

Kinematic players use Rapier capsules plus runtime body separation and balance loss. Relative speed, mass, approach and surface conditions affect stumble and injury risk. `officiating.ts` distinguishes fair, late, reckless, dangerous and denial-of-opportunity tackles and drives foul/card audio plus personality-dependent referee protest.

### 8. Relationships and communication

`relationships.ts` creates directed teammate/opponent trust, chemistry, respect, rivalry, mentorship and frustration. Passing utility includes trust and chemistry. Match events can evolve relationships. Player-call probability depends on leadership, urgency and pressure instead of looping continuously.

### 9. Digital-human renderer

`HumanPlayerVisual.tsx` provides:

- role/body-specific skeleton proportions;
- articulated upper/lower arms and legs, knees, ankles, feet, hands and fingers;
- varied facial skull/jaw/nose/lip/eye/ear geometry;
- eye moisture, pupils, independent eye/head focus and irregular blinking;
- breathing, fatigue posture, facial pressure, pain and joy;
- progressive sweat, wetness and dirt material response;
- hair styles with speed/rain response;
- lightweight jersey panels and wet-cloth response;
- stride, arm-counter-rotation, pelvis/torso movement, heading and kick follow-through;
- camera-dependent high/low LOD and micro-detail activation.

### 10. Networking foundation

`network.ts` implements ordered snapshots, interpolation, prediction reconciliation and semantic contact de-duplication. The policy requires server authority for ball, contacts, goals and cards; client prediction is limited to responsive local movement.

### 11. Validation

`validation.ts`, JSON targets and `scripts/human-validate.mjs` validate architecture presence, technique coverage, position archetypes, performance presets, network authority and biomechanics metrics. The production build runs both audio and human validators before TypeScript/Vite.
