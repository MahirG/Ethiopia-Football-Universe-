import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { Camera, CirclePause, CirclePlay, Cloud, CloudRain, Expand, Film, Gamepad2, Gauge, RotateCcw, Shield, Sparkles, Sun, Trophy, Video, WandSparkles, Wind } from 'lucide-react'
import { premierClubs } from '../data/clubs'
import { MatchScene } from '../game/MatchScene'
import type { Difficulty, LiveCameraMode, QualityLevel, TeamSide, TimeOfDay, Weather } from '../game/types'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { MatchRecord } from '../types'

const MATCH_MINUTES_PER_SECOND = 4.5
const REPLAY_DURATION_MS = 4400

function formatClock(time: number) {
  const minutes = Math.floor(time).toString().padStart(2, '0')
  const seconds = Math.floor((time % 1) * 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function MatchView() {
  const shellRef = useRef<HTMLElement>(null)
  const completedRef = useRef(false)
  const replayTimerRef = useRef<number | null>(null)
  const replayResumeRef = useRef(false)
  const [running, setRunning] = useState(false)
  const [homeId, setHomeId] = useState(premierClubs[0].id)
  const [awayId, setAwayId] = useState(premierClubs[5].id)
  const [weather, setWeather] = useState<Weather>('clear')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('afternoon')
  const [cameraMode, setCameraMode] = useState<LiveCameraMode>('broadcast')
  const [difficulty, setDifficulty] = useState<Difficulty>('Professional')
  const [quality, setQuality] = useLocalStorage<QualityLevel>('efu-graphics-quality', 'balanced')
  const [sceneKey, setSceneKey] = useState(0)
  const [replayToken, setReplayToken] = useState(0)
  const [replayActive, setReplayActive] = useState(false)
  const [score, setScore] = useState({ home: 0, away: 0, time: 0 })
  const [message, setMessage] = useState('Ready for kick-off')
  const [records, setRecords] = useLocalStorage<MatchRecord[]>('efu-match-history', [])
  const home = useMemo(() => premierClubs.find((item) => item.id === homeId) ?? premierClubs[0], [homeId])
  const away = useMemo(() => premierClubs.find((item) => item.id === awayId) ?? premierClubs[1], [awayId])

  const stopReplay = useCallback(() => {
    if (replayTimerRef.current !== null) window.clearTimeout(replayTimerRef.current)
    replayTimerRef.current = null
    setReplayActive(false)
  }, [])

  const reset = useCallback(() => {
    stopReplay()
    completedRef.current = false
    replayResumeRef.current = false
    setSceneKey((value) => value + 1)
    setReplayToken(0)
    setScore({ home: 0, away: 0, time: 0 })
    setMessage('Ready for kick-off')
    setRunning(false)
  }, [stopReplay])

  const changeTeam = (team: TeamSide, event: ChangeEvent<HTMLSelectElement>) => {
    if (team === 'home') setHomeId(event.target.value)
    else setAwayId(event.target.value)
    reset()
  }

  const beginReplay = useCallback((label: string) => {
    if (replayTimerRef.current !== null) window.clearTimeout(replayTimerRef.current)
    replayResumeRef.current = running
    setRunning(false)
    setReplayActive(true)
    setReplayToken((value) => value + 1)
    setMessage(label)
    replayTimerRef.current = window.setTimeout(() => {
      setReplayActive(false)
      replayTimerRef.current = null
      if (replayResumeRef.current && !completedRef.current) setRunning(true)
    }, REPLAY_DURATION_MS)
  }, [running])

  const handleGoal = useCallback((team: TeamSide) => {
    setScore((current) => ({ ...current, [team]: current[team] + 1 }))
    beginReplay('Cinematic goal replay')
  }, [beginReplay])

  useEffect(() => () => { if (replayTimerRef.current !== null) window.clearTimeout(replayTimerRef.current) }, [])
  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => setScore((current) => ({ ...current, time: Math.min(90, current.time + MATCH_MINUTES_PER_SECOND / 10) })), 100)
    return () => window.clearInterval(interval)
  }, [running])
  useEffect(() => {
    if (score.time < 90 || completedRef.current) return
    completedRef.current = true
    stopReplay()
    setRunning(false)
    setMessage('Full time')
    const record: MatchRecord = { id: crypto.randomUUID(), home: home.name, away: away.name, homeScore: score.home, awayScore: score.away, date: new Date().toISOString() }
    setRecords((items) => [record, ...items].slice(0, 8))
  }, [away.name, home.name, score.away, score.home, score.time, setRecords, stopReplay])

  const dispatchKey = (key: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true }))
  const sceneCameraMode = replayActive ? 'replay' : cameraMode

  return (
    <div className="view-stack match-view">
      <section className="page-title-row"><div><span className="section-kicker">Phase 2 · Realism and atmosphere</span><h1>Broadcast Match Center</h1><p>Control articulated athletes on reactive grass with advanced ball aerodynamics, crowd reactions, wet-weather materials, an automatic camera director and cinematic replay playback.</p></div><div className="title-actions"><span className="prototype-badge phase-two-badge"><span /> PHASE 2 REALISM PASS</span></div></section>
      <section className="match-setup panel">
        <div className="team-selector"><span>HOME</span><select value={homeId} onChange={(event) => changeTeam('home', event)}>{premierClubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select><div className="mini-crest" style={{ '--club-a': home.colors[0], '--club-b': home.colors[1] } as CSSProperties}>{home.shortName}</div></div>
        <div className="match-versus"><small>3D FRIENDLY</small><strong>VS</strong><span>Addis Ababa · 2,400 m</span></div>
        <div className="team-selector away"><span>AWAY</span><select value={awayId} onChange={(event) => changeTeam('away', event)}>{premierClubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select><div className="mini-crest" style={{ '--club-a': away.colors[0], '--club-b': away.colors[1] } as CSSProperties}>{away.shortName}</div></div>
      </section>

      <section ref={shellRef} className={`game-shell game-shell-3d quality-${quality} ${replayActive ? 'is-replay' : ''}`}>
        <div className="broadcast-scorebug"><div className="broadcast-team"><i style={{ background: home.colors[0] }} />{home.shortName}</div><strong>{score.home}</strong><span className="broadcast-clock">{formatClock(score.time)}</span><strong>{score.away}</strong><div className="broadcast-team away">{away.shortName}<i style={{ background: away.colors[0] }} /></div></div>
        <div className="camera-status"><Camera size={13} /><span>{sceneCameraMode} camera</span></div>
        {replayActive && <div className="replay-watermark"><Film size={14} /> REPLAY</div>}
        <div className="match-event-banner">{message}</div>
        <MatchScene key={sceneKey} running={running} homeColor={home.colors[0]} homeSecondaryColor={home.colors[1]} awayColor={away.colors[0]} awaySecondaryColor={away.colors[1]} weather={weather} timeOfDay={timeOfDay} cameraMode={sceneCameraMode} difficulty={difficulty} quality={quality} replayToken={replayToken} replayActive={replayActive} onGoal={handleGoal} onEvent={setMessage} />
        <div className="broadcast-lower-third"><span><Gamepad2 size={14} /> WASD MOVE</span><span>SHIFT SPRINT</span><span>E PASS</span><span>SPACE SHOOT</span>{cameraMode === 'free' && <span>Q / R VERTICAL</span>}</div>
        <div className="broadcast-tech-strip"><span><Sparkles size={12} /> {quality.toUpperCase()}</span><span>{weather.toUpperCase()}</span><span>{timeOfDay.toUpperCase()}</span></div>
        <button className="fullscreen-button" onClick={() => void shellRef.current?.requestFullscreen?.()} title="Enter fullscreen"><Expand size={16} /></button>
        <div className="game-controls-overlay"><div className="touch-dpad mobile-game-controls"><button onPointerDown={() => dispatchKey('w', true)} onPointerUp={() => dispatchKey('w', false)}>▲</button><button onPointerDown={() => dispatchKey('a', true)} onPointerUp={() => dispatchKey('a', false)}>◀</button><button onPointerDown={() => dispatchKey('d', true)} onPointerUp={() => dispatchKey('d', false)}>▶</button><button onPointerDown={() => dispatchKey('s', true)} onPointerUp={() => dispatchKey('s', false)}>▼</button></div><div className="touch-actions mobile-game-controls"><button onPointerDown={() => dispatchKey('e', true)} onPointerUp={() => dispatchKey('e', false)}>PASS</button><button onPointerDown={() => dispatchKey(' ', true)} onPointerUp={() => dispatchKey(' ', false)}>SHOOT</button></div></div>
      </section>

      <section className="match-toolbar panel match-toolbar-3d phase-two-toolbar">
        <div className="match-primary-actions"><button className="primary-button" onClick={() => setRunning((value) => !value)} disabled={replayActive}>{running ? <CirclePause size={18} /> : <CirclePlay size={18} />}{running ? 'Pause match' : score.time > 0 ? 'Resume match' : 'Kick off'}</button><button className="secondary-button" onClick={reset}><RotateCcw size={17} /> Reset</button><button className="secondary-button replay-button" onClick={() => beginReplay('Instant replay')} disabled={replayActive || score.time === 0}><Film size={17} /> Replay</button></div>
        <div className="camera-picker" aria-label="Camera mode">{([['broadcast', Video, 'Broadcast'], ['auto', WandSparkles, 'Director'], ['follow', Gamepad2, 'Follow'], ['ball', Camera, 'Ball'], ['free', Expand, 'Free 8D']] as const).map(([mode, Icon, label]) => <button key={mode} className={cameraMode === mode ? 'active' : ''} onClick={() => setCameraMode(mode)} title={`${label} camera`} disabled={replayActive}><Icon size={16} /><span>{label}</span></button>)}</div>
        <div className="match-environment-controls">
          <label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}><option>Academy</option><option>Professional</option><option>Legendary</option></select></label>
          <label>Light<select value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value as TimeOfDay)}><option value="afternoon">Afternoon</option><option value="golden">Golden hour</option><option value="night">Night</option></select></label>
          <label>Graphics<select value={quality} onChange={(event) => setQuality(event.target.value as QualityLevel)}><option value="performance">Performance</option><option value="balanced">Balanced</option><option value="ultra">Ultra</option></select></label>
          <div className="weather-picker"><button className={weather === 'clear' ? 'active' : ''} onClick={() => setWeather('clear')} title="Clear"><Sun size={17} /></button><button className={weather === 'overcast' ? 'active' : ''} onClick={() => setWeather('overcast')} title="Overcast"><Cloud size={17} /></button><button className={weather === 'rain' ? 'active' : ''} onClick={() => setWeather('rain')} title="Rain"><CloudRain size={17} /></button><button className={weather === 'wind' ? 'active' : ''} onClick={() => setWeather('wind')} title="Wind"><Wind size={17} /></button></div>
        </div>
      </section>

      <div className="dashboard-grid three phase-two-stats"><article className="stat-panel panel"><Gauge /><div><span>Athlete system</span><strong>22 articulated players</strong><small>Body variety, fatigue, head tracking and layered gait</small></div></article><article className="stat-panel panel"><Shield /><div><span>Surface simulation</span><strong>Reactive grass and ball</strong><small>Magnus spin, wetness, scuffs, particles and net ripple</small></div></article><article className="stat-panel panel"><Trophy /><div><span>Presentation</span><strong>5 cameras + replay</strong><small>Predictive broadcast director and cinematic playback</small></div></article></div>
      {records.length > 0 && <section className="panel history-panel"><div className="panel-heading"><h2>Recent results</h2><button className="text-button" onClick={() => setRecords([])}>Clear history</button></div>{records.map((record) => <div className="history-row" key={record.id}><span>{new Date(record.date).toLocaleDateString()}</span><strong>{record.home}</strong><b>{record.homeScore} — {record.awayScore}</b><strong>{record.away}</strong></div>)}</section>}
    </div>
  )
}
