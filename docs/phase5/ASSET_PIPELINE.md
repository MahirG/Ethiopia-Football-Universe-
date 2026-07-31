# Professional asset-ingestion pipeline

The repository now defines replaceable slots for gameplay, broadcast and cinematic player models; a FACS-compatible facial rig; locomotion and ball-action mocap packs; and compressed kit, stadium and ball materials.

## Required production rules

- Use GLB/GLTF with a documented football skeleton contract.
- Compress geometry with Draco or Meshopt where quality permits.
- Use KTX2/Basis Universal for GPU texture delivery.
- Quantize and trim animation tracks; preserve planted-foot and ball-contact timing.
- Register ownership, territory, platform and commercial-use rights before setting `licensed: true`.
- Keep the procedural fallback available for missing, corrupt, oversized or unauthorized assets.

No scanned player, official likeness, professional mocap or branded material pack was supplied with this task. The pipeline is production-ready; the external source assets remain a commissioning and licensing requirement.
