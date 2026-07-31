import { Flag, Scale, ShieldAlert, TimerReset, Video } from 'lucide-react'
import type { CompetitiveMatchState } from './types'

export function CompetitiveOverlay({ state }: { state: CompetitiveMatchState }) {
  return <aside className={`phase5-overlay phase5-${state.playState}`}>
    <div className="phase5-overlay-title"><Scale size={14} /><span>{state.playState.replace('-', ' ').toUpperCase()}</span><b>{state.lastDecision.replace('-', ' ')}</b></div>
    <div className="phase5-overlay-grid">
      <span><Flag size={12} /> Restarts <b>{state.telemetry.restartCount}</b></span>
      <span><ShieldAlert size={12} /> Cards <b>{state.cards.length}</b></span>
      <span><Video size={12} /> VAR <b>{state.telemetry.reviewCount}</b></span>
      <span><TimerReset size={12} /> Added <b>+{state.addedTimeMinutes}</b></span>
    </div>
    {state.restart && <strong className="phase5-decision">{state.restart.type.replace('-', ' ')} · {state.restart.team} · {state.restart.countdown.toFixed(1)}s</strong>}
    {state.varReview && <strong className="phase5-decision var">CHECKING {state.varReview.type.toUpperCase()}</strong>}
    <small>{state.lastMessage}</small>
  </aside>
}
