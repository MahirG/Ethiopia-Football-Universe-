import { readFileSync, writeFileSync } from 'node:fs'

const file = new URL('../src/game/PlayerAvatar.tsx', import.meta.url)
let source = readFileSync(file, 'utf8')

const replacements = [
  [
    "import type { DecisionResult, FootballTechnique, HumanAction, PreferredFoot, VisualMotionState } from '../human/types'",
    "import type { DecisionResult, FootballTechnique, HumanAction, Perception, PreferredFoot, VisualMotionState } from '../human/types'",
  ],
  [
    `  const keeperObservationCooldown = useRef(0)\n  const pendingContact = useRef<PendingContact | null>(null)`,
    `  const keeperObservationCooldown = useRef(0)\n  const perceptionCache = useRef<Perception | null>(null)\n  const perceptionCooldown = useRef(index * 0.009)\n  const pendingContact = useRef<PendingContact | null>(null)`,
  ],
  [
    `    keeperObservationCooldown.current -= delta\n\n    const perception = perceiveWorld(runtime, humanWorld.world)`,
    `    keeperObservationCooldown.current -= delta\n    perceptionCooldown.current -= delta\n\n    const perceptionInterval = quality === 'performance'\n      ? (controlled ? 0.05 : 0.12 + (index % 4) * 0.015)\n      : quality === 'balanced'\n        ? (controlled ? 0.025 : 0.055 + (index % 3) * 0.008)\n        : 0\n    let perception = perceptionCache.current\n    if (!perception || perceptionCooldown.current <= 0) {\n      perception = perceiveWorld(runtime, humanWorld.world)\n      perceptionCache.current = perception\n      perceptionCooldown.current = perceptionInterval\n    }`,
  ],
  [
    `          decisionCooldown.current = THREE.MathUtils.lerp(0.62, 0.18, profile.ability.reactions) * (difficulty === 'Legendary' ? 0.72 : difficulty === 'Academy' ? 1.28 : 1)`,
    `          decisionCooldown.current = THREE.MathUtils.lerp(0.62, 0.18, profile.ability.reactions)\n            * (difficulty === 'Legendary' ? 0.72 : difficulty === 'Academy' ? 1.28 : 1)\n            * (quality === 'performance' ? 1.7 : quality === 'balanced' ? 1.15 : 1)`,
  ],
]

for (const [before, after] of replacements) {
  if (!source.includes(before)) throw new Error(`Unable to locate PlayerAvatar patch target: ${before.slice(0, 80)}`)
  source = source.replace(before, after)
}

writeFileSync(file, source)
console.log('Mobile live simulation budget applied to player perception and AI decisions.')
