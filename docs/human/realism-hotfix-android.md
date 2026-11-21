# EFU Realism Hotfix — Athlete Silhouette, Camera & Android HUD

## Why screenshots still showed cartoon characters
- The player's close-up LOD was **always forced to `hero` when controlled**. `hero` was still the original separate capsule-and-ball geometry.
- The new GPU-skinned athlete existed only in the `field` tier, so the close-ups in the user screenshots almost always bypassed it.
- The original procedural rig was approximately 2.2 meters tall even when the simulated body was roughly 1.75–1.9 meters; this distorted apparent scale and could bury boot soles.
- The Follow camera sat too close to players on portrait screens, filling the scene with faces and clipping limbs.
- Performance rendered with pixelated DPR scaling; referee telemetry occupied a large part of the pitch.

## Implemented in this PR
- Route both `hero`/controlled and `field` gameplay distances to the skinned 13-bone athlete. Keep distant cheap LOD for mobile budget. Preserve existing dynamic skeleton poses and state.
- Rework procedural anatomy with tapered skinned jersey/limb volumes, proportionally smaller skull/jaw, tighter hair, accurate socks/boots, and simpler small-size face features. Preserves seed-based Ethiopian-inspired fictional player diversity and kit colors.
- Compute model bounding box and scale to each player's actual `profile.body.height`; offset the boot sole precisely to the pitch using the profile's Rapier collider center.
- Pull follow/ball cameras back and use broadcast framing in portrait automatic camera mode. Remove pixelated DPR sampling and increase performance minimum DPR from 0.65 to 0.78 without exceeding DPR=1 in the low-end tier.
- Make match-director events compact on phones and remove duplicated venue/score labels that overlap the football action.
- Reduce selected-player overhead arrow to a small triangular marker.
- Validate anatomical dimensions, normalized skin weights, 13 bones, performance geometry budget, exact pitch alignment, auto camera and mobile HUD as part of CI.

## How this relates to the approved Human Realism 2.0 concept
The desired direction is athletic Ethiopian-inspired fictional adults with individually differentiated faces/hair, believable limb/torso proportions, proper football kits, realistic boots, and stadium lighting. These source-level changes address **the specific grotesque proportions and camera/UI defects** in the uploaded Android screenshots.

**Important limitation:** The GitHub `athleteAssets.ts` registry is still empty: the repository contains no approved, licensed, professionally sculpted 3D GLB character files to load. The approved reference image is concept artwork, not a 3D model. This fix makes the actual procedural skinned game characters *more anatomically coherent*, but **does not deliver photorealistic human faces or texture-authored GLBs**. That requires original or licensed game-ready 3D models to be authored/imported and retargeted to the existing skeleton.

## Protected systems
No edits to Rapier physics, foul/goal rules, saves, AI, controls, translations or networking. The mid-match crash recovery and performance budgeting remain.

## QA before production
- [ ] CI: lint, all legacy validators, new anatomical camera/HUD test, TypeScript, Vite.
- [ ] Preview deployment renders the *controlled player* using a skinned rig, not the hero capsule body.
- [ ] Inspect near/mid/far shots on a real phone: hair, knees, elbows, soles and no helmet-size heads.
- [ ] Inspect portrait/landscape scoreboard, referee updates, touch controls and camera switch.
- [ ] Play complete Android match to verify no crash and stable thermals; check Player 1/11 plus 22-player budget.
- [ ] Acquire original/licensed GLB asset files and test retargeting before claiming to match the approved photorealistic concept.
