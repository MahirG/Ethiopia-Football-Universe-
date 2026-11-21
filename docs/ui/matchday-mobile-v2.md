# EFU Matchday Mobile v2 — visible UI repair

## Why the user screenshot still looked like the earlier prototype
- PR #36 was a mid-match crash/renderer-stability change, **not** a visual makeover.
- The screenshot showed the **idle/pre-match phase**. Touch controls and player motion are only visible after kick-off.
- The Match page originally placed marketing descriptions, venue management, a stacked team selection and a sprawling desktop toolbar above/around a relatively small game canvas on narrow Android viewports.
- The current field athletes remain **original procedural Three.js geometry**, not professionally authored textured/rigged GLB character assets. Better animation cannot make those bodies photorealistic.

## Actual changes (stacked on draft PR #36)
- `src/ui/matchday-mobile-v2.css`: game-first ordering with a large mobile pitch; compact, readable side-by-side team selectors; clear score HUD; collapsible settings; accessible responsive layout on 320-700px viewports.
- `src/components/MatchView.tsx`: **KICK OFF** action inside the actual pre-match pitch; clicking starts the existing game start sequence. The full desktop toolbar is preserved while advanced mobile settings are initially collapsed.
- The real match canvas is still Three.js/Rapier and uses the same `MatchScene`, players, ball, physics, animations, camera selection and touch controls. None of the screenshots used in previous responses were imported as assets.
- The current crash mitigation, WebGL context guard, local diagnostics, score/clock preservation and performance mode remain intact.
- `scripts/matchday-mobile-validate.mjs` and the build chain ensure the responsive features remain integrated.

## Visual fidelity still outstanding
- Original licensed or commissioned GLB/glTF footballer models including anatomically correct proportions and PBR kit materials.
- Animation retargeting, realistic gait/contacts, better faces and dynamic stadium lighting tested on Android.
- Runtime screenshot comparison against the reference screenshot, mobile interaction QA at portrait/landscape, full 11v11 performance and crash reproduction.

## Verify the next preview
- Compare pre-match on a 393 CSS-pixel phone. It should show the two clubs in one compact row, then a tall playable pitch with a prominent gold **KICK OFF** action.
- After the intro, kickoff overlay must disappear and movement/pass/sprint/shoot controls must appear.
- Open **Graphics, weather & audio** only when needed.
- Test the same match on performance graphics and through halftime; do not merge until physical device validation.
- The current screenshot's generic-looking footballers will **remain** until actual professional character assets are integrated. Do not claim this PR replaces them.

## Release rule
Draft feature branch based on PR #36. CI and Vercel Preview are not proof of production deployment or real-phone testing.
