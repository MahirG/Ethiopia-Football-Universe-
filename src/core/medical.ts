import type { CorePlayerSnapshot, TeamSide } from './types'

export type CoreInjury = 'none' | 'impact' | 'cramp' | 'muscle-strain' | 'ankle-sprain' | 'knee' | 'shoulder' | 'head' | 'cut'

export interface InjuryAssessment {
  injury: CoreInjury
  severity: number
  stopPlay: boolean
  concussionProtocol: boolean
  substitutionRecommended: boolean
}

export function assessInjury(player: CorePlayerSnapshot, contactForce: number, jointAngleRisk: number, landingRisk: number, surfaceGrip: number, seed: number): InjuryAssessment {
  const random = Math.abs(Math.sin(seed * 91.117 + player.index * 7.31)) % 1
  const exposure = contactForce * 0.34 + jointAngleRisk * 0.24 + landingRisk * 0.2 + player.fatigue * 0.18 + (1 - surfaceGrip) * 0.12
  if (exposure < 0.48 || random > Math.min(0.72, exposure - 0.24)) return { injury: 'none', severity: 0, stopPlay: false, concussionProtocol: false, substitutionRecommended: false }
  const severity = Math.max(0.08, Math.min(1, exposure * 0.75 + random * 0.18))
  const injury: CoreInjury = landingRisk > 0.8 ? 'knee' : jointAngleRisk > 0.75 ? 'ankle-sprain' : contactForce > 0.84 && random > 0.62 ? 'head' : player.fatigue > 0.82 ? 'muscle-strain' : contactForce > 0.72 ? 'impact' : 'cramp'
  const concussionProtocol = injury === 'head'
  return { injury, severity, stopPlay: concussionProtocol || severity > 0.72, concussionProtocol, substitutionRecommended: concussionProtocol || severity > 0.58 }
}

export interface SubstitutionState {
  used: Record<TeamSide, number>
  windowsUsed: Record<TeamSide, number>
  maximum: number
  windows: number
  extraTimeAllowance: number
  concussionAllowance: number
}

export function canSubstitute(state: SubstitutionState, team: TeamSide, concussion = false, extraTime = false) {
  const allowance = state.maximum + (extraTime ? state.extraTimeAllowance : 0) + (concussion ? state.concussionAllowance : 0)
  return state.used[team] < allowance && (concussion || state.windowsUsed[team] < state.windows)
}
