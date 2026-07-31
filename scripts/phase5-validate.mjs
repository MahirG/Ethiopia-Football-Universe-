import fs from 'node:fs'

function read(path) { return JSON.parse(fs.readFileSync(path, 'utf8')) }
function assert(condition, message) { if (!condition) throw new Error(`[phase5:validate] ${message}`) }

const manifest = read('data/phase5/competitive-manifest.json')
const assets = read('data/phase5/asset-pipeline.json')
const laws = read('data/phase5/laws-and-var.json')

assert(manifest.tacticalPresets >= 6, 'at least six tactical presets are required')
assert(manifest.refereeProfiles >= 4, 'at least four referee profiles are required')
assert(manifest.setPieceRoutines >= 14, 'set-piece catalog is incomplete')
assert(new Set(manifest.restartTypes).size === 8, 'all eight restart types must be unique')
assert(manifest.varReviewTypes.includes('goal') && manifest.varReviewTypes.includes('offside'), 'VAR review coverage is incomplete')
assert(manifest.authoritativeDomains.includes('score') && manifest.authoritativeDomains.includes('restarts'), 'network authority policy is incomplete')
assert(assets.slots >= 9, 'professional asset pipeline requires nine registered slots')
assert(assets.tiers.includes('procedural') && assets.tiers.includes('cinematic'), 'asset tiers are incomplete')
assert(assets.formats.includes('glb') && assets.formats.includes('ktx2'), 'compressed production formats are missing')
assert(laws.offside.evaluateAtPass && laws.offside.penalizeOnInvolvement, 'offside law must separate position from active involvement')
assert(laws.var.reviewable.length >= 5, 'VAR review categories are incomplete')

console.log(`[phase5:validate] passed — ${manifest.tacticalPresets} tactics, ${manifest.refereeProfiles} referee profiles, ${manifest.setPieceRoutines} routines, ${assets.slots} asset slots, ${manifest.restartTypes.length} restart types`)
