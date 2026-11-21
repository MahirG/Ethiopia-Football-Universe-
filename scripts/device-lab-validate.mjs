import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

function fromTypeScript(path) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const output = {}
  runInNewContext(compiled, { module: { exports: output }, exports: output }, { filename: path })
  return output
}
const near = (a, b, epsilon = 0.01) => assert.ok(Math.abs(a - b) < epsilon, `${a} should be near ${b}`)
const { FrameHealthMonitor, percentile } = fromTypeScript('src/diagnostics/frameHealth.ts')
const { setVirtualAction, setVirtualMovement, releaseAllVirtualInput, consumeVirtualInput } = fromTypeScript('src/input/bus.ts')

assert.equal(percentile([], 0.95), 0)
assert.equal(percentile([10, 20, 30, 40], 0.95), 40)
assert.equal(percentile([10, 20, 30, 40], 0.5), 20)

const healthy = new FrameHealthMonitor(120)
for (let index = 0; index < 100; index++) healthy.addFrame(1 / 60)
let result = healthy.snapshot({ drawCalls: 123, triangles: 9000, dpr: 1.25 })
near(result.averageFps, 60)
near(result.p95FrameMs, 16.7, 0.11)
assert.equal(result.slowFramePercent, 0)
assert.equal(result.sampledFrames, 100)
assert.equal(result.drawCalls, 123)
assert.equal(result.triangles, 9000)
near(result.dpr, 1.25)
assert.equal(healthy.shouldPublish(1000), true)
assert.equal(healthy.shouldPublish(1500), false)
assert.equal(healthy.shouldPublish(2001), true)
healthy.addFrame(Infinity)
healthy.addFrame(-1)
healthy.addFrame(3)
assert.equal(healthy.snapshot().sampledFrames, 100, 'invalid frames must not pollute metrics')
for (let index = 0; index < 80; index++) healthy.addFrame(1 / 20)
result = healthy.snapshot()
assert.equal(result.sampledFrames, 120, 'rolling frame window should remain memory-bounded')
assert.ok(result.slowFramePercent > 50, 'performance regression should be detected')
assert.ok(result.p95FrameMs >= 49.9)
healthy.reset()
assert.equal(healthy.snapshot().sampledFrames, 0, 'new capture must clear previous session')

const empty = consumeVirtualInput()
assert.equal(empty.held.size, 0)
setVirtualMovement(0.6, 0.8)
setVirtualAction('shoot', true)
setVirtualAction('sprint', true)
const simultaneous = consumeVirtualInput()
assert.equal(simultaneous.held.size, 2, 'shoot and sprint must coexist')
assert.equal(simultaneous.pressed.size, 2)
near(simultaneous.move.magnitude, 1)
setVirtualAction('shoot', false)
const halfReleased = consumeVirtualInput()
assert.equal(halfReleased.held.has('sprint'), true, 'releasing shoot cannot cancel sprint')
assert.equal(halfReleased.released.has('shoot'), true)
setVirtualAction('pass', true)
releaseAllVirtualInput()
const cancelled = consumeVirtualInput()
assert.equal(cancelled.pressed.size, 0, 'blur must cancel unconsumed presses')
assert.equal(cancelled.move.magnitude, 0)
assert.equal(cancelled.held.size, 0)
assert.equal(cancelled.released.has('sprint'), true)
assert.equal(cancelled.released.has('pass'), true)

const scene = readFileSync(new URL('../src/game/MatchScene.tsx', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/components/MatchView.tsx', import.meta.url), 'utf8')
const probe = readFileSync(new URL('../src/diagnostics/MatchPerformanceProbe.tsx', import.meta.url), 'utf8')
const lab = readFileSync(new URL('../src/diagnostics/MatchDeviceLab.tsx', import.meta.url), 'utf8')
assert.ok(scene.includes('<MatchPerformanceProbe') && scene.includes('props.performanceActive'),
  'probe must be attached to the actual match Canvas')
assert.ok(probe.includes('useFrame(') && probe.includes('info.render.calls'),
  'capture must sample real WebGL renderer information')
assert.ok(probe.includes('!active || !running'), 'probe must remain off outside an active capture')
assert.ok(view.includes('<MatchDeviceLab') && view.includes('performanceActive={capturingHealth}'),
  'Device Lab must be accessible in MatchView and read actual probe events')
assert.ok(lab.includes('URL.createObjectURL') && lab.includes('completedManualChecks'),
  'capture export must include actual and manually confirmed evidence')
assert.ok(!lab.includes('fetch('), 'local device reports should not be uploaded')
assert.ok(lab.includes('Browser frame timings') && lab.includes('Manual Android checklist'),
  'must not misrepresent browser metrics as physical GPU memory or automated device certification')
console.log('EFU Device Lab validated: real-scene hook, rolling P95/FPS, bounded frames, independent multitouch, blur cancellation, and local report export.')
