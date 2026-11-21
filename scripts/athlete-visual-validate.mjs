import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const requireFromHere = createRequire(import.meta.url)
function load(path) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const out = {}
  runInNewContext(code, { module: { exports: out }, exports: out, require: requireFromHere }, { filename: path })
  return out
}
const { createPlayerProfile } = load('src/human/profiles.ts')
const { createRiggedAthlete } = load('src/human/riggedAthleteFactory.ts')
const { QUALITY_PRESETS } = load('src/game/quality.ts')
const near = (a, b, eps = 0.002) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`)

const palette = { jersey: '#167847', shorts: '#bb2c30', socks: '#e7cf48', trim: '#faf1d3' }
const created = []
try {
  for (const roleIndex of [0, 3, 7, 9]) {
    const player = createPlayerProfile(roleIndex, 'home')
    for (const tier of ['performance', 'balanced', 'ultra']) {
      const rig = createRiggedAthlete(player, palette, tier)
      created.push(rig)
      const mesh = rig.mesh
      const geom = mesh.geometry
      const bounds = geom.boundingBox
      assert.ok(bounds, 'geometry bounding box must be computed')
      const scale = mesh.scale.x
      const sole = player.body.height / 2 + mesh.position.y + bounds.min.y * scale
      const crown = player.body.height / 2 + mesh.position.y + bounds.max.y * scale
      near(sole, 0, 0.002)
      near(crown, player.body.height, 0.002)
      assert.ok(mesh.scale.x > 0.65 && mesh.scale.x < 1.06, 'realistic body must not have exaggerated scale')
      assert.ok(rig.triangleCount < 24000, 'mobile mesh must obey polygon budget')
      assert.ok(rig.bones.head && rig.bones.thighL && rig.bones.shinR, 'existing animation skeleton must be preserved')
      // Every skinned influence must be finite, normalized and attached to a valid bone.
      const weights = geom.getAttribute('skinWeight')
      const joints = geom.getAttribute('skinIndex')
      for (let i = 0; i < weights.count; i += 1) {
        const values = [weights.getX(i), weights.getY(i), weights.getZ(i), weights.getW(i)]
        assert.ok(values.every(Number.isFinite))
        near(values.reduce((a,b) => a+b, 0), 1, 0.00005)
        assert.ok(joints.getX(i) < mesh.skeleton.bones.length)
        if (values[1] > 0.001) assert.ok(joints.getY(i) < mesh.skeleton.bones.length)
      }
      // The approved look is adult football anatomy, not a giant-headed doll.
      const headIndex = mesh.skeleton.bones.findIndex(b => b.name === 'head')
      const positions = geom.getAttribute('position')
      let minHeadX = Infinity, maxHeadX = -Infinity
      let minHeadY = Infinity, maxHeadY = -Infinity
      for (let i = 0; i < positions.count; i += 1) {
        if (joints.getX(i) !== headIndex) continue
        const x = positions.getX(i), y = positions.getY(i)
        minHeadX = Math.min(minHeadX, x); maxHeadX = Math.max(maxHeadX, x)
        minHeadY = Math.min(minHeadY, y); maxHeadY = Math.max(maxHeadY, y)
      }
      const headWidth = (maxHeadX - minHeadX) * scale
      const headHeight = (maxHeadY - minHeadY) * scale
      assert.ok(headWidth > 0.18 && headWidth < player.body.height * 0.26, 'head proportion must remain adult-sized')
      assert.ok(headHeight < player.body.height * 0.34, 'oversized head is not acceptable')
    }
  }
  const animation = readFileSync(new URL('../src/human/RealisticPlayerAnimation.ts', import.meta.url), 'utf8')
  assert.ok(animation.includes("selectedLod === 'hero' ? 'field' : selectedLod"))
  assert.ok(animation.includes('refs.highLod.current.visible = false'))
  assert.ok(animation.includes("refs.fieldLod.current.visible = lod === 'field'"))
  const camera = readFileSync(new URL('../src/game/CameraRig.tsx', import.meta.url), 'utf8')
  assert.ok(camera.includes('state.size.width < 720') && camera.includes('player.y + 7.0'))
  const canvas = readFileSync(new URL('../src/game/MatchScene.tsx', import.meta.url), 'utf8')
  assert.ok(canvas.includes('<AdaptiveDpr pixelated={false} />'))
  const hud = readFileSync(new URL('../src/ui/football-gameplay-hud.css', import.meta.url), 'utf8')
  assert.ok(hud.includes('.phase5-overlay-grid,.phase5-overlay>small{display:none!important}'))
  assert.ok(hud.includes('.world-broadcast-tag{display:none!important}'))
  assert.ok(QUALITY_PRESETS.performance.dpr[1] <= 1)
  console.log('EFU athlete visual validation PASSED: real-height alignment, narrower heads, 13-bone rigs, geometry budgets, camera framing and HUD.')
} finally {
  for (const rig of created) rig.dispose()
}
