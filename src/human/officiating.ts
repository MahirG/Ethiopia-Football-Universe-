import * as THREE from 'three'
import type { FoulAssessment, PlayerProfile, PlayerRuntimeState } from './types'

export function assessTackle(
  tackler: PlayerRuntimeState,
  tacklerProfile: PlayerProfile,
  opponent: PlayerRuntimeState,
  ballPosition: THREE.Vector3,
  contactForce: number,
  lastDefender: boolean,
): FoulAssessment {
  const ballDistance = tackler.position.distanceTo(ballPosition)
  const opponentDistance = tackler.position.distanceTo(opponent.position)
  const facing = new THREE.Vector3(Math.cos(tackler.facing), 0, Math.sin(tackler.facing))
  const approach = opponent.position.clone().sub(tackler.position).setY(0).normalize()
  const fromBehind = facing.dot(approach) < -0.28
  const late = ballDistance > opponentDistance + 0.2
  const studsRisk = contactForce * (1 - tackler.physical.balance) + tackler.physical.fatigue * 0.2
  const discipline = tacklerProfile.personality.discipline
  const severity = THREE.MathUtils.clamp(contactForce * 0.48 + Number(fromBehind) * 0.2 + Number(late) * 0.22 + studsRisk * 0.22 - discipline * 0.12, 0, 1)
  const foul = late || severity > 0.48
  if (!foul) return { foul: false, severity, card: 'none', reason: 'fair-contact' }
  if (severity > 0.86 || (lastDefender && severity > 0.62)) return { foul: true, severity, card: 'red', reason: lastDefender ? 'denying-opportunity' : 'dangerous' }
  if (severity > 0.58) return { foul: true, severity, card: 'yellow', reason: 'reckless' }
  return { foul: true, severity, card: 'none', reason: 'late' }
}

export function refereeReaction(profile: PlayerProfile, runtime: PlayerRuntimeState, decisionAgainstPlayer: boolean) {
  const protest = profile.personality.aggression * 0.28 + runtime.emotion.frustration * 0.42 + runtime.emotion.pressure * 0.18
  const control = profile.personality.emotionalControl * 0.35 + profile.personality.discipline * 0.25
  return THREE.MathUtils.clamp((decisionAgainstPlayer ? protest : protest * 0.35) - control, 0, 1)
}
