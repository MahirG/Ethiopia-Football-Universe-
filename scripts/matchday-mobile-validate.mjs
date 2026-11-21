import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const view = read('src/components/MatchView.tsx')
const css = read('src/ui/matchday-mobile-v2.css')
const main = read('src/main.tsx')
const types = read('src/game/types.ts')
const scene = read('src/game/MatchScene.tsx')
const recovery = read('src/runtime/MatchSceneSafety.tsx')

for (const expected of [
  'matchday-mobile-kickoff',
  'presentationPhase === \'idle\' && score.time === 0 && !rendererIssue',
  'onClick={() => void toggleMatch()}',
  'Kick off the football match',
  'match-mobile-settings-toggle',
  'setShowAdvancedMobileSettings',
  'aria-expanded={showAdvancedMobileSettings}',
  'aria-controls="match-advanced-environment"',
  'id="match-advanced-environment"',
  'match-environment-controls phase-three-controls',
  '<MatchSceneErrorBoundary',
  'onRendererContextLost={handleWebglLoss}',
  'onRendererContextRestored={handleWebglRestoration}',
]) assert.ok(view.includes(expected), 'Missing game-first UX or crash guard: ' + expected)

assert.ok(css.includes('@media(max-width:700px)') && css.includes('@media(max-width:360px)'))
assert.ok(css.includes('@media(max-height:480px) and (orientation:landscape)'))
assert.ok(css.includes('padding:8px 8px max(24px,env(safe-area-inset-bottom))'))
assert.ok(css.includes('height:clamp(430px,76svh,720px)'), 'match canvas must dominate mobile viewport')
assert.ok(css.includes('.match-view>.game-shell{order:2}') &&
  css.includes('.match-view>.world-console{order:4}'),
  'game stage should appear before advanced venue controls')
assert.ok(css.includes('.match-view .match-setup') &&
  css.includes('grid-template-columns:minmax(0,1fr) 34px minmax(0,1fr)'),
  'team selection must be a readable compact matchup, not stacked desktop cards')
assert.ok(css.includes('.match-view .match-environment-controls:not(.mobile-open){display:none!important}'),
  'advanced settings must not consume the game viewport until requested')
assert.ok(css.includes('.match-view .match-environment-controls.mobile-open'),
  'advanced settings must be accessible after expanded')
assert.ok(css.includes('.matchday-mobile-kickoff button:focus-visible'),
  'kickoff action must have a visible keyboard focus treatment')
assert.ok(main.includes("import './ui/matchday-mobile-v2.css'"),
  'new CSS must be included in actual production bundle')
assert.ok(types.includes('onRendererContextLost?') && scene.includes('<WebGLContextGuard') &&
  recovery.includes('componentDidCatch'),
  'visual refresh must not remove mid-match crash protection')

// This phase is layout only: it must not change or claim replacement of model assets.
assert.ok(!view.includes('GLTFLoader') && !css.includes('GLTFLoader'))
console.log('EFU matchday mobile layout validation passed: viewport-first pitch, readable teams, kickoff, advanced settings and WebGL recovery.');
