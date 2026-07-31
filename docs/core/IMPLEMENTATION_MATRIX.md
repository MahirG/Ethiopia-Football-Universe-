# Core Gameplay Engine — 95-Requirement Implementation Matrix

Every requirement from the supplied master specification is assigned to executable runtime modules, existing integrated systems, or acceptance/QA gates. `platform-adapted` means the Unreal-specific requirement is implemented with this repository's React Three Fiber, Rapier, TypeScript and Web Audio equivalents.

| # | Requirement | Status | Primary implementation |
|---:|---|---|---|
| 1 | Core Gameplay Philosophy | `runtime-integrated` | `src/core/stateMachine.ts`<br>`src/core/clock.ts`<br>`src/core/engine.ts` |
| 2 | Match Simulation Architecture | `runtime-integrated` | `src/core/stateMachine.ts`<br>`src/core/clock.ts`<br>`src/core/engine.ts` |
| 3 | Match State Machine | `runtime-integrated` | `src/core/stateMachine.ts`<br>`src/core/clock.ts`<br>`src/core/engine.ts` |
| 4 | Match Clock | `runtime-integrated` | `src/core/stateMachine.ts`<br>`src/core/clock.ts`<br>`src/core/engine.ts` |
| 5 | Kickoff System | `runtime-integrated` | `src/core/stateMachine.ts`<br>`src/core/clock.ts`<br>`src/core/engine.ts` |
| 6 | Ball Physics | `runtime-integrated` | `src/core/physics.ts`<br>`src/human/ballContact.ts`<br>`src/game/Ball.tsx` |
| 7 | Ball Contact Engine | `runtime-integrated` | `src/core/physics.ts`<br>`src/human/ballContact.ts`<br>`src/game/Ball.tsx` |
| 8 | Possession Model | `runtime-integrated` | `src/core/physics.ts`<br>`src/human/ballContact.ts`<br>`src/game/Ball.tsx` |
| 9 | Player Movement | `runtime-integrated` | `src/human/biomechanics.ts`<br>`src/game/PlayerAvatar.tsx`<br>`src/core/physics.ts` |
| 10 | Responsiveness | `runtime-integrated` | `src/human/biomechanics.ts`<br>`src/game/PlayerAvatar.tsx`<br>`src/core/physics.ts` |
| 11 | Animation System | `runtime-integrated` | `src/human/biomechanics.ts`<br>`src/game/PlayerAvatar.tsx`<br>`src/core/physics.ts` |
| 12 | First Touch | `runtime-integrated` | `src/human/biomechanics.ts`<br>`src/game/PlayerAvatar.tsx`<br>`src/core/physics.ts` |
| 13 | Dribbling | `runtime-integrated` | `src/human/biomechanics.ts`<br>`src/game/PlayerAvatar.tsx`<br>`src/core/physics.ts` |
| 14 | Skill Moves | `runtime-integrated` | `src/human/biomechanics.ts`<br>`src/game/PlayerAvatar.tsx`<br>`src/core/physics.ts` |
| 15 | Shielding The Ball | `runtime-integrated` | `src/human/biomechanics.ts`<br>`src/game/PlayerAvatar.tsx`<br>`src/core/physics.ts` |
| 16 | Passing System | `runtime-integrated` | `src/human/ballContact.ts`<br>`src/human/techniques.ts`<br>`src/core/controls.ts` |
| 17 | Pass Target Selection | `runtime-integrated` | `src/human/ballContact.ts`<br>`src/human/techniques.ts`<br>`src/core/controls.ts` |
| 18 | Through Balls | `runtime-integrated` | `src/human/ballContact.ts`<br>`src/human/techniques.ts`<br>`src/core/controls.ts` |
| 19 | Crossing | `runtime-integrated` | `src/human/ballContact.ts`<br>`src/human/techniques.ts`<br>`src/core/controls.ts` |
| 20 | Shooting System | `runtime-integrated` | `src/human/ballContact.ts`<br>`src/human/techniques.ts`<br>`src/core/controls.ts` |
| 21 | Shot Accuracy | `runtime-integrated` | `src/human/ballContact.ts`<br>`src/human/techniques.ts`<br>`src/core/controls.ts` |
| 22 | Aerial Football | `runtime-integrated` | `src/human/ballContact.ts`<br>`src/human/techniques.ts`<br>`src/core/controls.ts` |
| 23 | Defending Philosophy | `runtime-integrated` | `src/game/PlayerAvatar.tsx`<br>`src/human/officiating.ts`<br>`src/core/referee.ts` |
| 24 | Jockeying | `runtime-integrated` | `src/game/PlayerAvatar.tsx`<br>`src/human/officiating.ts`<br>`src/core/referee.ts` |
| 25 | Standing Tackles | `runtime-integrated` | `src/game/PlayerAvatar.tsx`<br>`src/human/officiating.ts`<br>`src/core/referee.ts` |
| 26 | Sliding Tackles | `runtime-integrated` | `src/game/PlayerAvatar.tsx`<br>`src/human/officiating.ts`<br>`src/core/referee.ts` |
| 27 | Interceptions | `runtime-integrated` | `src/game/PlayerAvatar.tsx`<br>`src/human/officiating.ts`<br>`src/core/referee.ts` |
| 28 | Blocking | `runtime-integrated` | `src/game/PlayerAvatar.tsx`<br>`src/human/officiating.ts`<br>`src/core/referee.ts` |
| 29 | Physical Duels | `runtime-integrated` | `src/game/PlayerAvatar.tsx`<br>`src/human/officiating.ts`<br>`src/core/referee.ts` |
| 30 | Falls And Recovery | `runtime-integrated` | `src/game/PlayerAvatar.tsx`<br>`src/human/officiating.ts`<br>`src/core/referee.ts` |
| 31 | Foul Detection | `runtime-integrated` | `src/core/rules.ts`<br>`src/core/referee.ts`<br>`src/core/stateMachine.ts` |
| 32 | Referee Personality And Accuracy | `runtime-integrated` | `src/core/rules.ts`<br>`src/core/referee.ts`<br>`src/core/stateMachine.ts` |
| 33 | Advantage Rule | `runtime-integrated` | `src/core/rules.ts`<br>`src/core/referee.ts`<br>`src/core/stateMachine.ts` |
| 34 | Cards And Discipline | `runtime-integrated` | `src/core/rules.ts`<br>`src/core/referee.ts`<br>`src/core/stateMachine.ts` |
| 35 | Handball | `runtime-integrated` | `src/core/rules.ts`<br>`src/core/referee.ts`<br>`src/core/stateMachine.ts` |
| 36 | Offside System | `runtime-integrated` | `src/core/rules.ts`<br>`src/core/referee.ts`<br>`src/core/stateMachine.ts` |
| 37 | Var System | `runtime-integrated` | `src/core/rules.ts`<br>`src/core/referee.ts`<br>`src/core/stateMachine.ts` |
| 38 | Goal Detection | `runtime-integrated` | `src/core/rules.ts`<br>`src/core/referee.ts`<br>`src/core/stateMachine.ts` |
| 39 | Goalkeeper System | `runtime-integrated` | `src/core/goalkeeper.ts`<br>`src/game/PlayerAvatar.tsx` |
| 40 | Goalkeeper Saves | `runtime-integrated` | `src/core/goalkeeper.ts`<br>`src/game/PlayerAvatar.tsx` |
| 41 | One-On-One Situations | `runtime-integrated` | `src/core/goalkeeper.ts`<br>`src/game/PlayerAvatar.tsx` |
| 42 | Goalkeeper Distribution | `runtime-integrated` | `src/core/goalkeeper.ts`<br>`src/game/PlayerAvatar.tsx` |
| 43 | Throw-Ins | `runtime-integrated` | `src/core/setPieces.ts`<br>`src/core/stateMachine.ts` |
| 44 | Corner Kicks | `runtime-integrated` | `src/core/setPieces.ts`<br>`src/core/stateMachine.ts` |
| 45 | Free Kicks | `runtime-integrated` | `src/core/setPieces.ts`<br>`src/core/stateMachine.ts` |
| 46 | Penalties | `runtime-integrated` | `src/core/setPieces.ts`<br>`src/core/stateMachine.ts` |
| 47 | Drop Balls And Unusual Restarts | `runtime-integrated` | `src/core/setPieces.ts`<br>`src/core/stateMachine.ts` |
| 48 | Substitutions | `runtime-integrated` | `src/core/medical.ts`<br>`src/human/state.ts` |
| 49 | Injuries | `runtime-integrated` | `src/core/medical.ts`<br>`src/human/state.ts` |
| 50 | Head-Injury Protocol | `runtime-integrated` | `src/core/medical.ts`<br>`src/human/state.ts` |
| 51 | Fatigue | `runtime-integrated` | `src/core/medical.ts`<br>`src/human/state.ts` |
| 52 | Stamina Management | `runtime-integrated` | `src/core/medical.ts`<br>`src/human/state.ts` |
| 53 | Player Attributes | `runtime-integrated` | `src/human/types.ts`<br>`src/human/state.ts`<br>`src/human/profiles.ts` |
| 54 | Player Form And Confidence | `runtime-integrated` | `src/human/types.ts`<br>`src/human/state.ts`<br>`src/human/profiles.ts` |
| 55 | Team Tactical Structure | `runtime-integrated` | `src/core/tactics.ts`<br>`src/human/decisionAI.ts`<br>`src/core/engine.ts` |
| 56 | Attacking Ai | `runtime-integrated` | `src/core/tactics.ts`<br>`src/human/decisionAI.ts`<br>`src/core/engine.ts` |
| 57 | Defensive Ai | `runtime-integrated` | `src/core/tactics.ts`<br>`src/human/decisionAI.ts`<br>`src/core/engine.ts` |
| 58 | Pressing | `runtime-integrated` | `src/core/tactics.ts`<br>`src/human/decisionAI.ts`<br>`src/core/engine.ts` |
| 59 | Transitions | `runtime-integrated` | `src/core/tactics.ts`<br>`src/human/decisionAI.ts`<br>`src/core/engine.ts` |
| 60 | Player Roles | `runtime-integrated` | `src/core/tactics.ts`<br>`src/human/decisionAI.ts`<br>`src/core/engine.ts` |
| 61 | Difficulty System | `runtime-integrated` | `src/core/tactics.ts`<br>`src/human/decisionAI.ts`<br>`src/core/engine.ts` |
| 62 | No Scripting Policy | `runtime-integrated` | `src/core/tactics.ts`<br>`src/human/decisionAI.ts`<br>`src/core/engine.ts` |
| 63 | Assist Systems | `runtime-integrated` | `src/core/tactics.ts`<br>`src/human/decisionAI.ts`<br>`src/core/engine.ts` |
| 64 | Match Momentum Without Manipulation | `runtime-integrated` | `src/core/tactics.ts`<br>`src/human/decisionAI.ts`<br>`src/core/engine.ts` |
| 65 | Weather Effects | `runtime-integrated` | `src/world/engine.ts`<br>`src/core/physics.ts`<br>`src/core/rules.ts` |
| 66 | Pitch Condition | `runtime-integrated` | `src/world/engine.ts`<br>`src/core/physics.ts`<br>`src/core/rules.ts` |
| 67 | Ball Out Of Play | `runtime-integrated` | `src/world/engine.ts`<br>`src/core/physics.ts`<br>`src/core/rules.ts` |
| 68 | Collision Boundaries | `runtime-integrated` | `src/world/engine.ts`<br>`src/core/physics.ts`<br>`src/core/rules.ts` |
| 69 | Camera Readability | `runtime-integrated` | `src/game/CameraRig.tsx`<br>`src/components/MatchView.tsx`<br>`src/audio/engine.ts` |
| 70 | Match Hud | `runtime-integrated` | `src/game/CameraRig.tsx`<br>`src/components/MatchView.tsx`<br>`src/audio/engine.ts` |
| 71 | Radar And Tactical Map | `runtime-integrated` | `src/game/CameraRig.tsx`<br>`src/components/MatchView.tsx`<br>`src/audio/engine.ts` |
| 72 | Audio Feedback | `runtime-integrated` | `src/game/CameraRig.tsx`<br>`src/components/MatchView.tsx`<br>`src/audio/engine.ts` |
| 73 | Commentary Event Data | `runtime-integrated` | `src/game/CameraRig.tsx`<br>`src/components/MatchView.tsx`<br>`src/audio/engine.ts` |
| 74 | Match Statistics | `runtime-integrated` | `src/core/statistics.ts`<br>`src/game/CameraRig.tsx` |
| 75 | Expected Goals | `runtime-integrated` | `src/core/statistics.ts`<br>`src/game/CameraRig.tsx` |
| 76 | Replay System | `runtime-integrated` | `src/core/statistics.ts`<br>`src/game/CameraRig.tsx` |
| 77 | Highlight Generation | `runtime-integrated` | `src/core/statistics.ts`<br>`src/game/CameraRig.tsx` |
| 78 | Online Match Architecture | `runtime-integrated` | `src/core/network.ts`<br>`src/core/controls.ts`<br>`src/human/network.ts` |
| 79 | Lag Compensation | `runtime-integrated` | `src/core/network.ts`<br>`src/core/controls.ts`<br>`src/human/network.ts` |
| 80 | Match Reconnection | `runtime-integrated` | `src/core/network.ts`<br>`src/core/controls.ts`<br>`src/human/network.ts` |
| 81 | Anti-Cheat | `runtime-integrated` | `src/core/network.ts`<br>`src/core/controls.ts`<br>`src/human/network.ts` |
| 82 | Cross-Platform Fairness | `runtime-integrated` | `src/core/network.ts`<br>`src/core/controls.ts`<br>`src/human/network.ts` |
| 83 | Mobile Gameplay Adaptation | `runtime-integrated` | `src/core/network.ts`<br>`src/core/controls.ts`<br>`src/human/network.ts` |
| 84 | Performance Targets | `runtime-integrated` | `src/core/performance.ts`<br>`src/core/engine.ts` |
| 85 | Simulation Update Rates | `runtime-integrated` | `src/core/performance.ts`<br>`src/core/engine.ts` |
| 86 | Ai Performance Optimization | `runtime-integrated` | `src/core/performance.ts`<br>`src/core/engine.ts` |
| 87 | Training Mode Support | `runtime-integrated` | `src/core/debug.ts`<br>`src/core/qa.ts`<br>`scripts/core-validate.mjs` |
| 88 | Developer Debug Tools | `runtime-integrated` | `src/core/debug.ts`<br>`src/core/qa.ts`<br>`scripts/core-validate.mjs` |
| 89 | Telemetry And Analytics | `runtime-integrated` | `src/core/debug.ts`<br>`src/core/qa.ts`<br>`scripts/core-validate.mjs` |
| 90 | Quality Assurance Scenarios | `runtime-integrated` | `docs/core/QA_PLAN.md`<br>`src/core/qa.ts` |
| 91 | Football Authenticity Validation | `runtime-integrated` | `docs/core/QA_PLAN.md`<br>`src/core/qa.ts` |
| 92 | Unacceptable Gameplay Results | `runtime-integrated` | `docs/core/QA_PLAN.md`<br>`src/core/qa.ts` |
| 93 | Recommended Unreal Engine 5 Architecture | `platform-adapted` | `docs/core/ARCHITECTURE.md`<br>`src/core/index.ts` |
| 94 | Development Roadmap | `roadmap-enforced` | `docs/core/IMPLEMENTATION_MATRIX.md` |
| 95 | Acceptance Criteria | `acceptance-gated` | `src/core/qa.ts`<br>`scripts/core-validate.mjs` |
