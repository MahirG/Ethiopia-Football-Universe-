import type { AudioEventContext } from './types'

export interface NetworkAudioPacket {
  id: string
  serverTime: number
  event: AudioEventContext
}

export class NetworkAudioSynchronizer {
  private seen = new Map<string, number>()
  serialize(event: AudioEventContext, serverTime: number): NetworkAudioPacket {
    return { id: `${event.event}:${serverTime}:${event.team ?? 'neutral'}`, serverTime, event }
  }
  receive(packet: NetworkAudioPacket, emit: (event: AudioEventContext) => void) {
    const now = performance.now()
    for (const [id, time] of this.seen) if (now - time > 15000) this.seen.delete(id)
    if (this.seen.has(packet.id)) return false
    this.seen.set(packet.id, now)
    emit(packet.event)
    return true
  }
}
