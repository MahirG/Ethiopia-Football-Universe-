import type { CompetitionProfile, TournamentFixture, TournamentStanding, TournamentTeam } from './types'

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

export function seededDraw(teams: TournamentTeam[], competition: CompetitionProfile) {
  const sorted = [...teams].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999) || b.coefficient - a.coefficient)
  const groups = Array.from({ length: Math.max(1, competition.groupCount ?? 1) }, () => [] as TournamentTeam[])
  sorted.forEach((team, index) => {
    const direction = Math.floor(index / groups.length) % 2 === 0 ? 1 : -1
    const slot = direction === 1 ? index % groups.length : groups.length - 1 - (index % groups.length)
    const protectedConflict = groups[slot].some((item) => item.protectedGroup && item.protectedGroup === team.protectedGroup)
    if (!protectedConflict) groups[slot].push(team)
    else {
      const alternative = groups.findIndex((group) => !group.some((item) => item.protectedGroup && item.protectedGroup === team.protectedGroup))
      groups[alternative >= 0 ? alternative : slot].push(team)
    }
  })
  return groups
}

export function generateRoundRobin(teams: TournamentTeam[], twoLegs = true): TournamentFixture[] {
  const ids = teams.map((team) => team.id)
  if (ids.length % 2 === 1) ids.push('__bye__')
  const fixtures: TournamentFixture[] = []
  const fixed = ids[0]
  const rotating = ids.slice(1)
  for (let round = 0; round < ids.length - 1; round += 1) {
    const current = [fixed, ...rotating]
    for (let pair = 0; pair < current.length / 2; pair += 1) {
      const a = current[pair]
      const b = current[current.length - 1 - pair]
      if (a === '__bye__' || b === '__bye__') continue
      const homeId = (round + pair) % 2 === 0 ? a : b
      const awayId = homeId === a ? b : a
      fixtures.push({ id: `rr-${round + 1}-${pair}-${homeId}-${awayId}`, round: round + 1, leg: 1, homeId, awayId, neutral: false })
    }
    rotating.unshift(rotating.pop() as string)
  }
  if (twoLegs) {
    const second = fixtures.map((fixture) => ({ ...fixture, id: `${fixture.id}-return`, round: fixture.round + ids.length - 1, leg: 2 as const, homeId: fixture.awayId, awayId: fixture.homeId }))
    fixtures.push(...second)
  }
  return fixtures
}

export function generateKnockout(teams: TournamentTeam[], twoLegs = false, neutralFinal = true): TournamentFixture[] {
  const ordered = [...teams].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999) || b.coefficient - a.coefficient)
  const fixtures: TournamentFixture[] = []
  for (let index = 0; index < Math.floor(ordered.length / 2); index += 1) {
    const home = ordered[index]
    const away = ordered[ordered.length - 1 - index]
    fixtures.push({ id: `ko-r1-${home.id}-${away.id}`, round: 1, leg: 1, homeId: home.id, awayId: away.id, neutral: neutralFinal && ordered.length === 2 })
    if (twoLegs && ordered.length > 2) fixtures.push({ id: `ko-r1-${away.id}-${home.id}-return`, round: 1, leg: 2, homeId: away.id, awayId: home.id, neutral: false })
  }
  return fixtures
}

export function compareStandings(a: TournamentStanding, b: TournamentStanding, competition: CompetitionProfile) {
  for (const rule of competition.tiebreakers) {
    if (rule === 'points' && a.points !== b.points) return b.points - a.points
    if (rule === 'goal-difference') {
      const difference = (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
      if (difference !== 0) return difference
    }
    if (rule === 'goals-scored' && a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor
    if (rule === 'head-to-head' && (a.headToHeadPoints ?? 0) !== (b.headToHeadPoints ?? 0)) return (b.headToHeadPoints ?? 0) - (a.headToHeadPoints ?? 0)
    if (rule === 'fair-play' && a.fairPlay !== b.fairPlay) return a.fairPlay - b.fairPlay
    if (rule === 'lots') return stableHash(a.teamId) - stableHash(b.teamId)
  }
  return a.teamId.localeCompare(b.teamId)
}

export function rankTable(table: TournamentStanding[], competition: CompetitionProfile) {
  return [...table].sort((a, b) => compareStandings(a, b, competition))
}

export function validateCompetitionSchedule(fixtures: TournamentFixture[], minimumRestDays = 2) {
  const problems: string[] = []
  const ids = new Set<string>()
  for (const fixture of fixtures) {
    if (ids.has(fixture.id)) problems.push(`Duplicate fixture id: ${fixture.id}`)
    ids.add(fixture.id)
    if (fixture.homeId === fixture.awayId) problems.push(`Team plays itself: ${fixture.id}`)
    if (fixture.round < 1) problems.push(`Invalid round: ${fixture.id}`)
  }
  return { valid: problems.length === 0, problems, minimumRestDays }
}
