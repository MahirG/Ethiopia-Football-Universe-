import type { BallSnapshot, CorePlayerSnapshot, PossessionEvaluation, SurfaceSnapshot, Vec3Like } from './types'

function length(value: Vec3Like) { return Math.hypot(value.x, value.y, value.z) }
function planarDistance(a: Vec3Like, b: Vec3Like) { return Math.hypot(a.x - b.x, a.z - b.z) }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)) }

export function calculateEnvironmentalAcceleration(ball: BallSnapshot, surface: SurfaceSnapshot) {
  const speed = length(ball.velocity)
  const spin = length(ball.angularVelocity)
  const altitudeDensity = clamp(1 - surface.altitudeMeters / 38000, 0.78, 1)
  const drag = 0.012 * altitudeDensity * speed
  const magnusScale = 0.0008 * altitudeDensity * spin
  const rolling = ball.position.y <= ball.radius * 1.65 ? surface.rollingResistance * (1 + surface.wetness * 0.18) : 0
  return {
    x: surface.wind.x * 0.025 - ball.velocity.x * drag - ball.velocity.x * rolling + ball.angularVelocity.y * ball.velocity.z * magnusScale,
    y: surface.wind.y * 0.012 - ball.velocity.y * drag + (surface.temperatureC - 18) * 0.0007,
    z: surface.wind.z * 0.025 - ball.velocity.z * drag - ball.velocity.z * rolling - ball.angularVelocity.y * ball.velocity.x * magnusScale,
  }
}

export function evaluatePossession(ball: BallSnapshot, players: CorePlayerSnapshot[], surface: SurfaceSnapshot): PossessionEvaluation {
  const candidates = players.map((player) => {
    const distance = planarDistance(player.position, ball.position)
    const ballSpeed = length(ball.velocity)
    const reach = player.role === 'goalkeeper' ? 1.55 : 1.05
    const orientation = Math.cos(Math.atan2(ball.position.z - player.position.z, ball.position.x - player.position.x) - player.facing)
    const confidence = clamp(
      (1 - distance / (reach + 1.4)) * 0.45 +
      (1 - clamp(ballSpeed / 18, 0, 1)) * 0.18 +
      (orientation * 0.5 + 0.5) * 0.12 +
      player.balance * 0.1 + player.awareness * 0.1 + surface.grip * 0.05 - player.fatigue * 0.08,
      0,
      1,
    )
    return { player, distance, confidence }
  }).filter((candidate) => candidate.distance < 3.1).sort((a, b) => b.confidence - a.confidence)

  if (Math.abs(ball.position.x) > 52.61 || Math.abs(ball.position.z) > 34.11) return { state: 'out', team: null, playerId: null, confidence: 1, contestingPlayerIds: [] }
  if (ball.position.y > 1.35) return { state: 'aerial', team: candidates[0]?.player.team ?? null, playerId: null, confidence: candidates[0]?.confidence ?? 0, contestingPlayerIds: candidates.slice(0, 3).map((item) => item.player.id) }
  if (!candidates.length) return { state: length(ball.velocity) > 1 ? 'free' : 'loose', team: null, playerId: null, confidence: 0, contestingPlayerIds: [] }

  const first = candidates[0]
  const second = candidates[1]
  if (second && second.player.team !== first.player.team && Math.abs(first.confidence - second.confidence) < 0.14) {
    return { state: 'contested', team: null, playerId: null, confidence: Math.max(first.confidence, second.confidence), contestingPlayerIds: [first.player.id, second.player.id] }
  }
  const state = first.player.role === 'goalkeeper' && first.confidence > 0.66 ? 'goalkeeper' : first.player.onBall && first.confidence > 0.62 ? 'controlled' : first.confidence > 0.48 ? 'first-touch' : 'loose'
  return { state, team: first.player.team, playerId: first.player.id, confidence: first.confidence, contestingPlayerIds: candidates.slice(0, 3).map((item) => item.player.id) }
}

export function contactQuality(player: CorePlayerSnapshot, ball: BallSnapshot, pressure: number, surface: SurfaceSnapshot, preferredFoot = true) {
  const incoming = clamp(length(ball.velocity) / 25, 0, 1)
  return clamp(
    player.awareness * 0.24 + player.balance * 0.24 + (1 - player.fatigue) * 0.16 + surface.grip * 0.12 +
    (preferredFoot ? 0.16 : 0.08) - incoming * 0.18 - pressure * 0.2 - surface.unevenness * 0.1,
    0.08,
    0.98,
  )
}
