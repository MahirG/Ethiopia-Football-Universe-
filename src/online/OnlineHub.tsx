import { useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, Check, Cloud, CloudOff, Copy, Gamepad2, Globe2,
  KeyRound, LockKeyhole, Radio, RefreshCw, Search, ShieldCheck, Signal,
  Trophy, UserRound, UsersRound, Wifi, X,
} from 'lucide-react'
import { RANKED_DIVISIONS, SERVICE_REGIONS, divisionForRating } from './catalog'
import { fairPlayBand } from './integrity'
import { useOnlinePlatform } from './useOnlinePlatform'
import type { OnlineModeId, OnlineRegionId } from './types'
import './online.css'

type OnlineTab = 'play' | 'ranked' | 'cloud' | 'security'

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <div className="online-metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`online-status status-${status}`}><i />{status.replace('-', ' ')}</span>
}

export function OnlineHub() {
  const {
    snapshot, leaderboard, liveSeason, liveEvents, modes, error, updateIdentity,
    startQueue, cancelQueue, acceptMatch, toggleReady, createPrivateRoom,
    joinPrivateRoom, syncCloud,
  } = useOnlinePlatform()
  const [tab, setTab] = useState<OnlineTab>('play')
  const [selectedMode, setSelectedMode] = useState<OnlineModeId>('ranked-1v1')
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)

  const identity = snapshot?.identity
  const division = identity ? divisionForRating(identity.rating) : RANKED_DIVISIONS[RANKED_DIVISIONS.length - 1]
  const currentMode = modes.find((mode) => mode.id === selectedMode) ?? modes[0]
  const fairPlay = fairPlayBand(identity?.fairPlay ?? 100)
  const seasonProgress = useMemo(() => {
    const start = new Date(liveSeason.startsAt).getTime()
    const end = new Date(liveSeason.endsAt).getTime()
    return Math.max(0, Math.min(100, ((Date.now() - start) / Math.max(1, end - start)) * 100))
  }, [liveSeason.endsAt, liveSeason.startsAt])

  const copyRoomCode = async () => {
    if (!snapshot?.room?.code) return
    await navigator.clipboard?.writeText(snapshot.room.code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  if (!snapshot || !identity) {
    return <section className="online-loading"><Radio className="spin-slow" size={28} /><strong>Connecting the football universe…</strong><span>Loading identity, saves and live competition data.</span></section>
  }

  return (
    <section className="online-hub">
      <header className="online-hero">
        <div>
          <span className="eyebrow"><Globe2 size={15} /> Phase 6 · Connected Football</span>
          <h1>Online Football Centre</h1>
          <p>Ranked seasons, private rooms, cloud progression and integrity-first competition—ready for regional infrastructure without sacrificing offline play.</p>
        </div>
        <div className="online-identity-card">
          <div className="online-avatar"><UserRound size={26} /></div>
          <div><small>Player identity</small><strong>{identity.displayName}</strong><span>{identity.guest ? 'Guest profile' : 'Verified account'} · {identity.region}</span></div>
          <StatusBadge status={snapshot.gatewayMode === 'cloud' ? snapshot.gatewayStatus : 'local-ready'} />
        </div>
      </header>

      <div className="online-summary-grid">
        <Metric label="Division" value={division.name} detail={`${identity.rating} rating`} />
        <Metric label="Record" value={`${identity.wins}-${identity.draws}-${identity.losses}`} detail={`${identity.placementMatchesRemaining} placements left`} />
        <Metric label="Fair play" value={`${identity.fairPlay}%`} detail={fairPlay} />
        <Metric label="Region" value={SERVICE_REGIONS.find((region) => region.id === identity.region)?.name ?? 'Automatic'} detail={snapshot.gatewayMode === 'cloud' ? 'Cloud routing enabled' : 'Local service simulator'} />
      </div>

      <nav className="online-tabs" aria-label="Online centre sections">
        <button className={tab === 'play' ? 'active' : ''} onClick={() => setTab('play')}><Gamepad2 size={17} /> Play</button>
        <button className={tab === 'ranked' ? 'active' : ''} onClick={() => setTab('ranked')}><Trophy size={17} /> Ranked</button>
        <button className={tab === 'cloud' ? 'active' : ''} onClick={() => setTab('cloud')}><Cloud size={17} /> Cloud</button>
        <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}><ShieldCheck size={17} /> Integrity</button>
      </nav>

      {error && <div className="online-alert"><AlertTriangle size={18} /><span>{error}</span><button aria-label="Dismiss error"><X size={15} /></button></div>}

      {tab === 'play' && (
        <div className="online-layout">
          <div className="online-main-column">
            <article className="online-panel">
              <div className="panel-title"><div><span>Matchmaking</span><h2>Choose your competition</h2></div><StatusBadge status={snapshot.queue.state} /></div>
              <div className="mode-grid">
                {modes.map((mode) => (
                  <button key={mode.id} className={`mode-card ${selectedMode === mode.id ? 'selected' : ''}`} onClick={() => setSelectedMode(mode.id)}>
                    <span className="mode-icon">{mode.teamSize > 1 ? <UsersRound size={21} /> : <Gamepad2 size={21} />}</span>
                    <strong>{mode.name}</strong>
                    <small>{mode.description}</small>
                    <span className="mode-meta">{mode.ranked ? 'Ranked' : 'Unranked'} · {mode.teamSize}v{mode.teamSize} · ≤{mode.maxPingMs}ms</span>
                  </button>
                ))}
              </div>

              {snapshot.queue.state === 'idle' || snapshot.queue.state === 'cancelled' ? (
                <button className="online-primary" onClick={() => void startQueue(selectedMode)}><Search size={18} /> Find {currentMode.name} match</button>
              ) : snapshot.queue.state === 'found' ? (
                <div className="ready-found"><div><strong>Compatible opponent found</strong><span>{snapshot.queue.candidates} candidates · ±{snapshot.queue.expandedSkillWindow} rating · {snapshot.queue.expandedPingMs}ms ceiling</span></div><button className="online-primary" onClick={() => void acceptMatch()}><Check size={18} /> Accept</button><button className="online-secondary" onClick={() => void cancelQueue()}>Decline</button></div>
              ) : (
                <div className="queue-progress">
                  <div className="queue-radar"><Radio size={34} /><i /><i /><i /></div>
                  <div><strong>{snapshot.queue.message}</strong><span>{snapshot.queue.elapsedSeconds}s elapsed · skill window ±{snapshot.queue.expandedSkillWindow} · {snapshot.queue.candidates} candidates</span></div>
                  <button className="online-secondary" onClick={() => void cancelQueue()}>Cancel</button>
                </div>
              )}
            </article>

            {snapshot.room && (
              <article className="online-panel room-panel">
                <div className="panel-title"><div><span>Authoritative room</span><h2>{snapshot.room.code}</h2></div><button className="copy-button" onClick={() => void copyRoomCode()}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy code'}</button></div>
                <div className="participant-list">
                  {snapshot.room.participants.map((participant) => (
                    <div key={participant.playerId} className="participant-row"><span className={`connection-dot ${participant.connected ? 'connected' : ''}`} /><div><strong>{participant.displayName}</strong><small>{participant.team} · {participant.rating} rating</small></div><span>{participant.latencyMs}ms</span><StatusBadge status={participant.ready ? 'ready' : 'not-ready'} /></div>
                  ))}
                </div>
                <button className="online-primary" onClick={toggleReady}>{snapshot.room.participants.find((participant) => participant.playerId === identity.id)?.ready ? 'Cancel ready' : 'I am ready'}</button>
              </article>
            )}
          </div>

          <aside className="online-side-column">
            <article className="online-panel compact-panel">
              <div className="panel-title"><div><span>Private match</span><h2>Room code</h2></div><KeyRound size={20} /></div>
              <button className="online-secondary wide" onClick={() => void createPrivateRoom(selectedMode)}>Create private room</button>
              <div className="join-room"><input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ENTER CODE" maxLength={8} /><button onClick={() => void joinPrivateRoom(joinCode)}>Join</button></div>
            </article>
            <article className="online-panel compact-panel network-card">
              <div className="panel-title"><div><span>Network route</span><h2>{snapshot.gatewayMode === 'cloud' ? 'Cloud connected' : 'Local simulation'}</h2></div>{snapshot.gatewayMode === 'cloud' ? <Wifi size={20} /> : <CloudOff size={20} />}</div>
              <div className="network-row"><Signal size={17} /><span>Target latency</span><strong>{SERVICE_REGIONS.find((region) => region.id === identity.region)?.latencyTargetMs ?? 90}ms</strong></div>
              <div className="network-row"><LockKeyhole size={17} /><span>Authority</span><strong>Server-first</strong></div>
              <div className="network-row"><RefreshCw size={17} /><span>Reconnect</span><strong>{currentMode.reconnectSeconds}s</strong></div>
            </article>
          </aside>
        </div>
      )}

      {tab === 'ranked' && (
        <div className="online-layout">
          <article className="online-panel online-main-column">
            <div className="panel-title"><div><span>{liveSeason.name}</span><h2>Season leaderboard</h2></div><Trophy size={22} /></div>
            <div className="season-progress"><div><span>Season progress</span><strong>{Math.round(seasonProgress)}%</strong></div><div className="progress"><i style={{ width: `${seasonProgress}%` }} /></div><small>{new Date(liveSeason.startsAt).toLocaleDateString()} — {new Date(liveSeason.endsAt).toLocaleDateString()} · no pay-to-win rewards</small></div>
            <div className="leaderboard-table">
              <div className="leaderboard-head"><span>#</span><span>Player</span><span>Division</span><span>Rating</span><span>Fair play</span></div>
              {leaderboard.slice(0, 12).map((entry) => (
                <div key={entry.playerId} className={`leaderboard-row ${entry.playerId === identity.id ? 'is-you' : ''}`}><span>{entry.rank}</span><span><strong>{entry.displayName}</strong><small>{entry.region}</small></span><span>{divisionForRating(entry.rating).name}</span><strong>{entry.rating}</strong><span>{entry.fairPlay}%</span></div>
              ))}
            </div>
          </article>
          <aside className="online-side-column">
            <article className="online-panel compact-panel"><div className="panel-title"><div><span>Live operations</span><h2>Upcoming events</h2></div><Activity size={20} /></div>{liveEvents.map((event) => <div className="event-card" key={event.id}><strong>{event.name}</strong><span>{modes.find((mode) => mode.id === event.mode)?.name}</span><small>{new Date(event.startsAt).toLocaleString()} · Fair play ≥ {event.minimumFairPlay}</small></div>)}</article>
          </aside>
        </div>
      )}

      {tab === 'cloud' && (
        <div className="online-layout">
          <article className="online-panel online-main-column cloud-panel">
            <div className="cloud-visual">{snapshot.gatewayMode === 'cloud' ? <Cloud size={52} /> : <CloudOff size={52} />}</div>
            <div><span className="eyebrow">Revisioned progression</span><h2>{snapshot.gatewayMode === 'cloud' ? 'Cloud services configured' : 'Offline-safe cloud foundation'}</h2><p>Career, match history, accessibility and world configuration are packaged into checksummed revisions. Newer server revisions are never silently overwritten.</p><div className="cloud-facts"><Metric label="Gateway" value={snapshot.gatewayMode} /><Metric label="Status" value={snapshot.gatewayStatus} /><Metric label="Last sync" value={snapshot.lastSyncAt ? new Date(snapshot.lastSyncAt).toLocaleString() : 'Never'} /></div><button className="online-primary" onClick={() => void syncCloud()}><RefreshCw size={18} /> Sync progression now</button></div>
          </article>
          <aside className="online-side-column"><article className="online-panel compact-panel"><div className="panel-title"><div><span>Profile settings</span><h2>Identity and route</h2></div><UserRound size={20} /></div><label className="online-field"><span>Display name</span><input value={identity.displayName} maxLength={24} onChange={(event) => void updateIdentity({ displayName: event.target.value })} /></label><label className="online-field"><span>Preferred region</span><select value={identity.region} onChange={(event) => void updateIdentity({ region: event.target.value as OnlineRegionId })}>{SERVICE_REGIONS.map((region) => <option key={region.id} value={region.id}>{region.name}{region.enabled ? '' : ' · planned'}</option>)}</select></label></article></aside>
        </div>
      )}

      {tab === 'security' && (
        <div className="integrity-grid">
          <article className="online-panel integrity-lead"><ShieldCheck size={40} /><span className="eyebrow">Fair competition</span><h2>Prediction for responsiveness. Authority for truth.</h2><p>The client may predict movement and presentation, but score, clock, ball contacts, cards, offsides, restarts, results and rating changes remain server-owned.</p><StatusBadge status={`fairplay-${fairPlay}`} /></article>
          <article className="online-panel integrity-card"><LockKeyhole size={24} /><h3>Hash-chained evidence</h3><p>Every competitive input carries a sequence number, previous hash and canonical action payload, creating an auditable event chain.</p></article>
          <article className="online-panel integrity-card"><Signal size={24} /><h3>Impossible-state checks</h3><p>Clock drift, action cadence, input rate, field bounds and correction thresholds are evaluated before authoritative acceptance.</p></article>
          <article className="online-panel integrity-card"><UsersRound size={24} /><h3>Moderation workflow</h3><p>Reports preserve match identifiers and evidence references while keeping player data separated from public leaderboards.</p></article>
          <article className="online-panel integrity-card"><RefreshCw size={24} /><h3>Reconnect fairness</h3><p>Sessions resume from the last acknowledged sequence and authoritative snapshot instead of trusting a returning client state.</p></article>
        </div>
      )}
    </section>
  )
}
