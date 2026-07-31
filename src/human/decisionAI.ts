import * as THREE from 'three'
import { HALF_LENGTH, HALF_WIDTH } from '../game/config'
import type { DecisionResult, MatchWorldState, Perception, PlayerProfile, PlayerRelationship, PlayerRuntimeState } from './types'
import { relationshipValue } from './relationships'

function distance2D(a: THREE.Vector3, b: THREE.Vector3) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

function attackDirection(team: 'home' | 'away') {
  return team === 'home' ? 1 : -1
}

function closestDistance(origin: THREE.Vector3, players: PlayerRuntimeState[]) {
  let nearest = Number.POSITIVE_INFINITY
  for (const player of players) nearest = Math.min(nearest, distance2D(origin, player.position))
  return Number.isFinite(nearest) ? nearest : 30
}

export function perceiveWorld(player: PlayerRuntimeState, world: MatchWorldState): Perception {
  const teammates = world.players.filter((item) => item.team === player.team && item.id !== player.id)
  const opponents = world.players.filter((item) => item.team !== player.team)
  const distanceToBall = distance2D(player.position, world.ballPosition)
  const nearestOpponentDistance = closestDistance(player.position, opponents)
  const nearestTeammateDistance = closestDistance(player.position, teammates)
  const direction = attackDirection(player.team)
  const goal = new THREE.Vector3(direction * HALF_LENGTH, 0, 0)
  const ballToGoal = goal.clone().sub(world.ballPosition).normalize()
  const playerToGoal = goal.clone().sub(player.position).normalize()
  const angleToBall = Math.atan2(world.ballPosition.z - player.position.z, world.ballPosition.x - player.position.x)
  const pressure = THREE.MathUtils.clamp(1 - nearestOpponentDistance / 6, 0, 1)
  const forwardProbe = player.position.clone().add(playerToGoal.multiplyScalar(7))
  const forwardSpace = THREE.MathUtils.clamp(closestDistance(forwardProbe, opponents) / 8, 0, 1)

  let laneThreat = 0
  for (const opponent of opponents) {
    const toOpponent = opponent.position.clone().sub(player.position)
    const projection = toOpponent.dot(ballToGoal)
    if (projection > 0 && projection < 18) {
      const lateral = toOpponent.clone().sub(ballToGoal.clone().multiplyScalar(projection)).length()
      laneThreat = Math.max(laneThreat, THREE.MathUtils.clamp(1 - lateral / 4, 0, 1))
    }
  }

  const ownGoalX = player.team === 'home' ? -HALF_LENGTH : HALF_LENGTH
  const defensiveDanger = THREE.MathUtils.clamp(1 - Math.abs(world.ballPosition.x - ownGoalX) / 30, 0, 1)
  const possessionTeam = distanceToBall < 1.45 ? player.team : world.players
    .filter((item) => item.id !== player.id)
    .sort((a, b) => distance2D(a.position, world.ballPosition) - distance2D(b.position, world.ballPosition))[0]?.team ?? null
  const offsideLine = player.team === 'home'
    ? Math.max(...opponents.map((item) => item.position.x), 0)
    : Math.min(...opponents.map((item) => item.position.x), 0)
  const offsideRisk = player.team === 'home'
    ? THREE.MathUtils.clamp((player.position.x - offsideLine + 1.2) / 4, 0, 1)
    : THREE.MathUtils.clamp((offsideLine - player.position.x + 1.2) / 4, 0, 1)
  const closing = world.ballVelocity.clone().normalize().dot(player.position.clone().sub(world.ballPosition).normalize())

  return {
    distanceToBall,
    angleToBall,
    nearestOpponentDistance,
    nearestTeammateDistance,
    pressure,
    forwardSpace,
    passingLaneQuality: 1 - laneThreat,
    shootingLaneQuality: THREE.MathUtils.clamp(1 - laneThreat * 0.8 - Math.abs(world.ballPosition.z) / HALF_WIDTH * 0.24, 0, 1),
    defensiveDanger,
    offsideRisk,
    ballApproaching: closing > 0.48 && world.ballVelocity.length() > 2,
    ballHeight: world.ballPosition.y,
    possessionTeam,
    teammates,
    opponents,
  }
}

function supportTarget(player: PlayerRuntimeState, world: MatchWorldState, profile: PlayerProfile) {
  const direction = attackDirection(player.team)
  const roleDepth = profile.role === 'striker' ? 12 : profile.role === 'winger' ? 7 : profile.role === 'midfielder' ? 1 : -8
  const lane = profile.role === 'winger' || profile.role === 'fullback' ? Math.sign(player.position.z || 1) * 15 : player.position.z * 0.6
  return new THREE.Vector3(
    THREE.MathUtils.clamp(world.ballPosition.x + direction * roleDepth, -HALF_LENGTH + 4, HALF_LENGTH - 4),
    0,
    THREE.MathUtils.clamp(lane, -HALF_WIDTH + 3, HALF_WIDTH - 3),
  )
}

function bestPassTarget(player: PlayerRuntimeState, perception: Perception, profile: PlayerProfile, relationships: Map<string, PlayerRelationship>) {
  const direction = attackDirection(player.team)
  let best: PlayerRuntimeState | undefined
  let score = -Infinity
  for (const teammate of perception.teammates) {
    const forward = (teammate.position.x - player.position.x) * direction
    const distance = distance2D(player.position, teammate.position)
    const separation = closestDistance(teammate.position, perception.opponents)
    const offsidePenalty = teammate.offsideRisk * 6
    const relationship = relationshipValue(relationships, player.id, teammate.id)
    const chemistry = relationship ? relationship.trust * 1.1 + relationship.chemistry * 0.9 - relationship.frustration * 0.7 : 0
    const value = forward * 0.55 + separation * 0.8 - distance * 0.16 - offsidePenalty + profile.personality.selflessness * 2 + chemistry
    if (value > score) { score = value; best = teammate }
  }
  return best
}

export function chooseDecision(
  player: PlayerRuntimeState,
  profile: PlayerProfile,
  world: MatchWorldState,
  anchor: THREE.Vector3,
  now: number,
  relationships: Map<string, PlayerRelationship>,
): DecisionResult {
  const perception = perceiveWorld(player, world)
  const direction = attackDirection(player.team)
  const goal = new THREE.Vector3(direction * HALF_LENGTH, 0, 0)
  const distanceToGoal = distance2D(player.position, goal)
  const hasControl = perception.distanceToBall < 1.35 && world.ballPosition.y < 1.15
  const decisionAge = now - player.actionStartedAt
  const fatiguePenalty = player.physical.fatigue * 0.32
  const composure = profile.personality.composure * (1 - player.emotion.pressure * 0.22)
  const risk = profile.personality.riskTolerance * (0.76 + player.emotion.confidence * 0.24)

  if (profile.role === 'goalkeeper') {
    const ownGoalX = player.team === 'home' ? -HALF_LENGTH + 1 : HALF_LENGTH - 1
    const towardGoal = player.team === 'home' ? world.ballVelocity.x < -1.2 : world.ballVelocity.x > 1.2
    const shotThreat = towardGoal && Math.abs(world.ballPosition.x - ownGoalX) < 24 && world.ballVelocity.length() > 4
    if (shotThreat) {
      const reactionDelay = THREE.MathUtils.lerp(0.34, 0.12, profile.ability.reactions * profile.ability.goalkeeper) + fatiguePenalty * 0.16
      if (decisionAge > reactionDelay) {
        return { action: 'goalkeeper-dive', target: new THREE.Vector3(ownGoalX, 0, THREE.MathUtils.clamp(world.ballPosition.z, -3.2, 3.2)), utility: 1 }
      }
    }
    if (perception.distanceToBall < 2.1 && world.ballPosition.y < 1.8) return { action: 'goalkeeper-claim', target: world.ballPosition.clone(), utility: 0.98 }
    return { action: 'goalkeeper-set', target: new THREE.Vector3(ownGoalX + direction * 1.2, 0, THREE.MathUtils.clamp(world.ballPosition.z * 0.28, -2.9, 2.9)), utility: 0.72 }
  }

  if (hasControl) {
    const shotUtility = THREE.MathUtils.clamp((34 - distanceToGoal) / 30, 0, 1) * profile.ability.shooting * perception.shootingLaneQuality * (0.62 + composure * 0.38)
    const teammate = bestPassTarget(player, perception, profile, relationships)
    const passUtility = (teammate ? 0.48 + perception.passingLaneQuality * 0.32 : 0.15) * profile.ability.passing * (0.78 + profile.personality.selflessness * 0.22)
    const dribbleUtility = profile.ability.dribbling * perception.forwardSpace * risk * (1 - perception.pressure * 0.46)
    const clearUtility = perception.defensiveDanger * (profile.role === 'centre-back' || profile.role === 'fullback' ? 0.95 : 0.55)

    if (clearUtility > Math.max(shotUtility, passUtility, dribbleUtility) && perception.pressure > 0.35) {
      return { action: 'clear', target: new THREE.Vector3(direction * HALF_LENGTH, 0, player.position.z * -0.4), utility: clearUtility }
    }
    if (shotUtility > 0.48 && shotUtility >= passUtility * 0.95) return { action: 'shoot', target: goal, utility: shotUtility }
    if (teammate && passUtility > dribbleUtility * 0.92) return { action: 'pass', target: teammate.position.clone().add(teammate.velocity.clone().multiplyScalar(0.45)), utility: passUtility, receiverId: teammate.id }
    return { action: 'dribble', target: player.position.clone().add(new THREE.Vector3(direction * 7, 0, THREE.MathUtils.clamp(-player.position.z * 0.12, -2, 2))), utility: dribbleUtility }
  }

  const nearestOpponentToBall = [...perception.opponents].sort((a, b) => distance2D(a.position, world.ballPosition) - distance2D(b.position, world.ballPosition))[0]
  const canPress = perception.distanceToBall < (profile.role === 'striker' ? 14 : 10) && profile.personality.workRate > 0.45
  const tackleUtility = nearestOpponentToBall && distance2D(player.position, nearestOpponentToBall.position) < 1.5
    ? profile.ability.tackling * player.emotion.aggression * (1 - profile.personality.discipline * 0.2)
    : 0
  if (tackleUtility > 0.54) return { action: 'tackle', target: nearestOpponentToBall?.position.clone() ?? world.ballPosition.clone(), utility: tackleUtility }
  if (canPress && perception.possessionTeam !== player.team) return { action: 'press', target: world.ballPosition.clone(), utility: 0.58 + profile.personality.workRate * 0.25 }
  if (perception.defensiveDanger > 0.58 && ['centre-back', 'fullback', 'midfielder'].includes(profile.role)) {
    const mark = nearestOpponentToBall?.position.clone() ?? anchor.clone()
    return { action: 'mark', target: mark, utility: 0.7 }
  }

  const support = supportTarget(player, world, profile)
  if (perception.offsideRisk > 0.55) support.x -= direction * 5
  return { action: perception.possessionTeam === player.team ? 'support' : 'recover', target: support.lerp(anchor, 0.18), utility: 0.48 }
}
