# Motion capture and digital-human asset pipeline

## Legal source requirements

The repository does not claim to include player scans, licensed likenesses, professional motion-capture sessions or biometric data that were not supplied. Each external player/performer requires:

- informed biometric and performance-capture consent;
- commercial game/marketing rights;
- territory, platform, duration and derivative-work terms;
- player likeness and club/kit approvals where applicable;
- source-file ownership and performer releases.

Use `data/human/asset-register.template.json` for every body scan, face scan, texture set, groom, cloth item and mocap session.

## Capture specification

- 120 Hz full-body optical/inertial capture; 60 Hz or higher facial capture.
- Genlocked face, body, audio and reference cameras.
- Full-intensity football performers, not low-speed imitation.
- Multiple heights, masses, positions, movement styles, preferred feet, fresh/fatigued states and correct/imperfect executions.
- Prop-calibrated ball, goal, gloves, boots and pitch surface.
- Force plates or validated inertial reference for plant/acceleration sessions where possible.

The complete session list is in `data/human/mocap-capture-plan.json`.

## Retarget and runtime pipeline

1. Clean capture without removing natural asymmetry or corrective steps.
2. Solve to a common football skeleton with foot/hand contact markers.
3. Label trajectory, phase, intended direction, pressure, contact result and quality.
4. Build motion-matching/Pose Search database in a native-engine production branch.
5. Preserve procedural foot IK, contact physics and balance correction at runtime.
6. Generate cinematic, gameplay and distance LODs.
7. Compress animation with contact-aware error thresholds.
8. Validate synchronized against reference footage.

The browser build uses procedural motion as a functional fallback and remains compatible with future GLTF/animation replacement.
