# EFU Human Realism — Phase 3: football animation and appearance polish

This branch stacks on `feature/efu-rigged-athletes-phase2` / PR #32.
It delivers **visible improvements to the original procedural skinned 3D athletes**, not photorealistic scanned characters.

## Implemented

- `src/human/athleteMotion.ts`: pure, deterministic visual pose sampling for idle, run, sprint, braking, striking, tackles, jumps, goalkeeper dives and celebrations, with left- and right-foot variation.
- `src/human/RiggedAthlete.tsx`: per-joint exponential motion blending, using frame-time-independent response coefficients. Player velocities and gameplay events are read-only inputs.
- `src/human/riggedAthleteFactory.ts`: improved facial silhouettes (eyebrows, cheeks, lips, facial hair and style-dependent hair geometry), kit stripes, sleeve cuffs, sock bands and boot markings.
- Transition skin weights near elbows and knees reduce sharp bending between mesh sections. Existing thirteen-bone skeleton and procedural fallback remain intact.
- Performance graphics continue to use the least facial and material detail. Balanced and Ultra add details gradually.
- `scripts/phase3-motion-validate.mjs` exercises pose blending, both kicking feet, three geometry budgets, normalized joint weights and on-field integration.

## Explicit limitations

- This remains the original **procedurally constructed**, skin-weighted mesh system. The approved character image was concept art, **not** a GLB animation or likeness asset. It has not been installed as a 3D character.
- Foot-planting is animation-aware, but there is **no terrain-aware foot IK** or motion-capture retargeting in this phase.
- No claim of improved sustained Android frame rate is made without testing on physical devices.
- The model construction creates many skinned material groups; draw calls must be profiled before full production rollout.
- Mobile control improvements are a subsequent independent workstream, not falsely included in this character PR.

## Protected architecture

- No edits to Rapier physics, AI actions, refereeing, career local-storage formats, translation strings, controls, input handlers or multiplayer protocol.
- All additional animation remains presentation-side. Frame-time changes cannot affect outcomes or stored player identity.
- The source and current production branch remain unchanged until review and merge.

## Release validation checklist

- [ ] Lint, all existing validators, motion validation, TypeScript, Vite production build pass.
- [ ] Visually inspect actual 11v11 live matches and portrait/landscape states for bad deformation, intersections, detached faces, clipping kits, bad foot rotations or animation discontinuities.
- [ ] Test near/middle/distant camera LOD transitions.
- [ ] Record p95 frame time, draw calls, GPU memory, heat and rendering crashes on at least one budget Android handset.
- [ ] Review before merging to Phase 2, then to Golden Era and finally to production.
