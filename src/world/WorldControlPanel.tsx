import { useMemo, useState } from 'react'
import { Building2, ChevronDown, Globe2, Settings2, ShieldCheck, Sparkles, Trophy, Users, Wind } from 'lucide-react'
import { BALLS, COMPETITIONS, VENUES } from './catalog'
import type { MatchWorldState, WorldSelection } from './types'
import './world.css'

interface WorldControlPanelProps {
  selection: WorldSelection
  patchSelection: (patch: Partial<WorldSelection>) => void
  world: MatchWorldState
  disabled?: boolean
}

export function WorldControlPanel({ selection, patchSelection, world, disabled = false }: WorldControlPanelProps) {
  const [open, setOpen] = useState(false)
  const venueOptions = useMemo(() => VENUES.filter((venue) => selection.competitionId === 'futsal-championship' ? venue.archetype === 'futsal-arena' : venue.archetype !== 'futsal-arena'), [selection.competitionId])
  return (
    <section className="world-console panel">
      <button className="world-console-summary" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="world-console-icon"><Globe2 size={19} /></span>
        <span><small>Living football world</small><strong>{world.competition.shortName} · {world.venue.name}</strong></span>
        <div className="world-console-metrics">
          <span><Users size={13} /> {world.attendance.total.toLocaleString()}</span>
          <span><Wind size={13} /> {Math.round(world.telemetry.windExposure * 100)}%</span>
          <span><ShieldCheck size={13} /> {Math.round(world.telemetry.securityLevel * 100)}%</span>
        </div>
        <ChevronDown size={18} className={open ? 'rotate' : ''} />
      </button>
      {open && <div className="world-console-body">
        <div className="world-control-grid">
          <label><span><Trophy size={14} /> Competition</span><select value={selection.competitionId} disabled={disabled} onChange={(event) => {
            const competition = COMPETITIONS.find((item) => item.id === event.target.value) ?? COMPETITIONS[0]
            const validVenue = event.target.value === 'futsal-championship' ? 'indoor-futsal' : selection.venueId === 'indoor-futsal' ? 'addis-national' : selection.venueId
            patchSelection({ competitionId: competition.id, ballId: competition.officialBallId, venueId: validVenue })
          }}>{COMPETITIONS.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}</select></label>
          <label><span><Building2 size={14} /> Venue</span><select value={selection.venueId} disabled={disabled} onChange={(event) => patchSelection({ venueId: event.target.value })}>{venueOptions.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} · {venue.capacity.toLocaleString()}</option>)}</select></label>
          <label><span>⚽ Match ball</span><select value={selection.ballId} disabled={disabled} onChange={(event) => patchSelection({ ballId: event.target.value })}>{BALLS.map((ball) => <option key={ball.id} value={ball.id}>{ball.name} · {ball.category}</option>)}</select></label>
          <label><span><Sparkles size={14} /> Match importance</span><select value={selection.importance} disabled={disabled} onChange={(event) => patchSelection({ importance: event.target.value as WorldSelection['importance'] })}><option value="friendly">Friendly</option><option value="regular">Regular fixture</option><option value="derby">Historic derby</option><option value="relegation">Relegation battle</option><option value="title-decider">Title decider</option><option value="final">Final</option></select></label>
        </div>
        <div className="world-range-grid">
          <label><span>Surface wear <b>{Math.round(selection.surfaceWear * 100)}%</b></span><input type="range" min="0" max="1" step="0.02" value={selection.surfaceWear} disabled={disabled} onChange={(event) => patchSelection({ surfaceWear: Number(event.target.value) })} /></label>
          <label><span>Maintenance <b>{Math.round(selection.maintenanceQuality * 100)}%</b></span><input type="range" min="0" max="1" step="0.02" value={selection.maintenanceQuality} disabled={disabled} onChange={(event) => patchSelection({ maintenanceQuality: Number(event.target.value) })} /></label>
          <label><span>Attendance <b>{selection.attendanceOverride === null ? 'Dynamic' : selection.attendanceOverride.toLocaleString()}</b></span><input type="range" min="0" max={world.venue.capacity} step={Math.max(50, Math.round(world.venue.capacity / 200))} value={selection.attendanceOverride ?? world.attendance.total} disabled={disabled} onChange={(event) => patchSelection({ attendanceOverride: Number(event.target.value) })} /><button type="button" onClick={() => patchSelection({ attendanceOverride: null })} disabled={disabled}>AUTO</button></label>
        </div>
        <div className="world-toggle-grid">
          <label><input type="checkbox" checked={selection.ceremonyEnabled} disabled={disabled} onChange={(event) => patchSelection({ ceremonyEnabled: event.target.checked })} /><span>Ceremonies</span></label>
          <label><input type="checkbox" checked={selection.crowdChoreography} disabled={disabled} onChange={(event) => patchSelection({ crowdChoreography: event.target.checked })} /><span>Supporter choreography</span></label>
          <label><input type="checkbox" checked={selection.exteriorSequence} disabled={disabled} onChange={(event) => patchSelection({ exteriorSequence: event.target.checked })} /><span>Arrival environment</span></label>
          <label><input type="checkbox" checked={selection.reducedPyro} onChange={(event) => patchSelection({ reducedPyro: event.target.checked })} /><span>Reduced pyrotechnics</span></label>
          <label><input type="checkbox" checked={selection.simplifiedPresentation} onChange={(event) => patchSelection({ simplifiedPresentation: event.target.checked })} /><span>Simplified presentation</span></label>
          <label><input type="checkbox" checked={selection.highContrastBall} onChange={(event) => patchSelection({ highContrastBall: event.target.checked })} /><span>High-contrast ball</span></label>
        </div>
        <div className="world-profile-grid">
          <article><Settings2 size={17} /><span>Pitch engineering</span><strong>{world.surface.name}</strong><small>Grip {Math.round(world.pitch.grip * 100)}% · moisture {Math.round(world.pitch.moisture * 100)}% · divots {Math.round(world.pitch.divots * 100)}%</small></article>
          <article><Users size={17} /><span>Crowd intelligence</span><strong>{Math.round(world.telemetry.crowdEnergy * 100)}% energy</strong><small>{world.attendance.home.toLocaleString()} home · {world.attendance.away.toLocaleString()} away · {world.crowd.choreography}</small></article>
          <article><ShieldCheck size={17} /><span>Match-day operations</span><strong>{world.staff.stewards} stewards · {world.staff.cameraOperators} cameras</strong><small>{world.staff.paramedics} paramedics · {world.staff.ballAssistants} ball assistants · {world.staff.journalists} media</small></article>
          <article><Trophy size={17} /><span>Presentation</span><strong>{world.competition.broadcastStyle}</strong><small>{world.competition.entranceStyle} · {world.ceremony.tier} ceremony</small></article>
        </div>
      </div>}
    </section>
  )
}
