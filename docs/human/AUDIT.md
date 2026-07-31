# Human-player system audit

## Existing engine

- React 19, TypeScript and Vite.
- React Three Fiber / Three.js rendering.
- Rapier rigid-body ball and kinematic player capsules.
- Procedural footballers rendered from primitive geometry.
- One user-controlled outfield player; formation-based AI for the remaining players.
- Existing weather, replay, camera, stadium, grass, broadcast and semantic audio systems.

## Pre-upgrade human-player weaknesses

1. Movement used direct damped velocity and sine-wave limbs, with no planted-foot turn constraint or weight-transfer model.
2. AI either returned to an anchor or chased the ball. It did not evaluate passing lanes, pressure, support, marking, offside risk or match context.
3. Passes and shots were distance-triggered impulses rather than foot-position/contact-quality calculations.
4. First touch, dribbling, weak-foot errors, contextual mistakes, tackling and collision consequences were shallow or absent.
5. Goalkeepers read current ball position too directly and had no perception delay.
6. Emotional continuity, multidimensional personality, relationships, injuries and referee interaction were absent.
7. Faces had basic eyes/nose/mouth, but no camera-dependent LOD, non-repeating blink timing, eye focus, sweat progression, dirt or cloth/hair response.
8. No server-authoritative network reconciliation design existed for human animation state.
9. No biomechanics calibration data, mocap capture plan, digital-human rights register or automated human-system validator existed.

## Preserved systems

The match routing, club database, career mode, stadium, pitch, cameras, replay, audio, localization, settings and PWA architecture remain intact. The upgrade replaces the player simulation/rendering layer and extends match telemetry.

## Risks

- Browser/WebGL cannot provide licensed 150k–300k scanned players, professional motion matching, Chaos Cloth, ML deformation or platform-native 120 FPS without external assets/native-engine production.
- Full active ragdoll and server-authoritative multiplayer require a backend and deterministic game-service architecture.
- Biomechanical target ranges require calibration against properly licensed footage and review by footballers/sports scientists.
- High-detail procedural players are draw-call intensive; adaptive LOD is mandatory.
