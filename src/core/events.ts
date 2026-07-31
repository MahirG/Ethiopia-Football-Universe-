import type { MatchEvent } from './types'

export class DeterministicEventStream {
  private sequence = 0
  private readonly consumed = new Set<string>()
  private readonly events: MatchEvent[] = []

  emit<T extends Record<string, unknown>>(type: string, matchMinute: number, simulationTime: number, data: T, team?: MatchEvent['team'], playerId?: string) {
    const sequence = ++this.sequence
    const id = `${type}:${sequence}:${Math.round(simulationTime * 1000)}`
    const event: MatchEvent<T> = { id, sequence, type, matchMinute, simulationTime, team, playerId, data }
    this.events.push(event)
    if (this.events.length > 2048) this.events.splice(0, this.events.length - 2048)
    return event
  }

  consumeOnce(id: string) {
    if (this.consumed.has(id)) return false
    this.consumed.add(id)
    if (this.consumed.size > 4096) this.consumed.clear()
    return true
  }

  latest(limit = 64) { return this.events.slice(-limit) }
  getSequence() { return this.sequence }
}
