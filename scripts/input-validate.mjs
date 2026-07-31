import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../data/input/control-presets.json', import.meta.url), 'utf8'))
const requiredActions = ['move', 'sprint', 'pass', 'through-pass', 'lob-pass', 'shoot', 'tackle', 'player-switch', 'cancel']
const requiredPresets = ['classic', 'competitive', 'mobile-simple', 'mobile-advanced', 'one-handed']
const failures = []
for (const action of requiredActions) if (!manifest.actions.includes(action)) failures.push(`missing action: ${action}`)
for (const preset of requiredPresets) if (!manifest.presets.some((item) => item.id === preset)) failures.push(`missing preset: ${preset}`)
if (!manifest.devicePolicy?.physicsParity) failures.push('physics parity policy must be enabled')
if (!manifest.devicePolicy?.automaticPromptSwitching) failures.push('automatic prompt switching policy must be enabled')
if (failures.length) {
  console.error(`Input validation failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`Input validation passed: ${manifest.actions.length} actions, ${manifest.presets.length} presets.`)
