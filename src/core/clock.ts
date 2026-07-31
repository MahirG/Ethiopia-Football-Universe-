import type { ClockState } from './types'

export class AuthoritativeMatchClock {
  readonly state: ClockState = {
    phase: 'first-half', elapsedMinutes: 0, displayedMinute: 0,
    addedTimeMinimum: 0, stoppageSeconds: 0, running: false,
  }

  constructor(private readonly regulationMinutes = 90, private readonly extraTimeMinutes = 30) {}

  syncExternalMinute(minute: number, running: boolean) {
    this.state.elapsedMinutes = Math.max(this.state.elapsedMinutes, minute)
    this.state.displayedMinute = Math.floor(minute)
    this.state.running = running
    if (minute >= this.regulationMinutes && this.state.phase !== 'finished') this.state.phase = 'finished'
    else if (minute >= this.regulationMinutes / 2 && this.state.phase === 'first-half') this.state.phase = 'second-half'
  }

  registerStoppage(seconds: number, reason: 'injury' | 'substitution' | 'var' | 'goal' | 'discipline' | 'time-wasting' | 'equipment' | 'crowd' | 'goalkeeper' | 'other') {
    const weight = reason === 'var' || reason === 'injury' ? 1 : reason === 'goal' ? 0.72 : 0.85
    this.state.stoppageSeconds += Math.max(0, seconds) * weight
    this.state.addedTimeMinimum = Math.floor(this.state.stoppageSeconds / 60)
  }

  canEnd(danger: number) {
    return this.state.elapsedMinutes >= this.regulationMinutes + this.state.addedTimeMinimum && danger < 0.7
  }

  get extraTimeAvailable() { return this.extraTimeMinutes > 0 }
}
