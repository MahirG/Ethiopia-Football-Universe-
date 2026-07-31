# Audio Designer Guide

## Adding or editing an event

1. Add the semantic name to `FootballAudioEvent`.
2. Add it to `ALL_AUDIO_EVENTS`.
3. Set bus, priority, cooldown, variation target and spatial behavior in `catalog.ts` or exported JSON.
4. Add localized commentary only when the line is contextually useful.
5. Add closed-caption text for important non-speech audio.
6. Run `npm run audio:validate`.

Gameplay scripts emit semantic events only. Never import or hardcode a recording path in gameplay code.

## Adding a recorded variation

1. Record or license the source at 48 kHz/24-bit WAV.
2. Use the documented folder and naming convention.
3. Add the asset to the licensing register.
4. Add the runtime derivative and asset record.
5. Mark `replacementRequired: false` only after rights and QA approval.

## Commentary

Commentary priorities are goal/trophy (100), penalty/red card (94+), major shot/save (68–76), yellow card/substitution (55–72), and possession (20). A lower-priority line cannot interrupt a higher-priority active line. Recently used alternatives are rotated and common events have match-level cooldowns.

Pronunciations are stored independently from line templates. New names need display, Ethiopic form, phonetic guidance, category and approval status.

## Stadium profiles

Tune openness, roof coverage, crowd proximity, reverb time, early reflections, PA echo and environmental style. Do not copy one venue profile across all cities.

## Club supporter profiles

Every club receives languages, chants, goal chant, drum style, density, energy, loyalty and rivals. All current chant strings are legal text placeholders. Commissioned group recordings and performer releases are required before replacing them.

## Debugging

Enable `AUDIO DEBUG` in the match toolbar. Use the event lab to audition goals, saves, penalties, cards, VAR, thunder, chants and trophy states. The overlay shows active voice count, limits, queue, snapshot, memory estimate, crowd parameters, profiles and recent events.
