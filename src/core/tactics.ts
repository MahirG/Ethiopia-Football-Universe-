import type { CorePlayerSnapshot, PossessionEvaluation, TeamSide, TeamTacticalState } from './types'

function clamp(value: number, min = 0, max = 1) { return Math.max(min, Math.min(max, value)) }
function teamScore(team: TeamSide, home: number, away: number) { return team === 'home' ? home : away }

export function deriveTacticalState(team: TeamSide, players: CorePlayerSnapshot[], possession: PossessionEvaluation, scoreHome: number, scoreAway: number, matchMinute: number): TeamTacticalState {
  const ours = players.filter((player) => player.team === team)
  const averageFatigue = ours.reduce((sum, player) => sum + player.fatigue, 0) / Math.max(1, ours.length)
  const leading = teamScore(team, scoreHome, scoreAway) > teamScore(team === 'home' ? 'away' : 'home', scoreHome, scoreAway)
  const trailing = teamScore(team, scoreHome, scoreAway) < teamScore(team === 'home' ? 'away' : 'home', scoreHome, scoreAway)
  const late = clamp((matchMinute - 65) / 25)
  const ownsBall = possession.team === team
  const transition = possession.state === 'loose' || possession.state === 'contested'
  const phase = transition ? (ownsBall ? 'positive-transition' : 'negative-transition') : ownsBall ? 'attack' : 'defend'
  const urgency = clamp((trailing ? 0.45 : leading ? -0.18 : 0) + late * (trailing ? 0.5 : 0.12) + 0.38)
  const pressIntensity = clamp(0.58 + urgency * 0.35 - averageFatigue * 0.5)
  const pressing = late && trailing ? 'emergency' : pressIntensity > 0.72 ? 'high' : pressIntensity < 0.42 ? 'low-block' : 'mid-block'
  return {
    team,
    phase,
    width: ownsBall ? clamp(0.68 + urgency * 0.12) : clamp(0.52 - Number(leading) * 0.06),
    depth: ownsBall ? clamp(0.62 + urgency * 0.2) : clamp(0.48 - Number(leading) * 0.08),
    compactness: ownsBall ? 0.54 : clamp(0.72 + Number(leading) * 0.08 - averageFatigue * 0.08),
    lineHeight: clamp(0.5 + urgency * 0.28 - Number(leading) * late * 0.2),
    pressing,
    pressIntensity,
    transitionUrgency: urgency,
    restDefense: clamp(0.62 - urgency * 0.18 + Number(leading) * 0.15),
    overloadSide: possession.playerId ? (players.find((p) => p.id === possession.playerId)?.position.z ?? 0) > 4 ? 1 : (players.find((p) => p.id === possession.playerId)?.position.z ?? 0) < -4 ? -1 : 0 : 0,
  }
}

export function pressingTrigger(receiver: CorePlayerSnapshot | undefined, passSpeed: number, nearSideline: boolean, backwardPass: boolean) {
  if (!receiver) return 0
  return clamp(
    Number(receiver.balance < 0.72) * 0.24 + Number(receiver.facing * (receiver.team === 'home' ? 1 : -1) < -0.2) * 0.2 +
    Number(nearSideline) * 0.18 + Number(backwardPass) * 0.16 + Number(passSpeed < 5.2) * 0.14 + receiver.fatigue * 0.12,
  )
}
