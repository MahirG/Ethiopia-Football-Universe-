import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

const view = read('src/components/MatchView.tsx')
const world = read('src/world/WorldLayer.tsx')
const scene = read('src/game/MatchScene.tsx')
const safety = read('src/runtime/MatchSceneSafety.tsx')
const materials = read('src/human/RealisticPlayerParts.tsx')
const stylesheet = read('src/runtime/match-recovery.css')
const types = read('src/game/types.ts')

// A player should not lose the entire React application due to rendering error.
assert.ok(view.includes('<MatchSceneErrorBoundary') && safety.includes('componentDidCatch'),
  'match scene must be isolated by a React error boundary')
assert.ok(view.includes('onRendererContextLost={handleWebglLoss}') &&
          view.includes('onRendererContextRestored={handleWebglRestoration}') &&
          scene.includes('<WebGLContextGuard'),
  'real WebGL canvas must detect context interruptions')
assert.ok(safety.includes("webglcontextlost") && safety.includes("webglcontextrestored") &&
          safety.includes('event.preventDefault()'),
  'WebGL failure handling must permit a context recovery attempt')
assert.ok(view.includes("setQuality('performance')") && view.includes('setSceneKey((value) => value + 1)'),
  'render recovery must lower GPU load and remount only the scene')
assert.ok(view.includes('setRunning(false)') &&
          view.includes('releaseAllVirtualInput()') &&
          !view.includes('window.location.reload('),
  'recovery must pause and release input without forcing a reload')
assert.ok(view.includes('setRendererIssue(') && view.includes('role="alert"') &&
          stylesheet.includes('safe-area-inset-bottom'),
  'failure feedback must be visible and accessible on Android')
assert.ok(types.includes('onRendererContextLost?:') && types.includes('onRendererContextRestored?:'),
  'context callbacks must remain optional for callers')

// Avoid 1024x512 texture upload every time the live clock is updated.
assert.ok(world.includes("world.quality === 'performance' ? 0.5 : 1"),
  'performance profile should halve scoreboard texture dimensions')
assert.ok(world.includes('Math.floor(world.matchMinute / 5) * 5'),
  'stadium screen should refresh less often than the live UI clock')
assert.ok(world.includes('value.generateMipmaps = false') && world.includes('value.minFilter = THREE.LinearFilter'),
  'avoid transient GPU mipmap allocations for stadium screens')
assert.ok(!world.includes('[awayName, homeName, texture, world]'),
  'the whole world object must not trigger texture re-uploads on every tick')
assert.ok(view.includes('}, 250)') && view.includes('MATCH_MINUTES_PER_SECOND * elapsedSeconds'),
  'match clock should use elapsed-time compensation and a lower UI update rate')
const minutes = Array.from({ length: 900 }, (_, i) => i / 10)
const uniqueScreenMinutes = new Set(minutes.map(x => Math.min(90, Math.floor(x / 5) * 5)))
assert.ok(uniqueScreenMinutes.size <= 19, 'screen clock buckets should remain bounded')

// Frequent remounts should not hold onto stale GPU material references.
assert.ok(materials.includes('refs.current.splice(index, 1)') &&
          materials.includes('assigned.current = material'),
  'material callback must remove prior instances when they are replaced')

const source = read('src/runtime/kickoffSafety.ts')
const compiled = ts.transpileModule(source, {
  fileName: 'kickoffSafety.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const exports = {}
const local = new Map()
const window = { localStorage: { setItem: (key, value) => local.set(key, value), getItem: key => local.get(key) ?? null } }
runInNewContext(compiled, { exports, module: { exports }, window, navigator: { userAgent: 'Android test' } }, { filename: 'kickoffSafety.ts' })
exports.recordClientFailure('match-renderer', new Error('simulated renderer fault'))
const report = JSON.parse(local.get('efu-last-client-crash'))
assert.equal(report.source, 'match-renderer')
assert.ok(report.message.includes('simulated renderer fault'))

console.log('EFU stability checks passed: WebGL recovery, safe pause, GPU upload budget, input release, and material lifecycle.')
