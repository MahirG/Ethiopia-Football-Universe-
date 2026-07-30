import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { Activity, BarChart3, Camera, CirclePause, CirclePlay, Cloud, CloudRain, Expand, Film, Gamepad2, RotateCcw, Shield, Sparkles, Sun, Trophy, Video, Volume2, VolumeX, WandSparkles, Wind } from 'lucide-react'
import { premierClubs } from '../data/clubs'
import { MatchScene } from '../game/MatchScene'
import { useMatchAudio } from '../game/audio'
import '../game/phase3.css'
import type { Difficulty, LiveCameraMode, MatchAction, MatchTelemetry, PresentationPhase, QualityLevel, TeamSide, TimeOfDay, Weather } from '../game/types'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { MatchRecord } from '../types'

const SPEED = 4.5
const INITIAL_TELEMETRY: MatchTelemetry = { homeTerritory: 50, awayTerritory: 50, ballSpeed: 0, controlledDistance: 0, stamina: 100 }
interface Actions { homePasses: number; awayPasses: number; homeShots: number; awayShots: number }
const INITIAL_ACTIONS: Actions = { homePasses: 0, awayPasses: 0, homeShots: 0, awayShots: 0 }
const formatClock = (time: number) => `${Math.floor(time).toString().padStart(2, '0')}:${Math.floor(time % 1 * 60).toString().padStart(2, '0')}`

export function MatchView() {
  const shellRef = useRef<HTMLElement>(null)
  const completed = useRef(false)
  const halftime = useRef(false)
  const phaseTimer = useRef<number | null>(null)
  const replayTimer = useRef<number | null>(null)
  const resumeAfterReplay = useRef(false)
  const [running, setRunning] = useState(false)
  const [homeId, setHomeId] = useState(premierClubs[0].id)
  const [awayId, setAwayId] = useState(premierClubs[5].id)
  const [weather, setWeather] = useState<Weather>('clear')
  const [weatherIntensity, setWeatherIntensity] = useLocalStorage('efu-weather-intensity', 0.7)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('dynamic')
  const [cameraMode, setCameraMode] = useState<LiveCameraMode>('auto')
  const [difficulty, setDifficulty] = useState<Difficulty>('Professional')
  const [quality, setQuality] = useLocalStorage<QualityLevel>('efu-graphics-quality', 'balanced')
  const [audioEnabled, setAudioEnabled] = useLocalStorage('efu-match-audio', true)
  const [audioVolume, setAudioVolume] = useLocalStorage('efu-match-volume', 0.58)
  const [cameraShake, setCameraShake] = useLocalStorage('efu-camera-shake', true)
  const [sceneKey, setSceneKey] = useState(0)
  const [replayToken, setReplayToken] = useState(0)
  const [replayActive, setReplayActive] = useState(false)
  const [phase, setPhase] = useState<PresentationPhase>('idle')
  const [celebration, setCelebration] = useState<TeamSide | null>(null)
  const [score, setScore] = useState({ home: 0, away: 0, time: 0 })
  const [actions, setActions] = useState<Actions>(INITIAL_ACTIONS)
  const [telemetry, setTelemetry] = useState<MatchTelemetry>(INITIAL_TELEMETRY)
  const [message, setMessage] = useState('Ready for broadcast')
  const [showStats, setShowStats] = useState(false)
  const [records, setRecords] = useLocalStorage<MatchRecord[]>('efu-match-history', [])
  const audio = useMatchAudio(audioEnabled, audioVolume)
  const home = useMemo(() => premierClubs.find((club) => club.id === homeId) ?? premierClubs[0], [homeId])
  const away = useMemo(() => premierClubs.find((club) => club.id === awayId) ?? premierClubs[1], [awayId])
  const progress = Math.min(1, score.time / 90)

  const clearTimers = useCallback(() => {
    if (phaseTimer.current !== null) window.clearTimeout(phaseTimer.current)
    if (replayTimer.current !== null) window.clearTimeout(replayTimer.current)
    phaseTimer.current = null; replayTimer.current = null
  }, [])

  const reset = useCallback(() => {
    clearTimers(); completed.current = false; halftime.current = false
    setRunning(false); setPhase('idle'); setReplayActive(false); setCelebration(null)
    setSceneKey((value) => value + 1); setReplayToken(0)
    setScore({ home: 0, away: 0, time: 0 }); setActions(INITIAL_ACTIONS); setTelemetry(INITIAL_TELEMETRY)
    setMessage('Ready for broadcast'); audio.setCrowdIntensity(0.26)
  }, [audio, clearTimers])

  const changeTeam = (team: TeamSide, event: ChangeEvent<HTMLSelectElement>) => {
    if (team === 'home') setHomeId(event.target.value); else setAwayId(event.target.value)
    reset()
  }

  const replay = useCallback((label: string) => {
    if (replayTimer.current !== null) window.clearTimeout(replayTimer.current)
    resumeAfterReplay.current = running
    setRunning(false); setReplayActive(true); setReplayToken((value) => value + 1); setMessage(label)
    replayTimer.current = window.setTimeout(() => {
      setReplayActive(false); setCelebration(null); replayTimer.current = null
      if (resumeAfterReplay.current && !completed.current) { setPhase('live'); setRunning(true); setMessage('Live play') }
    }, 4400)
  }, [running])

  const onGoal = useCallback((team: TeamSide) => {
    setScore((current) => ({ ...current, [team]: current[team] + 1 }))
    setCelebration(team); audio.goal(); audio.setCrowdIntensity(0.68)
    replay(`${team === 'home' ? home.shortName : away.shortName} goal · cinematic replay`)
  }, [audio, away.shortName, home.shortName, replay])

  const onAction = useCallback((action: MatchAction, team: TeamSide) => {
    setActions((current) => action === 'pass'
      ? team === 'home' ? { ...current, homePasses: current.homePasses + 1 } : { ...current, awayPasses: current.awayPasses + 1 }
      : team === 'home' ? { ...current, homeShots: current.homeShots + 1 } : { ...current, awayShots: current.awayShots + 1 })
    if (action === 'pass') audio.pass(); else audio.shot()
  }, [audio])

  const start = useCallback(async () => {
    await audio.ensureStarted()
    if (score.time === 0 && phase === 'idle') {
      setPhase('intro'); setMessage('Live from Addis Ababa'); audio.setCrowdIntensity(0.38)
      phaseTimer.current = window.setTimeout(() => { setPhase('live'); setMessage('Kick-off'); audio.kickoff(); setRunning(true); phaseTimer.current = null }, 5800)
    } else { setPhase('live'); setMessage(score.time ? 'Match resumed' : 'Kick-off'); setRunning(true) }
  }, [audio, phase, score.time])

  useEffect(() => () => clearTimers(), [clearTimers])
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setScore((current) => ({ ...current, time: Math.min(90, current.time + SPEED / 10) })), 100)
    return () => window.clearInterval(timer)
  }, [running])
  useEffect(() => {
    if (score.time < 45 || score.time >= 90 || halftime.current || phase !== 'live') return
    halftime.current = true; setRunning(false); setPhase('halftime'); setMessage('Half-time'); audio.halftime(); audio.setCrowdIntensity(0.34)
    phaseTimer.current = window.setTimeout(() => { setPhase('live'); setMessage('Second half'); setRunning(true); audio.setCrowdIntensity(0.4); phaseTimer.current = null }, 3400)
  }, [audio, phase, score.time])
  useEffect(() => {
    if (score.time < 90 || completed.current) return
    completed.current = true; clearTimers(); setRunning(false); setReplayActive(false); setPhase('fulltime'); setMessage('Full time')
    setCelebration(score.home === score.away ? null : score.home > score.away ? 'home' : 'away'); audio.fulltime(); audio.setCrowdIntensity(0.48)
    setRecords((items) => [{ id: crypto.randomUUID(), home: home.name, away: away.name, homeScore: score.home, awayScore: score.away, date: new Date().toISOString() }, ...items].slice(0, 8))
  }, [audio, away.name, clearTimers, home.name, score.away, score.home, score.time, setRecords])
  useEffect(() => { if (running && !replayActive) audio.setCrowdIntensity(0.27 + progress * 0.2 + (score.home + score.away) * 0.025) }, [audio, progress, replayActive, running, score.away, score.home])

  const dispatchKey = (key: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true }))
  const sceneCamera = replayActive ? 'replay' : cameraMode
  const phaseLabel = phase === 'intro' ? 'PRE-MATCH' : phase === 'halftime' ? 'HALF-TIME' : phase === 'fulltime' ? 'FULL-TIME' : null

  return <div className="view-stack match-view phase-three-view">
    <section className="page-title-row"><div><span className="section-kicker">Phase 3 · cinematic polish</span><h1>Prime Broadcast Match</h1><p>A complete televised match flow with procedural stadium audio, cinematic opening and interval packages, dynamic daylight, live telemetry, weather intensity, player fatigue and accessible camera controls.</p></div><span className="prototype-badge phase-three-badge"><span /> CINEMATIC SYSTEM ONLINE</span></section>
    <section className="match-setup panel">
      <div className="team-selector"><span>HOME</span><select value={homeId} onChange={(event) => changeTeam('home', event)}>{premierClubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select><div className="mini-crest" style={{ '--club-a': home.colors[0], '--club-b': home.colors[1] } as CSSProperties}>{home.shortName}</div></div>
      <div className="match-versus"><small>PRIME MATCH</small><strong>VS</strong><span>Addis Ababa · 2,400m</span></div>
      <div className="team-selector away"><span>AWAY</span><select value={awayId} onChange={(event) => changeTeam('away', event)}>{premierClubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select><div className="mini-crest" style={{ '--club-a': away.colors[0], '--club-b': away.colors[1] } as CSSProperties}>{away.shortName}</div></div>
    </section>

    <section ref={shellRef} className={`game-shell game-shell-3d phase-three-shell quality-${quality} phase-${phase} weather-${weather} ${replayActive ? 'is-replay' : ''}`}>
      <div className="broadcast-scorebug phase-three-scorebug"><div className="broadcast-team"><i style={{ background: home.colors[0] }} />{home.shortName}</div><strong>{score.home}</strong><span className="broadcast-clock">{formatClock(score.time)}</span><strong>{score.away}</strong><div className="broadcast-team away">{away.shortName}<i style={{ background: away.colors[0] }} /></div></div>
      <div className="camera-status"><Camera size={13} /> {replayActive ? 'Replay' : cameraMode} cam</div><div className="match-event-banner">{message}</div>
      {replayActive && <div className="replay-watermark"><Film size={14} /> INSTANT REPLAY</div>}
      <MatchScene key={sceneKey} running={running} homeColor={home.colors[0]} homeSecondaryColor={home.colors[1]} awayColor={away.colors[0]} awaySecondaryColor={away.colors[1]} weather={weather} weatherIntensity={weatherIntensity} timeOfDay={timeOfDay} cameraMode={sceneCamera} difficulty={difficulty} quality={quality} replayToken={replayToken} replayActive={replayActive} matchProgress={progress} presentationPhase={phase} celebrationTeam={celebration} cameraShake={cameraShake} onGoal={onGoal} onEvent={setMessage} onAction={onAction} onTelemetry={setTelemetry} />
      {phaseLabel && <div className={`cinematic-package package-${phase}`}><span>ETHIOPIA FOOTBALL UNIVERSE</span><strong>{phaseLabel}</strong><div className="cinematic-score">{home.shortName} {score.home} — {score.away} {away.shortName}</div><small>{phase === 'intro' ? 'LIVE FROM ADDIS ABABA' : phase === 'fulltime' ? (score.home === score.away ? 'HONOURS EVEN' : `${score.home > score.away ? home.name : away.name} WIN`) : 'SECOND HALF PREPARING'}</small></div>}
      {showStats && <aside className="live-stats-panel"><div className="live-stats-head"><span><BarChart3 size={14} /> LIVE MATCH DATA</span><button onClick={() => setShowStats(false)}>×</button></div><div className="territory-labels"><b>{home.shortName} {telemetry.homeTerritory}%</b><span>TERRITORY</span><b>{telemetry.awayTerritory}% {away.shortName}</b></div><div className="territory-bar"><i style={{ width: `${telemetry.homeTerritory}%`, background: home.colors[0] }} /><i style={{ width: `${telemetry.awayTerritory}%`, background: away.colors[0] }} /></div><div className="live-stat-row"><span>Shots</span><strong>{actions.homeShots}</strong><strong>{actions.awayShots}</strong></div><div className="live-stat-row"><span>Passes</span><strong>{actions.homePasses}</strong><strong>{actions.awayPasses}</strong></div><div className="live-stat-metrics"><div><small>Ball speed</small><b>{telemetry.ballSpeed} km/h</b></div><div><small>Distance</small><b>{telemetry.controlledDistance} m</b></div><div><small>Stamina</small><b>{telemetry.stamina}%</b></div></div></aside>}
      <div className="broadcast-lower-third"><span><Gamepad2 size={14} /> WASD MOVE</span><span>SHIFT SPRINT</span><span>E PASS</span><span>SPACE SHOOT</span></div><div className="broadcast-tech-strip"><span><Sparkles size={12} /> {quality.toUpperCase()}</span><span>{weather.toUpperCase()} {Math.round(weatherIntensity * 100)}%</span><span>{timeOfDay.toUpperCase()}</span></div>
      <button className="stats-button" onClick={() => setShowStats((value) => !value)}><BarChart3 size={16} /></button><button className="fullscreen-button" onClick={() => void shellRef.current?.requestFullscreen?.()}><Expand size={16} /></button>
      <div className="game-controls-overlay"><div className="touch-dpad mobile-game-controls">{[['w','▲'],['a','◀'],['d','▶'],['s','▼']].map(([key,label]) => <button key={key} onPointerDown={() => dispatchKey(key, true)} onPointerUp={() => dispatchKey(key, false)}>{label}</button>)}</div><div className="touch-actions mobile-game-controls"><button onPointerDown={() => dispatchKey('e', true)} onPointerUp={() => dispatchKey('e', false)}>PASS</button><button onPointerDown={() => dispatchKey(' ', true)} onPointerUp={() => dispatchKey(' ', false)}>SHOOT</button></div></div>
    </section>

    <section className="match-toolbar panel match-toolbar-3d phase-three-toolbar">
      <div className="match-primary-actions"><button className="primary-button" onClick={() => running ? (setRunning(false), setMessage('Match paused')) : void start()} disabled={replayActive || ['intro','halftime','fulltime'].includes(phase)}>{running ? <CirclePause size={18} /> : <CirclePlay size={18} />}{running ? 'Pause' : score.time ? 'Resume' : 'Start broadcast'}</button><button className="secondary-button replay-button" onClick={() => replay('Manual instant replay')} disabled={!score.time || replayActive || phase !== 'live'}><Film size={17} /> Replay</button><button className="secondary-button" onClick={reset}><RotateCcw size={17} /> Reset</button></div>
      <div className="camera-picker">{([['broadcast',Video,'Broadcast'],['auto',WandSparkles,'Director'],['follow',Gamepad2,'Follow'],['ball',Camera,'Ball'],['free',Expand,'Free 8D']] as const).map(([mode, Icon, label]) => <button key={mode} className={cameraMode === mode ? 'active' : ''} onClick={() => setCameraMode(mode)} disabled={replayActive}><Icon size={16} /><span>{label}</span></button>)}</div>
      <div className="match-environment-controls phase-three-controls">
        <label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}><option>Academy</option><option>Professional</option><option>Legendary</option></select></label>
        <label>Light<select value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value as TimeOfDay)}><option value="dynamic">Dynamic</option><option value="afternoon">Afternoon</option><option value="golden">Golden hour</option><option value="night">Night</option></select></label>
        <label>Graphics<select value={quality} onChange={(event) => setQuality(event.target.value as QualityLevel)}><option value="performance">Performance</option><option value="balanced">Balanced</option><option value="ultra">Ultra</option></select></label>
        <div className="weather-picker">{([['clear',Sun],['overcast',Cloud],['rain',CloudRain],['wind',Wind]] as const).map(([value, Icon]) => <button key={value} className={weather === value ? 'active' : ''} onClick={() => setWeather(value)}><Icon size={17} /></button>)}</div>
        <label className="range-control">Weather<input type="range" min="0.2" max="1" step="0.05" value={weatherIntensity} onChange={(event) => setWeatherIntensity(Number(event.target.value))} /></label>
        <button className={`sound-toggle ${audioEnabled ? 'active' : ''}`} onClick={() => setAudioEnabled((value) => !value)}>{audioEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
        <label className="range-control">Volume<input type="range" min="0" max="1" step="0.05" value={audioVolume} onChange={(event) => setAudioVolume(Number(event.target.value))} /></label>
        <label className="toggle-control"><input type="checkbox" checked={cameraShake} onChange={(event) => setCameraShake(event.target.checked)} /><span>Camera shake</span></label>
      </div>
    </section>
    <div className="dashboard-grid three phase-three-stats"><article className="stat-panel panel"><Activity /><div><span>Athlete polish</span><strong>Expressions and fatigue</strong><small>Blinking, sweat, dirt, effort and celebrations</small></div></article><article className="stat-panel panel"><Shield /><div><span>Atmosphere</span><strong>Dynamic light, weather and audio</strong><small>Clouds, lightning, crowd tension and whistles</small></div></article><article className="stat-panel panel"><Trophy /><div><span>Broadcast</span><strong>Opening, intervals and telemetry</strong><small>Cinematic cameras, instant replay and live statistics</small></div></article></div>
    {records.length > 0 && <section className="panel history-panel"><div className="panel-heading"><h2>Recent results</h2><button className="text-button" onClick={() => setRecords([])}>Clear history</button></div>{records.map((record) => <div className="history-row" key={record.id}><span>{new Date(record.date).toLocaleDateString()}</span><strong>{record.home}</strong><b>{record.homeScore} — {record.awayScore}</b><strong>{record.away}</strong></div>)}</section>}
  </div>
}
