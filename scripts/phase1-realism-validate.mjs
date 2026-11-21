import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

function loadTypeScript(path) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const output = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  runInNewContext(output, { exports, module: { exports } }, { filename: path })
  return exports
}

const { ATHLETE_LOD_BUDGETS, selectAthleteLod } = loadTypeScript('src/human/realismLOD.ts')
const { createPlayerProfile } = loadTypeScript('src/human/profiles.ts')

for (const quality of ['performance', 'balanced', 'ultra']) {
  const config = ATHLETE_LOD_BUDGETS[quality]
  assert.ok(config.heroDistance > config.faceDistance, quality + ': face distance must remain inside hero range')
  assert.ok(config.fieldDistance > config.heroDistance + 2 * config.hysteresis, quality + ': LOD regions must not overlap')
  assert.ok(config.faceUpdateFrames >= 1 && Number.isInteger(config.faceUpdateFrames))
  assert.equal(selectAthleteLod(99999, quality, true), 'hero', 'controlled player stays detailed')
  assert.equal(selectAthleteLod(-1, quality, false), 'distance')
  assert.equal(selectAthleteLod(NaN, quality, false), 'distance')
  assert.equal(selectAthleteLod(0, quality, false), 'hero')
  assert.equal(selectAthleteLod(config.fieldDistance + config.hysteresis + 100, quality, false), 'distance')
  assert.equal(selectAthleteLod(config.heroDistance, quality, false, 'hero'), 'hero')
  assert.equal(selectAthleteLod(config.heroDistance + config.hysteresis + 1, quality, false, 'hero'), 'field')
  assert.equal(selectAthleteLod(config.fieldDistance, quality, false, 'field'), 'field')
  assert.equal(selectAthleteLod(config.fieldDistance + config.hysteresis + 1, quality, false, 'field'), 'distance')
}

const players = ['home', 'away'].flatMap(team => Array.from({ length: 11 }, (_, index) => createPlayerProfile(index, team)))
assert.equal(players.length, 22)
assert.equal(new Set(players.map(player => player.id)).size, 22, 'stable unique player IDs')
assert.ok(new Set(players.map(player => player.face.skinTone)).size >= 4, 'appearance variation')
assert.ok(new Set(players.map(player => player.face.hairStyle)).size >= 3, 'hairstyle variation')
assert.ok(players.every(player => player.body.height > 1.5 && player.body.height < 2.15), 'plausible body proportions')
assert.deepEqual(createPlayerProfile(4, 'home'), createPlayerProfile(4, 'home'), 'appearance must be deterministic')

const visual = readFileSync(new URL('../src/human/HumanPlayerVisual.tsx', import.meta.url), 'utf8')
const anim = readFileSync(new URL('../src/human/RealisticPlayerAnimation.ts', import.meta.url), 'utf8')
for (const label of ['highLodRef', 'fieldLodRef', 'lowLodRef']) {
  assert.ok(visual.includes(label), 'missing ' + label)
}
assert.ok(anim.includes('selectAthleteLod'), 'animation must drive LOD switching')
assert.ok(anim.includes("lod === 'field'"), 'animated medium player must be selected in match')
const fieldAnimation = readFileSync(new URL('../src/human/RiggedAthlete.tsx', import.meta.url), 'utf8')
assert.ok(visual.includes('<RiggedAthlete'), 'rigged mid-detail athletes must remain integrated')
assert.ok(fieldAnimation.includes('bones.thighL.rotation.x') && fieldAnimation.includes('bones.upperArmR.rotation.x'),
  'rigged middle-detail limbs must be animated')
const parts = readFileSync(new URL('../src/human/RealisticPlayerParts.tsx', import.meta.url), 'utf8')
assert.ok(parts.includes('resolution: 128 | 256 | 512'), 'texture resolution must be bounded')
assert.ok(parts.includes('texture.generateMipmaps = resolution > 128'), 'mobile profile must avoid unnecessary mipmaps')
assert.ok(visual.includes("quality === 'ultra' ? 512 : quality === 'balanced' ? 256 : 128"), 'quality must control texture budget')

console.log('EFU Phase 1: LOD thresholds, hysteresis, 22 stable athlete profiles, texture budgets, and renderer wiring validated.')
