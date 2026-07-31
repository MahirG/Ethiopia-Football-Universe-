import { readFileSync } from 'node:fs'

const json = (path) => JSON.parse(readFileSync(path, 'utf8'))
const fail = (message) => { throw new Error(`[phase6:validate] ${message}`) }
const unique = (items) => new Set(items).size === items.length

const manifest = json('data/online/manifest.json')
const modes = json('data/online/modes.json')
const regions = json('data/online/regions.json')
const divisions = json('data/online/divisions.json')
const security = json('data/online/security.json')
const liveops = json('data/online/liveops.json')
const schema = readFileSync('supabase/schema/phase6_online.sql', 'utf8')
const authority = readFileSync('supabase/functions/match-authority/index.ts', 'utf8')

if (manifest.phase !== 6) fail('manifest phase must be 6')
if (manifest.serverAuthority !== true) fail('server authority must be declared')
if (manifest.offlineFallback !== true) fail('offline fallback is required')
if (modes.length < manifest.requiredModes) fail(`expected at least ${manifest.requiredModes} online modes`)
if (!unique(modes.map((mode) => mode.id))) fail('online mode ids must be unique')
if (modes.filter((mode) => mode.ranked).length < 4) fail('at least four ranked modes are required')
if (modes.some((mode) => mode.teamSize < 1 || mode.teamSize > 5 || mode.reconnectSeconds < 60)) fail('invalid team size or reconnect window')
if (regions.length < manifest.requiredRegions || !unique(regions.map((region) => region.id))) fail('region catalog is incomplete or duplicated')
if (!regions.some((region) => region.id === 'auto' && region.enabled)) fail('automatic routing must remain enabled')
if (divisions.length < manifest.requiredDivisions || !unique(divisions.map((division) => division.id))) fail('ranked divisions are incomplete or duplicated')
if (divisions.some((division, index) => index > 0 && division.minimumRating > divisions[index - 1].minimumRating)) fail('division ratings must descend')
if (liveops.season.payToWin !== false) fail('season must explicitly reject pay-to-win rewards')
if (liveops.events.length < 3) fail('at least three live competition events are required')
if (!security.serverAuthoritative.includes('match-result') || !security.serverAuthoritative.includes('rating-change')) fail('result and rating must remain authoritative')
if (!security.clientPredicted.includes('movement')) fail('movement prediction contract is missing')
if (security.moderationCategories.length < 6) fail('moderation taxonomy is incomplete')

const rlsCount = (schema.match(/enable row level security/gi) ?? []).length
if (rlsCount < 8) fail('every exposed online table must enable RLS')
if (!schema.includes('with (security_invoker = true)')) fail('leaderboard view must use security_invoker')
if (!schema.includes('to authenticated')) fail('policies must specify authenticated role')
if (!schema.includes('(select auth.uid())')) fail('ownership policies must use auth.uid')
if (/service_role/i.test(authority)) fail('Edge Function must not use a browser-exposed service role')
if (!authority.includes("request.headers.get('Authorization')")) fail('Edge Function must forward the caller JWT')
if (!authority.includes("Deno.env.get('SUPABASE_PUBLISHABLE_KEY')")) fail('Edge Function publishable key contract is missing')

console.log(`[phase6:validate] passed — ${modes.length} modes, ${regions.length} regions, ${divisions.length} divisions, ${liveops.events.length} live events, ${rlsCount} RLS tables`)
