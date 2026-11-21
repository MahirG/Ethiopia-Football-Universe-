# EFU Human Realism — Phase 2: original skinned athletes

This phase replaces the Phase 1 middle-distance **unrigged capsule player visual**
with an **original GPU-skinned football character**. It is functional 3D geometry,
not the photorealistic model depicted by the approved EFU concept poster.

## Scope of implementation

- `src/human/riggedAthleteFactory.ts` generates an anatomical-looking original
  athlete with a real 13-bone `THREE.Skeleton`, indexed skin weights and
  quality-scaled polygon counts. The mesh is created in bind-pose coordinates
  with inverse bone matrices, so rotations deform vertices.
- The character appearance uses existing stable profiles (height, muscle,
  hair, skin tone, face size, preferred foot, position) for 22 distinct players.
- `src/human/RiggedAthlete.tsx` animates legs, arms, head, torso, striking,
  goalkeeper reach and celebrations from the existing `PlayerRuntimeState`
  and `VisualMotionState`. It never writes match rules or ball impulses.
- Existing dynamically-generated front/back shirt numbers are transferred to
  the skinned chest as animated surface planes.
- `HumanPlayerVisual.tsx` selects the new rig for the `field` tier. The
  existing high-detail face mesh remains for close-up `hero` shots and the
  simplified legacy mesh remains for `distance`.
- No changes to game physics, collisions, referee rules, career persistence,
  player selection, touch controls or online messages.

## What is not yet complete

A procedurally built skinned human is **not** a photorealistic sculpted and
texture-painted GLB character. Actual approved, properly licensed GLB models,
complex deforming skin weights, hair cards, full facial blendshapes, motion
capture and retargeted animation clips are later milestones. There are currently
no such approved models in the asset registry. The concept poster is **not** a
3D asset and cannot be used as one.

## QA checklist

- [x] Runtime skeleton and skinning test exists at
  `scripts/phase2-rig-validate.mjs` including active skin deformation check.
- [ ] Lint, Phase 1 and Phase 2 validators, TS build and production bundle pass.
- [ ] In-browser test of a full match at all graphics presets.
- [ ] Ensure no joint separation, incorrect bone bind pose or shirt numbers
  hovering during kicking, sprinting, pauses and celebration replays.
- [ ] Compare scene quality and sustained FPS against Phase 1 on low-end,
  mid-range and high-end Android devices. Record GPU memory, frame-time p95
  and touch response during a full match.
- [ ] Review actual engine screenshots and obtain approval before merging.

## Follow-on work

1. Authored skin-mesh assets with documented source license and rights.
2. UV-mapped realistic kits, facial topology and hair shapes.
3. Animation-clips pipeline with run cycles, transition blending and foot
   contacts driven by observed ball events.
4. Android controller calibration and layout optimization in a separate
   independent workstream.

No commits to `main` in this phase.
