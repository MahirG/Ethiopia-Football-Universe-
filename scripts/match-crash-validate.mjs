import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
function loadTs(path) {
  const output = {}
  const code = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  runInNewContext(code, { exports: output, module: { exports: output } }, { filename: path })
  return output
}

const { QUALITY_PRESETS } = loadTs('src/game/quality.ts')
assert.ok(QUALITY_PRESETS.performance.dpr[1] <= 1, 'mobile performance DPR must not exceed native resolution')
assert.ok(QUALITY_PRESETS.performance.crowdPerLongStand < QUALITY_PRESETS.balanced.crowdPerLongStand)
assert.ok(QUALITY_PRESETS.performance.rainDrops < QUALITY_PRESETS.balanced.rainDrops)

const match = read('src/components/MatchView.tsx')
const scene = read('src/game/MatchScene.tsx')
const stadium = read('src/world/WorldLayer.tsx')
const boundary = read('src/runtime/MatchSceneSafety.tsx')
const safety = read('src/runtime/kickoffSafety.ts')
const css = read('src/runtime/match-recovery.css')

for (const fragment of [
  "Math.floor(score.time / 5) * 5",
  "matchMinute: worldMinute",
  "worldMinute, timeOfDay",
  "setRendererIssue(",
  "onFailure={handleRendererFailure}",
  "onRendererContextLost={handleWebglLoss}",
  "onRendererContextRestored={handleWebglRestoration}",
  "setSceneKey((value) => value + 1)",
  "setRunning(false)",
  "setQuality('performance')",
  "releaseAllVirtualInput()",
  "role=\"alert\"",
]) assert.ok(match.includes(fragment), 'missing recovery or world-throttling integration: ' + fragment)

const failHandler = match.slice(match.indexOf('const handleRendererFailure'), match.indexOf('const handleWebglLoss'))
assert.ok(!failHandler.includes("setSceneKey("), 'context-loss callback must not immediately remount the renderer')
assert.ok(!failHandler.includes("setQuality("), 'context-loss callback must not reconfigure lost renderer')
assert.ok(match.includes("Boolean(rendererIssue) || replayActive"), 'resume must be disabled until recovery completes')
assert.ok(match.includes("score.time") && match.includes("score.home") && match.includes("score.away"),
  'scoreboard UI must remain owned by parent MatchView')

for (const fragment of ['shadows={props.quality !== \'performance\'}',
  'castShadow={props.quality !== \'performance\'}', '<WebGLContextGuard']) {
  assert.ok(scene.includes(fragment), 'missing mobile renderer safety budget: ' + fragment)
}
assert.ok(boundary.includes("webglcontextlost") && boundary.includes("webglcontextrestored"))
assert.ok(boundary.includes("event.preventDefault()"), 'loss event must allow browser restoration')
assert.ok(boundary.includes("if (this.state.failed) return null"), 'single recovery UI must be owned by MatchView')
assert.ok(safety.includes("export function recordClientFailure"), 'errors must be reported locally')
assert.ok(css.includes(".match-recovery-panel") && css.includes("focus-visible"), 'recovery must be accessible')

const start = stadium.indexOf('function useScoreTexture(')
const end = stadium.indexOf('function StadiumScreens(', start)
const textureCode = stadium.slice(start, end)
assert.ok(textureCode.includes('Math.floor(world.matchMinute / 5) * 5'))
assert.ok(textureCode.includes("world.quality === 'performance' ? 0.5 : 1"))
assert.ok(textureCode.includes('value.generateMipmaps = false'))
assert.ok(textureCode.includes('texture.needsUpdate = true'))
assert.ok(!textureCode.includes('[awayName, homeName, texture, world]'),
  'stadium GPU texture must not upload for every world object change')

console.log('EFU mid-match crash regression checks passed: safe WebGL recovery, world/texture throttling, low-memory graphics and preserved score.')
