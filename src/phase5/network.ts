import type { CompetitiveMatchState, Phase5NetworkSnapshot } from './types'

export function createCompetitiveSnapshot(state: CompetitiveMatchState, tick: number): Phase5NetworkSnapshot {
  return {
    sequence: state.sequence,
    tick,
    playState: state.playState,
    possession: state.possession,
    restart: state.restart ? { ...state.restart, position: [...state.restart.position] as [number, number, number] } : null,
    advantage: state.advantage ? { ...state.advantage, position: [...state.advantage.position] as [number, number, number] } : null,
    varReview: state.varReview ? { ...state.varReview, incidentPosition: [...state.varReview.incidentPosition] as [number, number, number] } : null,
    cards: state.cards.map((card) => ({ ...card })),
    fouls: { ...state.fouls },
    offsides: { ...state.offsides },
    addedTimeMinutes: state.addedTimeMinutes,
    lastDecision: state.lastDecision,
    eventIds: state.eventLog.slice(-24).map((event) => event.id),
    authority: ['ball', 'clock', 'offside', 'fouls', 'cards', 'var', 'restarts', 'score'],
  }
}

export function shouldAcceptCompetitiveSnapshot(current: Phase5NetworkSnapshot | null, incoming: Phase5NetworkSnapshot) {
  if (!current) return true
  return incoming.tick > current.tick || (incoming.tick === current.tick && incoming.sequence > current.sequence)
}
