# Audio asset replacement root

The running web build uses original procedural Web Audio synthesis so no unauthorized recordings are shipped. This folder is the legal replacement pipeline for commissioned, licensed, public-domain, or project-owned recordings.

Expected structure:

- `Ball/Passes`, `Ball/Shots`, `Ball/Headers`, `Ball/GoalFrame`, `Ball/Net`, `Ball/Goalkeeper`
- `Crowd/BaseAmbience`, `Crowd/Home`, `Crowd/Away`, `Crowd/Chants`, `Crowd/Goals`, `Crowd/Fouls`, `Crowd/Trophies`
- `Players/Footsteps`, `Players/Collisions`, `Players/Vocals`, `Players/Celebrations`
- `Commentary/Amharic`, `Commentary/AfaanOromo`, `Commentary/English`, `Commentary/Tigrinya`, `Commentary/Somali`
- `Announcer`, `Referee`, `Stadiums`, `Weather`, `UI`, `Music`, `Cinematics`, `Accessibility`

Naming examples: `SFX_Ball_Shot_Power_01.wav`, `CROWD_ETH_Goal_Large_03.wav`, `CHANT_Walia_Main_02.wav`, `VO_AMH_Goal_Generic_014.wav`.

Source masters should be 48 kHz, 24-bit WAV. Runtime derivatives should be generated per platform and recorded in `data/audio/licensing-register.json` before release.
