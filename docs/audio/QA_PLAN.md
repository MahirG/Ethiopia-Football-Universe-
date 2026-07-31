# Audio QA and Acceptance Plan

## Automated validation

`npm run audio:validate` verifies unique IDs, required fields, event coverage, supported-club coverage, stadium coverage, pronunciation IDs and legal license states. The production build runs this before TypeScript and Vite.

## Manual scenarios

Test quiet friendlies, full-capacity derbies, cup finals, national-team qualifiers, penalties, late equalizers, late winners, trophy ceremonies, heavy rain, strong wind, replay transitions, pause/resume, low-end Android, desktop headphones, TV speakers, mono, night dynamic range, maximum crowd, rapid events, missing assets, language changes and long sessions.

## Defects to reject

- clipping, distortion or large loudness jumps;
- repetitive common sounds or commentary;
- commentary overlap or obsolete queued lines;
- inaudible whistles or ball contact;
- crowd masking dialogue/ball impacts;
- wrong language or pronunciation;
- home/away sections reacting identically;
- abrupt snapshot or weather transitions;
- more active voices than the selected quality budget;
- missing files causing errors;
- any asset without documented rights.

## Browser matrix

Chrome/Edge/Firefox desktop, Safari macOS/iOS, Chrome Android and installed PWA. Speech output must be tested both with and without native `am-ET`, `om-ET`, `ti-ET` and `so-SO` voices. Captions must remain correct when native speech is unavailable.

## Acceptance mapping

The implementation passes when semantic events route correctly, crowd parameters transition smoothly, profiles differ, context changes goal reactions, commentary prioritizes and suppresses repetition, all bus settings persist, mobile voice limits hold, missing assets fall back, and the legal validator passes.
