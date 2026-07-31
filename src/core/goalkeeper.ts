import type { BallSnapshot, CorePlayerSnapshot, Vec3Like } from './types'

export type GoalkeeperDecision = 'set' | 'adjust' | 'hold' | 'advance' | 'narrow' | 'smother' | 'spread' | 'dive' | 'claim' | 'punch' | 'sweep' | 'recover'

export interface GoalkeeperRead {
  decision: GoalkeeperDecision
  target: Vec3Like
  reactionDelayMs: number
  catchProbability: number
  parryDirection: Vec3Like
}

function clamp(value: number, min = 0, max = 1) { return Math.max(min, Math.min(max, value)) }

export function readGoalkeeperAction(keeper: CorePlayerSnapshot, ball: BallSnapshot, visibility: number, pressure: number, wetness: number): GoalkeeperRead {
  const relative = { x: ball.position.x - keeper.position.x, y: ball.position.y - keeper.position.y, z: ball.position.z - keeper.position.z }
  const distance = Math.hypot(relative.x, relative.y, relative.z)
  const speed = Math.hypot(ball.velocity.x, ball.velocity.y, ball.velocity.z)
  const towardGoal = Math.sign(ball.velocity.x) !== Math.sign(keeper.position.x) && Math.abs(ball.velocity.x) > 1.5
  const cross = ball.position.y > 1.2 && Math.abs(ball.position.z) > 7 && Math.abs(ball.velocity.z) > 1
  const oneOnOne = distance < 10 && ball.position.y < 1 && speed < 14
  const reactionDelayMs = Math.round(360 - keeper.reaction * 220 + keeper.fatigue * 90 + (1 - visibility) * 120)
  let decision: GoalkeeperDecision = 'set'
  if (cross && distance < 12) decision = wetness > 0.62 ? 'punch' : 'claim'
  else if (oneOnOne && distance < 5) decision = 'spread'
  else if (oneOnOne) decision = 'narrow'
  else if (towardGoal && speed > 7) decision = 'dive'
  else if (distance > 18 && Math.abs(keeper.position.x) - Math.abs(ball.position.x) > 7) decision = 'sweep'
  else if (Math.abs(relative.z) > 1.2) decision = 'adjust'
  const catchProbability = clamp(keeper.awareness * 0.28 + keeper.balance * 0.18 + keeper.reaction * 0.28 + visibility * 0.16 - speed / 38 - wetness * 0.18 - pressure * 0.08)
  const parryLength = Math.hypot(relative.z, relative.y) || 1
  return {
    decision,
    target: { x: ball.position.x, y: Math.max(0.45, ball.position.y), z: ball.position.z },
    reactionDelayMs,
    catchProbability,
    parryDirection: { x: -Math.sign(keeper.position.x) * 0.28, y: Math.max(0.2, relative.y / parryLength), z: relative.z / parryLength },
  }
}

export function chooseDistribution(keeper: CorePlayerSnapshot, teammates: CorePlayerSnapshot[], opponentPressure: number, scoreDifference: number, matchMinute: number) {
  const lateLead = scoreDifference > 0 && matchMinute > 78
  const safe = teammates.filter((player) => player.team === keeper.team && player.role !== 'goalkeeper').sort((a, b) => b.awareness - a.awareness - (a.fatigue - b.fatigue) * 0.2)
  if (lateLead || opponentPressure > 0.72) return { type: 'long-kick' as const, targetId: safe.at(-1)?.id ?? null, delay: lateLead ? 5.4 : 1.2 }
  if (opponentPressure < 0.35) return { type: 'roll' as const, targetId: safe[0]?.id ?? null, delay: 0.45 }
  return { type: 'throw' as const, targetId: safe[0]?.id ?? null, delay: 0.8 }
}
