import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const requireFromHere = createRequire(import.meta.url)
function load(path) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const mod = { exports: {} }
  runInNewContext(code, { module: mod, exports: mod.exports, require: requireFromHere }, { filename: path })
  return mod.exports
}
const { responseAlpha, sampleAthletePose } = load('src/human/athleteMotion.ts')
const { createPlayerProfile } = load('src/human/profiles.ts')
const { createRiggedAthlete } = load('src/human/riggedAthleteFactory.ts')

function input(overrides = {}) {
  return {
    speed: 0, gaitPhase: 0, strideLength: 1, lean: 0, braking: 0, slip: 0,
    plantBias: 0.5, kick: 0, tackle: 0, jump: 0, goalkeeperDive: 0,
    stumble: 0, fatigue: 0, armSwing: 1, preferredFoot: 'right',
    celebrating: false, ...overrides,
  }
}
const still = sampleAthletePose(input())
const running = sampleAthletePose(input({ speed: 8, gaitPhase: Math.PI / 2 }))
const kicking = sampleAthletePose(input({ kick: 1, preferredFoot: 'right' }))
const leftKicking = sampleAthletePose(input({ kick: 1, preferredFoot: 'left' }))
const celebrate = sampleAthletePose(input({ celebrating: true }))
const keeperDive = sampleAthletePose(input({ goalkeeperDive: 1 }))
assert.ok(Math.abs(still.leftThigh) < 0.05, 'idle thigh movement should be neutral')
assert.ok(Math.abs(running.leftThigh) > Math.abs(still.leftThigh), 'sprint must move the leg')
assert.ok(kicking.rightThigh > kicking.leftThigh + 0.7, 'right-foot strike not distinct')
assert.ok(leftKicking.leftThigh > leftKicking.rightThigh + 0.7, 'left-foot strike not distinct')
assert.ok(celebrate.leftArm < -1.8 && celebrate.rightArm < -1.8, 'celebration arms not raised')
assert.ok(keeperDive.leftArm < -1, 'keeper dive must affect arms')
for (const p of [
  still, running, kicking, leftKicking, celebrate, keeperDive,
  sampleAthletePose(input({ speed: Infinity, gaitPhase: NaN, jump: Infinity, kick: NaN })),
]) for (const value of Object.values(p)) assert.ok(Number.isFinite(value), 'pose contains non-finite rotation')
const rate = 9
const alpha60 = responseAlpha(rate, 1 / 60)
const alpha30 = responseAlpha(rate, 1 / 30)
assert.ok(Math.abs((1 - (1 - alpha60) ** 2) - alpha30) < 0.000001, 'blend must be frame-rate independent')

const palette = { jersey: '#167745', shorts: '#ca213b', socks: '#e5cb42', trim: '#f0d36d' }
const rigs = []
try {
  for (const quality of ['performance', 'balanced', 'ultra']) {
    const rig = createRiggedAthlete(createPlayerProfile(9, 'home'), palette, quality)
    rigs.push(rig)
    assert.ok(rig.triangleCount < 30000, 'athlete exceeds mobile geometry budget')
    const weights = rig.mesh.geometry.getAttribute('skinWeight')
    const bones = rig.mesh.geometry.getAttribute('skinIndex')
    let blended = 0
    for (let i = 0; i < weights.count; i++) {
      const sum = weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i)
      assert.ok(Math.abs(sum - 1) < 0.00001, 'vertex weights must sum to one')
      if (weights.getY(i) > 0.005) {
        blended++
        assert.notEqual(bones.getX(i), bones.getY(i), 'secondary influence must belong to a distinct joint')
      }
    }
    assert.ok(blended > 20, 'at least some elbow and knee vertices must blend across bones')
  }
  assert.ok(rigs[0].triangleCount < rigs[1].triangleCount && rigs[1].triangleCount < rigs[2].triangleCount,
    'quality tier must have increasing geometry complexity')
  const component = readFileSync(new URL('../src/human/RiggedAthlete.tsx', import.meta.url), 'utf8')
  assert.ok(component.includes('sampleAthletePose(') && component.includes('responseAlpha('),
    'on-field rig must use independent pose smoothing')
  assert.ok(component.includes('if (!rig.mesh.parent?.visible) return'), 'invisible athletes must not animate')
  console.log('Phase 3 visual/motion validation passed:', rigs.map(r => r.triangleCount), 'triangles by tier.')
} finally {
  for (const rig of rigs) rig.dispose()
}
