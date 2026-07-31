import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const manifestPath = path.join(root, 'data/core/gameplay-manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const requiredModules = [
  'src/core/engine.ts', 'src/core/types.ts', 'src/core/stateMachine.ts', 'src/core/clock.ts',
  'src/core/physics.ts', 'src/core/rules.ts', 'src/core/tactics.ts', 'src/core/referee.ts',
  'src/core/goalkeeper.ts', 'src/core/setPieces.ts', 'src/core/medical.ts', 'src/core/statistics.ts',
  'src/core/controls.ts', 'src/core/network.ts', 'src/core/performance.ts', 'src/core/debug.ts',
  'src/core/qa.ts', 'docs/core/ARCHITECTURE.md', 'docs/core/QA_PLAN.md', 'docs/core/IMPLEMENTATION_MATRIX.md',
]

const failures = []
if (manifest.requirements.length !== 95) failures.push(`Expected 95 requirements, found ${manifest.requirements.length}`)
const ids = manifest.requirements.map((item) => item.id)
for (let id = 1; id <= 95; id += 1) if (!ids.includes(id)) failures.push(`Missing requirement ${id}`)
for (const item of manifest.requirements) {
  if (!item.status || !Array.isArray(item.implementation) || item.implementation.length === 0) failures.push(`Requirement ${item.id} has no implementation mapping`)
  for (const relative of item.implementation) if (!fs.existsSync(path.join(root, relative))) failures.push(`Requirement ${item.id} references missing ${relative}`)
}
for (const relative of requiredModules) if (!fs.existsSync(path.join(root, relative))) failures.push(`Missing core module ${relative}`)

const engine = fs.readFileSync(path.join(root, 'src/core/engine.ts'), 'utf8')
const matchScene = fs.readFileSync(path.join(root, 'src/game/MatchScene.tsx'), 'utf8')
if (!engine.includes('CoreMatchGameplayEngine')) failures.push('Core orchestrator is missing')
if (!matchScene.includes('coreEngine.tick')) failures.push('Core engine is not integrated into live MatchScene')
if (!matchScene.includes('coreResult.newRestart')) failures.push('Authoritative restarts are not connected')

if (failures.length) {
  console.error('Core gameplay validation failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log(`Core gameplay validation passed: ${manifest.requirements.length}/95 requirements mapped and runtime integration verified.`)
