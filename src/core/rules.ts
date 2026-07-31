import type { BallSnapshot, CardKind, CorePlayerSnapshot, RestartDecision, ReviewKind, RuleDecision, TeamSide, Vec3Like } from './types'

const HALF_LENGTH = 52.5
const HALF_WIDTH = 34
const GOAL_HALF_WIDTH = 3.66
const GOAL_HEIGHT = 2.44

function opposite(team: TeamSide): TeamSide { return team === 'home' ? 'away' : 'home' }
function restart(type: RestartDecision['type'], team: TeamSide | null, location: Vec3Like, reason: string): RestartDecision { return { type, team, location, reason } }

export function evaluateBoundary(ball: BallSnapshot): RuleDecision {
  const entireBallPastTouchline = Math.abs(ball.position.z) - ball.radius > HALF_WIDTH
  const entireBallPastGoalLine = Math.abs(ball.position.x) - ball.radius > HALF_LENGTH
  const insideGoalMouth = Math.abs(ball.position.z) + ball.radius < GOAL_HALF_WIDTH && ball.position.y + ball.radius < GOAL_HEIGHT
  const scoringTeam: TeamSide = ball.position.x > 0 ? 'home' : 'away'

  if (entireBallPastGoalLine && insideGoalMouth) {
    return { goal: scoringTeam, outOfPlay: true, restart: restart('kickoff', opposite(scoringTeam), { x: 0, y: 0.11, z: 0 }, 'goal'), offsidePlayerId: null, foul: false, card: 'none', advantage: false, review: 'goal', reason: 'entire-ball-crossed-goal-line' }
  }
  if (entireBallPastTouchline) {
    const team = ball.lastTouchTeam ? opposite(ball.lastTouchTeam) : null
    return { goal: null, outOfPlay: true, restart: restart('throw-in', team, { x: Math.max(-HALF_LENGTH, Math.min(HALF_LENGTH, ball.position.x)), y: 0.11, z: Math.sign(ball.position.z) * HALF_WIDTH }, 'touchline'), offsidePlayerId: null, foul: false, card: 'none', advantage: false, review: null, reason: 'entire-ball-crossed-touchline' }
  }
  if (entireBallPastGoalLine) {
    const defending: TeamSide = ball.position.x > 0 ? 'away' : 'home'
    const attacking = opposite(defending)
    const last = ball.lastTouchTeam
    const isCorner = last === defending
    const location = isCorner
      ? { x: Math.sign(ball.position.x) * HALF_LENGTH, y: 0.11, z: Math.sign(ball.position.z || 1) * HALF_WIDTH }
      : { x: Math.sign(ball.position.x) * (HALF_LENGTH - 5.5), y: 0.11, z: 0 }
    return { goal: null, outOfPlay: true, restart: restart(isCorner ? 'corner' : 'goal-kick', isCorner ? attacking : defending, location, 'goal-line'), offsidePlayerId: null, foul: false, card: 'none', advantage: false, review: null, reason: isCorner ? 'corner-kick' : 'goal-kick' }
  }
  return { goal: null, outOfPlay: false, restart: null, offsidePlayerId: null, foul: false, card: 'none', advantage: false, review: null, reason: 'in-play' }
}

export function calculateOffsideLines(players: CorePlayerSnapshot[], ballX: number) {
  const homeDefenders = players.filter((p) => p.team === 'home').map((p) => p.position.x).sort((a, b) => b - a)
  const awayDefenders = players.filter((p) => p.team === 'away').map((p) => p.position.x).sort((a, b) => a - b)
  return {
    home: Math.max(ballX, homeDefenders[1] ?? HALF_LENGTH),
    away: Math.min(ballX, awayDefenders[1] ?? -HALF_LENGTH),
  }
}

export function evaluateOffside(receiver: CorePlayerSnapshot, passMomentX: number, lines: ReturnType<typeof calculateOffsideLines>, activeInPlay: boolean) {
  if (!activeInPlay || receiver.role === 'goalkeeper') return false
  if (receiver.team === 'home') return receiver.position.x > 0 && receiver.position.x > Math.max(passMomentX, lines.away) + 0.02
  return receiver.position.x < 0 && receiver.position.x < Math.min(passMomentX, lines.home) - 0.02
}

export interface FoulEvidence {
  ballContactFirst: boolean
  bodyForce: number
  relativeSpeed: number
  fromBehind: boolean
  studsExposed: boolean
  highContact: boolean
  denyingGoalOpportunity: boolean
  promisingAttack: boolean
  repeatedFoul: boolean
  shirtPull: boolean
  handball: boolean
  deliberate: boolean
}

export function evaluateFoul(evidence: FoulEvidence, discipline: number): { foul: boolean; card: CardKind; severity: number; review: ReviewKind | null } {
  const severity = Math.max(0, Math.min(1,
    evidence.bodyForce * 0.25 + evidence.relativeSpeed / 18 * 0.2 + Number(evidence.fromBehind) * 0.14 +
    Number(evidence.studsExposed) * 0.28 + Number(evidence.highContact) * 0.2 + Number(evidence.shirtPull) * 0.16 +
    Number(evidence.handball && evidence.deliberate) * 0.18 - Number(evidence.ballContactFirst) * 0.14 - discipline * 0.08,
  ))
  const foul = evidence.shirtPull || (evidence.handball && evidence.deliberate) || severity > 0.36
  if (!foul) return { foul: false, card: 'none', severity, review: null }
  if (evidence.studsExposed && (evidence.highContact || severity > 0.82)) return { foul: true, card: 'red', severity, review: 'red-card' }
  if (evidence.denyingGoalOpportunity && severity > 0.42) return { foul: true, card: 'red', severity, review: 'red-card' }
  if (severity > 0.58 || evidence.promisingAttack || evidence.repeatedFoul) return { foul: true, card: 'yellow', severity, review: null }
  return { foul: true, card: 'none', severity, review: null }
}

export function shouldApplyAdvantage(possessionConfidence: number, fieldProgress: number, attackersAhead: number, immediateChance: number) {
  return possessionConfidence > 0.58 && fieldProgress > 0.38 && (attackersAhead >= 2 || immediateChance > 0.58)
}
