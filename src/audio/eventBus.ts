import type { AudioEventContext, FootballAudioEvent } from './types'

type Listener = (context: AudioEventContext) => void

export class FootballAudioEventBus {
  private listeners = new Map<FootballAudioEvent | '*', Set<Listener>>()

  on(event: FootballAudioEvent | '*', listener: Listener) {
    const group = this.listeners.get(event) ?? new Set<Listener>()
    group.add(listener)
    this.listeners.set(event, group)
    return () => group.delete(listener)
  }

  emit(context: AudioEventContext) {
    this.listeners.get(context.event)?.forEach((listener) => listener(context))
    this.listeners.get('*')?.forEach((listener) => listener(context))
  }

  clear() {
    this.listeners.clear()
  }
}
