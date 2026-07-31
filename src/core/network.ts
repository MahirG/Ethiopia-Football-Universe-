import type { BallSnapshot, CorePlayerSnapshot } from './types'

export interface TimedInput {
  clientId: string
  sequence: number
  timestamp: number
  device: string
  action: string
  magnitude: number
}

export class NetworkMatchAuthority {
  private sequence = 0
  private corrections = 0
  private rejectedInputs = 0
  private readonly lastInputSequence = new Map<string, number>()
  private readonly timingSamples = new Map<string, number[]>()

  validateInput(input: TimedInput, serverTime: number) {
    const previous = this.lastInputSequence.get(input.clientId) ?? -1
    const age = serverTime - input.timestamp
    const valid = input.sequence > previous && age > -0.1 && age < 0.75 && input.magnitude >= 0 && input.magnitude <= 1.001
    if (!valid) { this.rejectedInputs += 1; return false }
    this.lastInputSequence.set(input.clientId, input.sequence)
    const samples = this.timingSamples.get(input.clientId) ?? []
    samples.push(input.timestamp)
    if (samples.length > 120) samples.shift()
    this.timingSamples.set(input.clientId, samples)
    return true
  }

  validateState(ball: BallSnapshot, players: CorePlayerSnapshot[]) {
    const ballSpeed = Math.hypot(ball.velocity.x, ball.velocity.y, ball.velocity.z)
    const impossibleBall = ballSpeed > 55 || Math.abs(ball.position.x) > 80 || Math.abs(ball.position.z) > 60
    const impossiblePlayer = players.some((player) => Math.hypot(player.velocity.x, player.velocity.y, player.velocity.z) > 13.5 || Math.abs(player.position.x) > 62 || Math.abs(player.position.z) > 44)
    if (impossibleBall || impossiblePlayer) this.corrections += 1
    this.sequence += 1
    return { valid: !impossibleBall && !impossiblePlayer, sequence: this.sequence }
  }

  detectAutomation(clientId: string) {
    const samples = this.timingSamples.get(clientId) ?? []
    if (samples.length < 20) return false
    const intervals = samples.slice(1).map((time, index) => time - samples[index])
    const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length
    const variance = intervals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / intervals.length
    return variance < 0.000002 && mean > 0
  }

  getTelemetry() { return { corrections: this.corrections, rejectedInputs: this.rejectedInputs, sequence: this.sequence } }
}
