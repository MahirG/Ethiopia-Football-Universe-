import * as THREE from 'three'
import { GOAL_HEIGHT, GOAL_WIDTH, HALF_LENGTH, HALF_WIDTH } from '../game/config'
import type { TeamSide } from '../game/types'
import type { PlayerRuntimeState } from '../human/types'
import type { OffsideCandidate, Phase5FoulContact, RefereeProfile, RestartState, RestartType, SetPieceRoutine, VarOutcome, VarReviewState } from './types'

export interface BoundaryDecision {
  kind: 'in-play' | 'goal' | 'restart'
  goalTeam?: TeamSide
  restart?: Omit<RestartState, 'id' | 'countdown' | 'awardedAtMinute' | 'routineId'>
}

export function attackDirection(team: TeamSide) {
  return team === 'home' ? 1 : -1
}

export function oppositeTeam(team: TeamSide): TeamSide {
  return team === 'home' ? 'away' : 'home'
}

export function defendingTeamAtGoalLine(goalLineX: number): TeamSide {
  return goalLineX > 0 ? 'away' : 'home'
}

export function isInsidePitch(position: THREE.Vector3, margin = 0) {
  return Math.abs(position.x) <= HALF_LENGTH + margin && Math.abs(position.z) <= HALF_WIDTH + margin && position.y >= -1.5
}

export function isGoal(position: THREE.Vector3) {
  return Math.abs(position.x) > HALF_LENGTH + 0.28
    && Math.abs(position.z) < GOAL_WIDTH / 2
    && position.y < GOAL_HEIGHT
}

export function isInsidePenaltyArea(position: [number, number, number] | THREE.Vector3, defendingTeam: TeamSide) {
  const x = Array.isArray(position) ? position[0] : position.x
  const z = Array.isArray(position) ? position[2] : position.z
  const goalX = defendingTeam === 'home' ? -HALF_LENGTH : HALF_LENGTH
  return Math.abs(x - goalX) <= 16.5 && Math.abs(z) <= 20.16
}

export function classifyBoundaryExit(
  position: THREE.Vector3,
  lastTouchTeam: TeamSide | null,
  lastInBoundsPosition: THREE.Vector3,
): BoundaryDecision {
  if (isGoal(position)) return { kind: 'goal', goalTeam: position.x > 0 ? 'home' : 'away' }
  if (Math.abs(position.z) > HALF_WIDTH + 0.2 && Math.abs(position.x) <= HALF_LENGTH + 0.8) {
    const team = lastTouchTeam ? oppositeTeam(lastTouchTeam) : position.x >= 0 ? 'home' : 'away'
    return {
      kind: 'restart',
      restart: {
        type: 'throw-in',
        team,
        direct: false,
        reason: 'ball crossed the touchline',
        position: [THREE.MathUtils.clamp(lastInBoundsPosition.x, -HALF_LENGTH + 1, HALF_LENGTH - 1), 0.22, Math.sign(position.z) * HALF_WIDTH],
      },
    }
  }
  if (Math.abs(position.x) > HALF_LENGTH + 0.22) {
    const goalLine = Math.sign(position.x) * HALF_LENGTH
    const defendingTeam = defendingTeamAtGoalLine(goalLine)
    const attackingTeam = oppositeTeam(defendingTeam)
    const touchedByDefender = lastTouchTeam === defendingTeam
    if (touchedByDefender) {
      return {
        kind: 'restart',
        restart: {
          type: 'corner',
          team: attackingTeam,
          direct: true,
          reason: 'defender played the ball over the goal line',
          position: [goalLine, 0.22, Math.sign(lastInBoundsPosition.z || position.z || 1) * HALF_WIDTH],
        },
      }
    }
    return {
      kind: 'restart',
      restart: {
        type: 'goal-kick',
        team: defendingTeam,
        direct: true,
        reason: 'attacker played the ball over the goal line',
        position: [goalLine - Math.sign(goalLine) * 5.5, 0.22, THREE.MathUtils.clamp(lastInBoundsPosition.z * 0.18, -4, 4)],
      },
    }
  }
  return { kind: 'in-play' }
}

export function defensiveOffsideLine(team: TeamSide, players: PlayerRuntimeState[]) {
  const defenders = players.filter((player) => player.team !== team && player.role !== 'goalkeeper')
  if (!defenders.length) return team === 'home' ? HALF_LENGTH : -HALF_LENGTH
  const sorted = defenders.map((player) => player.position.x).sort((a, b) => a - b)
  if (team === 'home') return sorted[Math.max(0, sorted.length - 2)]
  return sorted[Math.min(sorted.length - 1, 1)]
}

export function evaluateOffsideCandidate(
  passerId: string,
  receiverId: string,
  team: TeamSide,
  players: PlayerRuntimeState[],
  ballX: number,
  now: number,
): OffsideCandidate | null {
  const receiver = players.find((player) => player.id === receiverId)
  if (!receiver || receiver.team !== team) return null
  const lineX = defensiveOffsideLine(team, players)
  const direction = attackDirection(team)
  const inOpponentHalf = receiver.position.x * direction > 0
  const beyondBall = (receiver.position.x - ballX) * direction > 0.35
  const beyondLine = (receiver.position.x - lineX) * direction > 0.22
  if (!inOpponentHalf || !beyondBall || !beyondLine) return null
  const threshold = Math.max(ballX * direction, lineX * direction)
  const gap = Math.max(0, receiver.position.x * direction - threshold)
  return {
    passerId,
    receiverId,
    team,
    positionAtPass: [receiver.position.x, receiver.position.y, receiver.position.z],
    ballXAtPass: ballX,
    lineX,
    createdAt: now,
    confidence: THREE.MathUtils.clamp(0.62 + gap / 5, 0.62, 0.98),
  }
}

export function shouldApplyAdvantage(
  foul: Phase5FoulContact,
  fouledTeam: TeamSide,
  possession: TeamSide | null,
  ballPosition: THREE.Vector3,
  ballVelocity: THREE.Vector3,
  referee: RefereeProfile,
) {
  if (foul.assessment.card === 'red' && foul.assessment.severity > 0.9) return false
  if (possession !== fouledTeam) return false
  const direction = attackDirection(fouledTeam)
  const attackingProgress = ballVelocity.x * direction > 1.2 || ballPosition.x * direction > 20
  const penaltyAreaIncident = isInsidePenaltyArea(foul.position, foul.team)
  const value = Number(attackingProgress) * 0.38 + referee.advantageBias * 0.44 + (1 - foul.assessment.severity) * 0.18
  return !penaltyAreaIncident && value > 0.52
}

export function resolveCard(
  foul: Phase5FoulContact,
  referee: RefereeProfile,
): 'none' | 'yellow' | 'red' {
  if (foul.assessment.card === 'red') return 'red'
  const adjustedSeverity = foul.assessment.severity + referee.strictness * 0.18 + Number(foul.lastDefender) * 0.12
  if (adjustedSeverity >= 0.9 || foul.assessment.reason === 'dangerous') return 'red'
  if (foul.assessment.card === 'yellow' || adjustedSeverity >= referee.cardThreshold) return 'yellow'
  return 'none'
}

export function chooseFoulRestart(
  foul: Phase5FoulContact,
  fouledTeam: TeamSide,
  matchMinute: number,
  routine: SetPieceRoutine,
): RestartState {
  const penalty = isInsidePenaltyArea(foul.position, foul.team)
  const type: RestartType = penalty ? 'penalty' : 'direct-free-kick'
  return {
    id: `restart-${Math.round(foul.timestamp * 1000)}-${foul.playerId}`,
    type,
    team: fouledTeam,
    position: penalty
      ? [foul.team === 'home' ? -HALF_LENGTH + 11 : HALF_LENGTH - 11, 0.22, 0]
      : [THREE.MathUtils.clamp(foul.position[0], -HALF_LENGTH + 3, HALF_LENGTH - 3), 0.22, THREE.MathUtils.clamp(foul.position[2], -HALF_WIDTH + 2, HALF_WIDTH - 2)],
    direct: true,
    reason: penalty ? 'foul inside the penalty area' : foul.assessment.reason.replace('-', ' '),
    routineId: penalty ? 'penalty-placed' : routine.id,
    countdown: penalty ? 2.4 : 1.65,
    awardedAtMinute: matchMinute,
  }
}

export function resolveVarOutcome(review: VarReviewState, referee: RefereeProfile): VarOutcome {
  const intervention = review.evidence - referee.varInterventionThreshold
  if (review.provisionalDecision === 'goal-confirmed') return intervention > 0.16 ? 'overturned' : 'confirmed'
  if (review.provisionalDecision === 'penalty') return intervention < -0.12 ? 'overturned' : intervention > 0.22 ? 'changed' : 'confirmed'
  if (review.provisionalDecision === 'red-card') return intervention < -0.18 ? 'overturned' : 'confirmed'
  return intervention > 0.08 ? 'changed' : 'confirmed'
}

export function restartLabel(type: RestartType) {
  const labels: Record<RestartType, string> = {
    kickoff: 'Kick-off',
    'throw-in': 'Throw-in',
    corner: 'Corner kick',
    'goal-kick': 'Goal kick',
    'direct-free-kick': 'Direct free kick',
    'indirect-free-kick': 'Indirect free kick',
    penalty: 'Penalty kick',
    'drop-ball': 'Dropped ball',
  }
  return labels[type]
}
