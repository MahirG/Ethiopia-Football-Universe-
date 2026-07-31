import type { PlayerProfile, PlayerRelationship } from './types'

function value(a: string, b: string, salt: number) {
  let hash = salt * 2166136261
  for (const character of `${a}:${b}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return ((hash >>> 0) % 1000) / 999
}

export function createRelationship(from: PlayerProfile, to: PlayerProfile): PlayerRelationship {
  const teammate = from.team === to.team
  const ageGap = Math.abs(from.body.age - to.body.age)
  const leadership = Math.max(from.personality.leadership, to.personality.leadership)
  return {
    fromId: from.id,
    toId: to.id,
    trust: teammate ? 0.48 + value(from.id, to.id, 1) * 0.45 : 0.08 + value(from.id, to.id, 1) * 0.15,
    chemistry: teammate ? 0.42 + value(from.id, to.id, 2) * 0.52 : 0.05,
    respect: 0.3 + value(from.id, to.id, 3) * 0.62,
    rivalry: teammate ? value(from.id, to.id, 4) * 0.18 : 0.28 + value(from.id, to.id, 4) * 0.62,
    mentorship: teammate && ageGap > 6 ? leadership * (0.45 + value(from.id, to.id, 5) * 0.4) : 0,
    frustration: 0.04 + value(from.id, to.id, 6) * 0.12,
  }
}

export function createRelationshipMap(profiles: Iterable<PlayerProfile>) {
  const entries = [...profiles]
  const map = new Map<string, PlayerRelationship>()
  for (const from of entries) {
    for (const to of entries) {
      if (from.id === to.id) continue
      map.set(`${from.id}>${to.id}`, createRelationship(from, to))
    }
  }
  return map
}

export function relationshipValue(map: Map<string, PlayerRelationship>, fromId: string, toId: string) {
  return map.get(`${fromId}>${toId}`)
}

export function updateRelationshipAfterEvent(
  map: Map<string, PlayerRelationship>,
  fromId: string,
  toId: string,
  event: 'successful-pass' | 'missed-pass' | 'assist' | 'cover' | 'foul' | 'help-up',
) {
  const relationship = map.get(`${fromId}>${toId}`)
  if (!relationship) return
  if (event === 'successful-pass' || event === 'cover') {
    relationship.trust = Math.min(1, relationship.trust + 0.008)
    relationship.chemistry = Math.min(1, relationship.chemistry + 0.005)
  } else if (event === 'assist') {
    relationship.trust = Math.min(1, relationship.trust + 0.04)
    relationship.chemistry = Math.min(1, relationship.chemistry + 0.03)
  } else if (event === 'missed-pass') {
    relationship.frustration = Math.min(1, relationship.frustration + 0.025)
  } else if (event === 'foul') {
    relationship.rivalry = Math.min(1, relationship.rivalry + 0.06)
    relationship.respect = Math.max(0, relationship.respect - 0.025)
  } else {
    relationship.respect = Math.min(1, relationship.respect + 0.018)
  }
}
