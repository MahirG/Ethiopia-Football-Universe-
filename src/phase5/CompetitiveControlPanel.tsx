import { Flag, ScanLine, ShieldCheck, Swords, Video } from 'lucide-react'
import type { TeamSide } from '../game/types'
import { ASSET_TIERS, REFEREE_PROFILES, SET_PIECE_ROUTINES, TACTICAL_PRESETS } from './catalog'
import type { CompetitiveSettings, ManualRestartRequest, RestartType } from './types'

interface Props {
  settings: CompetitiveSettings
  patch: (patch: Partial<CompetitiveSettings>) => void
  request: (type: RestartType | 'var-check', team: TeamSide) => void
}

export function CompetitiveControlPanel({ settings, patch, request }: Props) {
  const corners = SET_PIECE_ROUTINES.filter((routine) => routine.restart === 'corner')
  const freeKicks = SET_PIECE_ROUTINES.filter((routine) => routine.restart === 'direct-free-kick')
  const trigger = (type: ManualRestartRequest['type']) => request(type, 'home')
  return <section className="phase5-console panel">
    <div className="phase5-console-head"><div><small>PHASE 5 CONTROL ROOM</small><strong>Competitive Match Intelligence</strong></div><span><ShieldCheck size={15} /> Laws engine active</span></div>
    <div className="phase5-grid">
      <label>Home tactic<select value={settings.homeTacticId} onChange={(event) => patch({ homeTacticId: event.target.value })}>{TACTICAL_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} · {preset.formation}</option>)}</select></label>
      <label>Away tactic<select value={settings.awayTacticId} onChange={(event) => patch({ awayTacticId: event.target.value })}>{TACTICAL_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} · {preset.formation}</option>)}</select></label>
      <label>Referee<select value={settings.refereeProfileId} onChange={(event) => patch({ refereeProfileId: event.target.value })}>{REFEREE_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
      <label>Asset tier<select value={settings.assetTier} onChange={(event) => patch({ assetTier: event.target.value as CompetitiveSettings['assetTier'] })}>{ASSET_TIERS.map((tier) => <option key={tier.id} value={tier.id}>{tier.name}</option>)}</select></label>
      <label>Home corner<select value={settings.homeCornerRoutineId} onChange={(event) => patch({ homeCornerRoutineId: event.target.value })}>{corners.map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}</select></label>
      <label>Away corner<select value={settings.awayCornerRoutineId} onChange={(event) => patch({ awayCornerRoutineId: event.target.value })}>{corners.map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}</select></label>
      <label>Home free kick<select value={settings.homeFreeKickRoutineId} onChange={(event) => patch({ homeFreeKickRoutineId: event.target.value })}>{freeKicks.map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}</select></label>
      <label>Away free kick<select value={settings.awayFreeKickRoutineId} onChange={(event) => patch({ awayFreeKickRoutineId: event.target.value })}>{freeKicks.map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}</select></label>
    </div>
    <div className="phase5-toggles">
      <label><input type="checkbox" checked={settings.varEnabled} onChange={(event) => patch({ varEnabled: event.target.checked })} /><span>VAR</span></label>
      <label><input type="checkbox" checked={settings.automaticRestarts} onChange={(event) => patch({ automaticRestarts: event.target.checked })} /><span>Automatic restarts</span></label>
      <label><input type="checkbox" checked={settings.visibleOffsideLines} onChange={(event) => patch({ visibleOffsideLines: event.target.checked })} /><span>Offside lines</span></label>
      <label><input type="checkbox" checked={settings.refereeAssistance} onChange={(event) => patch({ refereeAssistance: event.target.checked })} /><span>Referee assistance</span></label>
    </div>
    <div className="phase5-test-actions">
      <button onClick={() => trigger('corner')}><Flag size={14} /> Corner</button>
      <button onClick={() => trigger('direct-free-kick')}><Swords size={14} /> Free kick</button>
      <button onClick={() => trigger('penalty')}><ScanLine size={14} /> Penalty</button>
      <button onClick={() => trigger('var-check')}><Video size={14} /> VAR check</button>
    </div>
  </section>
}
