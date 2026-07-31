import type { AudioProfilerSnapshot, FootballAudioEvent } from './types'
import { AudioEventLab } from './AudioEventLab'

export function AudioDebugOverlay({ profile, open, close, trigger }: { profile: AudioProfilerSnapshot | null; open: boolean; close: () => void; trigger: (event: FootballAudioEvent) => void }) {
  if (!open || !profile) return null
  return (
    <aside className="audio-debug-overlay" aria-label="Audio debug overlay">
      <div className="audio-debug-head"><strong>AUDIO PROFILER</strong><button onClick={close}>×</button></div>
      <dl>
        <div><dt>State</dt><dd>{profile.started ? 'ACTIVE' : 'LOCKED'}</dd></div>
        <div><dt>Snapshot</dt><dd>{profile.currentSnapshot}</dd></div>
        <div><dt>Voices</dt><dd>{profile.activeVoices}/{profile.maxVoices}</dd></div>
        <div><dt>Queue</dt><dd>{profile.queuedEvents}</dd></div>
        <div><dt>Memory</dt><dd>{profile.estimatedMemoryKb} KB</dd></div>
        <div><dt>Crowd</dt><dd>{Math.round(profile.crowd.intensity * 100)}%</dd></div>
        <div><dt>Tension</dt><dd>{Math.round(profile.crowd.tension * 100)}%</dd></div>
        <div><dt>Threat</dt><dd>{Math.round(profile.crowd.attackThreat * 100)}%</dd></div>
      </dl>
      <small>{profile.stadiumProfile}</small>
      <small>{profile.homeProfile} · {profile.awayProfile}</small>
      <AudioEventLab trigger={trigger} />
      <div className="audio-debug-events">{profile.lastEvents.map((event, index) => <code key={`${event}-${index}`}>{event}</code>)}</div>
    </aside>
  )
}
