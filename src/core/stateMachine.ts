import type { MatchPhase, RestartDecision } from './types'

const TRANSITIONS: Record<MatchPhase, readonly MatchPhase[]> = {
  'pre-match': ['entrance', 'abandoned'], entrance: ['coin-toss', 'abandoned'], 'coin-toss': ['kickoff'], kickoff: ['active-play'],
  'active-play': ['ball-out', 'goal-scored', 'goal-review', 'var-review', 'injury-stoppage', 'substitution-stoppage', 'cooling-break', 'half-time', 'full-time', 'suspended', 'abandoned'],
  'ball-out': ['throw-in', 'goal-kick', 'corner-kick', 'direct-free-kick', 'indirect-free-kick', 'penalty-kick', 'dropped-ball'],
  'throw-in': ['active-play'], 'goal-kick': ['active-play'], 'corner-kick': ['active-play'], 'direct-free-kick': ['active-play'], 'indirect-free-kick': ['active-play'], 'penalty-kick': ['active-play', 'goal-scored'], 'dropped-ball': ['active-play'],
  'goal-scored': ['goal-review', 'kickoff'], 'goal-review': ['var-review', 'kickoff', 'active-play'], 'var-review': ['active-play', 'kickoff', 'direct-free-kick', 'indirect-free-kick', 'penalty-kick'],
  'injury-stoppage': ['substitution-stoppage', 'dropped-ball', 'direct-free-kick', 'active-play'], 'substitution-stoppage': ['active-play'], 'cooling-break': ['active-play'],
  'half-time': ['second-half-kickoff'], 'second-half-kickoff': ['active-play'], 'extra-time-break': ['extra-time'], 'extra-time': ['extra-time-break', 'penalty-shootout', 'full-time'], 'penalty-shootout': ['full-time'],
  suspended: ['active-play', 'abandoned'], abandoned: ['post-match'], 'full-time': ['trophy-ceremony', 'post-match'], 'trophy-ceremony': ['post-match'], 'post-match': [],
}

export class MatchStateMachine {
  phase: MatchPhase = 'pre-match'
  restart: RestartDecision | null = null
  private transitionSerial = 0

  transition(next: MatchPhase, restart: RestartDecision | null = null) {
    if (next === this.phase) return false
    if (!TRANSITIONS[this.phase].includes(next)) return false
    this.phase = next
    this.restart = restart
    this.transitionSerial += 1
    return true
  }

  forceLive() {
    if (this.phase === 'pre-match') this.phase = 'active-play'
  }

  get serial() { return this.transitionSerial }
}
