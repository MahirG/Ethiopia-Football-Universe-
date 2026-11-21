# EFU Human Realism — Phase 1 engineering foundation

Branch: `feature/efu-human-realism-phase1` (stacked on `feature/efu-golden-era-ui-v1`).

## Implemented scope

- Preserve the existing React Three Fiber / Rapier player simulation, athlete IDs, skills, collision bodies, and ball contacts.
- Three-tier player rendering: **hero** (existing articulated, facially detailed procedural model), **field** (new articulated simplified athlete), **distance** (original low-cost placeholder).
- Centralized LOD thresholds by Performance, Balanced and Ultra presets, with hysteresis and a selected-player priority.
- Improved visible procedural athlete appearance: jersey collar, kit trims and athletic silhouette; not photorealistic licensed models.
- Maintain existing original Ethiopian-inspired appearance variation across 22 player profiles.
- Visual improvements do not affect core AI or match rules.
- Mobile device controls and controller systems are preserved for the next wave; this phase does not claim device compatibility beyond existing support.

## Realistic scanned/rigged human assets: NOT YET INSTALLED

The approved *EFU Human Realism 2.0* poster is **2D concept art**. It cannot be converted directly into complete deforming 3D bodies or animation clips. Do not describe the new procedural field-tier geometry as photorealistic.

`src/human/athleteAssets.ts` defines the contract for authentic skinned GLB characters but intentionally registers **zero assets** until original/licensed assets and rights metadata exist. A safe GLB implementation must include:

1. One consistent `efu-humanoid-v1` naming convention, rig hierarchy and retargeting mapping.
2. Uncompressed source master plus runtime GLB; validated skin weights, bind pose and clip sampling.
3. `idle`, `jog`, `sprint`, `plant`, `pass`, `shoot`, `tackle`, `jump`, `keeper-dive`, `celebrate` clips.
4. Original face meshes with diverse proportions and appearances; no unlicensed player likenesses.
5. Texture and triangle limits tuned for actual Android hardware, KTX2/Basis compression and LOD transitions.
6. An asset-loading and retargeting acceptance test showing a full 11v11 match in addition to one attractive close-up.
7. Graceful fallback to the procedural renderer on missing assets or insufficient device memory.

Do not enable assets simply by populating the registry: the runtime loading, skeleton cloning and retargeting layer must be implemented and tested with a real model first.

## QA gates

- [ ] `npm run lint` and `npm run build` pass.
- [ ] Test a complete 11v11 match at Performance, Balanced, and Ultra graphics profiles.
- [ ] Verify LOD transitions with moving broadcast, follow and free cameras, including selected player.
- [ ] Verify all four UI languages and persistent career data.
- [ ] Profile sustained frame times, GPU memory and thermal behavior on real Android phones.
- [ ] Validate installed, rigged assets separately before claiming cinematic human realism.
- [ ] Review against the approved concept; keep PR as draft until user approves actual screenshots.

## Safety against regression

This phase must never change `efu-career` localStorage schema, `src/human/ballContact.ts`, referee outcomes or online network protocol. The original player rig remains available for fallbacks.
