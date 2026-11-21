import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const nodeRequire = createRequire(import.meta.url)
const THREE = nodeRequire('three')

function loadTs(path) {
  const code = readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(code, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const mod = { exports: {} }
  runInNewContext(compiled, { module: mod, exports: mod.exports, require: nodeRequire }, { filename: path })
  return mod.exports
}

const { createPlayerProfile } = loadTs('src/human/profiles.ts')
const { createRiggedAthlete } = loadTs('src/human/riggedAthleteFactory.ts')

const palette = { jersey: '#17643b', shorts: '#d22a32', socks: '#e7be39', trim: '#efdb78' }
const models = []
try {
  for (const quality of ['performance', 'balanced', 'ultra']) {
    const profile = createPlayerProfile(8, 'home')
    const rig = createRiggedAthlete(profile, palette, quality)
    models.push(rig)
    assert.equal(rig.mesh.isSkinnedMesh, true, 'player must be GPU skinned')
    assert.equal(rig.mesh.skeleton.bones.length, 13, 'expected unified 13-bone athlete rig')
    assert.equal(rig.mesh.skeleton.boneInverses.length, 13, 'missing inverse bind matrices')
    assert.equal(rig.mesh.geometry.getAttribute('skinIndex').count,
      rig.mesh.geometry.getAttribute('position').count, 'skinIndices must cover all vertices')
    assert.equal(rig.mesh.geometry.getAttribute('skinWeight').count,
      rig.mesh.geometry.getAttribute('position').count, 'skin weights must cover all vertices')
    assert.ok(rig.triangleCount > 0 && rig.triangleCount < 30000, 'mobile triangle budget exceeded')
    assert.ok(rig.mesh.geometry.groups.length >= 5, 'shirt, shorts, skin, socks, and boots must be distinct')
    for (const name of ['hips', 'spine', 'head', 'upperArmL', 'lowerArmL', 'thighL', 'shinL', 'footL']) {
      assert.ok(rig.bones[name], 'missing rig joint: ' + name)
    }
  }

  assert.ok(models[0].triangleCount < models[1].triangleCount)
  assert.ok(models[1].triangleCount < models[2].triangleCount)
  const rig = models[1]
  const positions = rig.mesh.geometry.getAttribute('position')
  const skinIndices = rig.mesh.geometry.getAttribute('skinIndex')
  const upperArmIndex = rig.mesh.skeleton.bones.indexOf(rig.bones.upperArmL)
  // Tapered limb primitives start close to the shoulder pivot. Sampling the
  // very first vertex is invalid: a vertex on the rotation axis barely moves.
  // Sample the lowest (distal) vertex weighted to the upper-arm bone instead.
  let sample = -1
  let lowestY = Infinity
  for (let index = 0; index < skinIndices.count; index += 1) {
    if (skinIndices.getX(index) !== upperArmIndex) continue
    if (positions.getY(index) < lowestY) {
      lowestY = positions.getY(index)
      sample = index
    }
  }
  assert.ok(sample >= 0, 'upper-arm vertices not weighted to their skeleton bone')
  const neutral = new THREE.Vector3().fromBufferAttribute(positions, sample)
  const before = rig.mesh.applyBoneTransform(sample, neutral.clone())
  rig.bones.upperArmL.rotation.z = 0.65
  rig.mesh.updateMatrixWorld(true)
  const after = rig.mesh.applyBoneTransform(sample, neutral.clone())
  assert.ok(before.distanceTo(after) > 0.015, 'skeletal animation must actually deform geometry')

  const reference = createPlayerProfile(0, 'home')
  const keeper = createRiggedAthlete(reference, { ...palette, jersey: '#16222f' }, 'performance')
  models.push(keeper)
  assert.equal(keeper.bones.head.name, 'head')
  assert.notEqual(reference.body.height, createPlayerProfile(8, 'home').body.height,
    'role-based body variation should be maintained')

  const integration = readFileSync(new URL('../src/human/HumanPlayerVisual.tsx', import.meta.url), 'utf8')
  assert.ok(integration.includes('<RiggedAthlete'), 'skinned athlete must be connected to on-field renderer')
  assert.ok(integration.includes('ref={highLodRef}') && integration.includes('ref={lowLodRef}'),
    'existing hero and performance fallbacks must survive')
  assert.ok(integration.includes('frontNumber={frontTexture}'), 'jersey numbering must be passed through')
  const motion = readFileSync(new URL('../src/human/RiggedAthlete.tsx', import.meta.url), 'utf8')
  for (const token of ['useFrame', 'bones.thighL.rotation.x', 'bones.upperArmL.rotation.x',
    'bones.head.rotation.y', 'visual.kick', 'visual.goalkeeperDive']) {
    assert.ok(motion.includes(token), 'missing live animation integration: ' + token)
  }
  console.log('EFU Phase 2 rig validation passed:', models.slice(0, 3).map(model => model.triangleCount),
    'triangles across quality presets. Bind pose, bones, deformations, animation wiring and fallbacks verified.')
} finally {
  for (const rig of models) rig.dispose()
}
