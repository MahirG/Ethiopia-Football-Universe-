import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
const manifest = read('data/world/world-manifest.json')
const formats = read('data/world/tournament-formats.json')
const operations = read('data/world/matchday-operations.json')
const network = read('data/world/network-policy.json')
const failures = []

if (manifest.competitionCount < 10) failures.push('Expected at least ten competition profiles')
if (manifest.venueCount < 12) failures.push('Expected at least twelve venue profiles')
if (manifest.surfaceCount < 6) failures.push('Expected at least six surface profiles')
if (manifest.ballCount < 8) failures.push('Expected at least eight ball profiles')
if (new Set(manifest.competitionFormats).size !== manifest.competitionFormats.length) failures.push('Duplicate competition formats')
if (new Set(manifest.venueArchetypes).size !== manifest.venueArchetypes.length) failures.push('Duplicate venue archetypes')
if (formats.formats.length !== manifest.competitionFormats.length) failures.push('Tournament format manifest mismatch')
if (!formats.schedulingConstraints.includes('weather-risk')) failures.push('Scheduling must include weather risk')
if (!operations.timeline.some((item) => item.phase === 'halftime' && item.activities.includes('divot-repair'))) failures.push('Half-time divot repair missing')
if (!operations.staffRoles.includes('ball-assistant') || !operations.staffRoles.includes('trophy-handler')) failures.push('Required staff roles missing')
if (!network.authoritative.includes('pitch-condition') || !network.authoritative.includes('stadium-screens')) failures.push('World networking authority incomplete')
if (!network.localSimulation.includes('crowd-idle-animation')) failures.push('Crowd local-simulation policy missing')

if (failures.length) {
  console.error('[world:validate] failed')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(`[world:validate] passed — ${manifest.competitionCount} competitions, ${manifest.venueCount} venues, ${manifest.surfaceCount} surfaces, ${manifest.ballCount} balls, ${formats.formats.length} formats`)
