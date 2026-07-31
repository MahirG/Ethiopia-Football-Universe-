import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'))
const fail = (message) => { throw new Error(`[human:validate] ${message}`) }

const biomechanics = readJson('data/human/biomechanics-targets.json')
const archetypes = readJson('data/human/player-archetypes.json')
const mocap = readJson('data/human/mocap-capture-plan.json')
const performance = readJson('data/human/performance-presets.json')
const network = readJson('data/human/network-policy.json')

if (archetypes.archetypes.length !== 6) fail('expected six position archetypes')
for (const archetype of archetypes.archetypes) {
  if (!archetype.role || archetype.heightM.length !== 2 || archetype.massKg.length !== 2) fail(`invalid archetype ${archetype.role}`)
  if (archetype.heightM[0] >= archetype.heightM[1]) fail(`invalid height range for ${archetype.role}`)
}
if (Object.keys(biomechanics.metrics).length < 9) fail('biomechanics validation matrix is incomplete')
if (mocap.sessions.length < 12 || mocap.status !== 'capture-required') fail('mocap capture/replacement plan is incomplete')
if (Object.keys(performance.presets).length !== 3) fail('performance presets are incomplete')
if (network.authority.ball !== 'server' || network.authority.collisions !== 'server') fail('network authority must protect ball and collision fairness')

const sourceFiles = [
  'src/human/types.ts',
  'src/human/profiles.ts',
  'src/human/state.ts',
  'src/human/biomechanics.ts',
  'src/human/decisionAI.ts',
  'src/human/ballContact.ts',
  'src/human/techniques.ts',
  'src/human/relationships.ts',
  'src/human/officiating.ts',
  'src/human/network.ts',
  'src/human/validation.ts',
  'src/human/HumanPlayerVisual.tsx',
]
for (const relative of sourceFiles) if (!fs.existsSync(path.join(root, relative))) fail(`missing ${relative}`)

const techniques = fs.readFileSync(path.join(root, 'src/human/techniques.ts'), 'utf8')
const techniqueCount = [...techniques.matchAll(/id: '[^']+'/g)].length
if (techniqueCount < 22) fail(`expected at least 22 football techniques, found ${techniqueCount}`)

const playerSource = fs.readFileSync(path.join(root, 'src/game/PlayerAvatar.tsx'), 'utf8')
for (const required of ['solveLocomotion', 'chooseDecision', 'calculateBallContact', 'evaluateInjury', 'assessTackle']) {
  if (!playerSource.includes(required)) fail(`PlayerAvatar is not integrated with ${required}`)
}
const visualSource = fs.readFileSync(path.join(root, 'src/human/HumanPlayerVisual.tsx'), 'utf8')
for (const required of ['highLodRef', 'blinkTimer', 'skinMaterials', 'jerseyFrontRef', 'hairDetailRef']) {
  if (!visualSource.includes(required)) fail(`digital-human renderer missing ${required}`)
}

console.log(`[human:validate] passed — ${archetypes.archetypes.length} roles, ${techniqueCount} techniques, ${mocap.sessions.length} mocap sessions, ${Object.keys(biomechanics.metrics).length} biomechanical metrics`)
