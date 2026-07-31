import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import {
  Activity,
  BarChart3,
  Camera,
  CirclePause,
  CirclePlay,
  Cloud,
  CloudRain,
  Expand,
  Film,
  Gamepad2,
  Radio,
  RotateCcw,
  Shield,
  Sparkles,
  Sun,
  Trophy,
  Video,
  Volume2,
  VolumeX,
  WandSparkles,
  Wind,
} from 'lucide-react'
import { premierClubs } from '../data/clubs'
import { MatchScene } from '../game/MatchScene'
import { AudioDebugOverlay } from '../audio/AudioDebugOverlay'
import { AudioSettingsPanel } from '../audio/AudioSettingsPanel'
import { useGlobalAudio } from '../audio/AudioProvider'
import { useFootballAudio } from '../audio/useFootballAudio'
import type {
  Difficulty,
  LiveCameraMode,
  MatchAction,
  MatchTelemetry,
  PresentationPhase,
  QualityLevel,
  TeamSide,
  TimeOfDay,
  Weather,
} from '../game/types'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { MatchRecord } from '../types'
import type { HumanTelemetry } from '../human/types'
import { DEFAULT_WORLD_SELECTION } from '../world/catalog'
import { createMatchWorld } from '../world/engine'
import { WorldControlPanel } from '../world/WorldControlPanel'
import type { WorldSelection } from '../world/types'
import '../world/world.css'

const MATCH_MINUTES_PER_SECOND = 4.5
const REPLAY_DURATION_MS = 4400
const INTRO_DURATION_MS = 5800
const HALFTIME_DURATION_MS = 3400

const INITIAL_TELEMETRY: MatchTelemetry = {
  homeTerritory: 50,
  awayTerritory: 50,
  ballSpeed: 0,
  controlledDistance: 0,
  stamina: 100,
}

const INITIAL_HUMAN_TELEMETRY: HumanTelemetry = {
  averageFatigue: 0,
  averagePressure: 0,
  activeDecisions: {
    hold: 0,
    support: 0,
    press: 0,
    mark: 0,
    recover: 0,
    dribble: 0,
    pass: 0,
    shoot: 0,
    clear: 0,
    tackle: 0,
    intercept: 0,
    'goalkeeper-set': 0,
    'goalkeeper-dive': 0,
    'goalkeeper-claim': 0,
  },
  footSlipEvents: 0,
  ballContacts: 0,
  mistakes: 0,
  goalkeeperReactionMs: 0,
  maxPlayerSpeed: 0,
}

interface MatchActions {
  homePasses: number
  awayPasses: number
  homeShots: number
  awayShots: number
  homeSaves: number
  awaySaves: number
}

const INITIAL_ACTIONS: MatchActions = {
  homePasses: 0,
  awayPasses: 0,
  homeShots: 0,
  awayShots: 0,
  homeSaves: 0,
  awaySaves: 0,
}

function formatClock(time: number) {
  const minutes = Math.floor(time).toString().padStart(2, '0')
  const seconds = Math.floor((time % 1) * 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function MatchView() {
  const shellRef = useRef<HTMLElement>(null)
  const completedRef = useRef(false)
  const halftimeRef = useRef(false)
  const replayTimerRef = useRef<number | null>(null)
  const phaseTimerRef = useRef<number | null>(null)
  const countdownTimerRef = useRef<number | null>(null)
  const replayResumeRef = useRef(false)
  const [running, setRunning] = useState(false)
  const [homeId, setHomeId] = useState(premierClubs[0].id)
  const [awayId, setAwayId] = useState(premierClubs[5].id)
  const [weather, setWeather] = useState<Weather>('clear')
  const [weatherIntensity, setWeatherIntensity] = useLocalStorage('efu-weather-intensity', 0.7)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('dynamic')
  const [cameraMode, setCameraMode] = useState<LiveCameraMode>('auto')
  const [difficulty, setDifficulty] = useState<Difficulty>('Professional')
  const [quality, setQuality] = useLocalStorage<QualityLevel>('efu-graphics-quality', 'balanced')
  const [cameraShake, setCameraShake] = useLocalStorage('efu-camera-shake', true)
  const [worldSelection, setWorldSelection] = useLocalStorage<WorldSelection>('efu-world-selection', DEFAULT_WORLD_SELECTION)
  const [showAudioSettings, setShowAudioSettings] = useState(false)
  const [showAudioDebug, setShowAudioDebug] = useState(false)
  const [sceneKey, setSceneKey] = useState(0)
  const [replayToken, setReplayToken] = useState(0)
  const [replayActive, setReplayActive] = useState(false)
  const [presentationPhase, setPresentationPhase] = useState<PresentationPhase>('idle')
  const [celebrationTeam, setCelebrationTeam] = useState<TeamSide | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [score, setScore] = useState({ home: 0, away: 0, time: 0 })
  const [actions, setActions] = useState<MatchActions>(INITIAL_ACTIONS)
  const [telemetry, setTelemetry] = useState<MatchTelemetry>(INITIAL_TELEMETRY)
  const [humanTelemetry, setHumanTelemetry] = useState<HumanTelemetry>(INITIAL_HUMAN_TELEMETRY)
  const [message, setMessage] = useState('Ready for broadcast')
  const [records, setRecords] = useLocalStorage<MatchRecord[]>('efu-match-history', [])
  const home = useMemo(() => premierClubs.find((item) => item.id === homeId) ?? premierClubs[0], [homeId])
  const away = useMemo(() => premierClubs.find((item) => item.id === awayId) ?? premierClubs[1], [awayId])
  const matchProgress = Math.min(1, score.time / 90)
  const patchWorldSelection = useCallback((patch: Partial<WorldSelection>) => setWorldSelection((current) => ({ ...current, ...patch })), [setWorldSelection])
  const world = useMemo(() => createMatchWorld({
    selection: worldSelection,
    weather,
    weatherIntensity,
    timeOfDay,
    matchMinute: score.time,
    scoreHome: score.home,
    scoreAway: score.away,
    presentationPhase,
    quality,
    homePopularity: 0.78,
    awayPopularity: 0.7,
    homeForm: 0.58,
    rivalry: worldSelection.importance === 'derby' ? 1 : worldSelection.importance === 'final' ? 0.72 : 0.28,
    ticketPriceIndex: 0.52,
    dayTimeAccessibility: ['night', 'late-night'].includes(timeOfDay) ? 0.62 : 0.86,
    economicIndex: 0.62,
    recentMatches: 2,
    slides: humanTelemetry.footSlipEvents,
    eventPulse: replayToken > 0 ? 1 : 0,
    lastEvent: message,
  }), [humanTelemetry.footSlipEvents, message, presentationPhase, quality, replayToken, score.away, score.home, score.time, timeOfDay, weather, weatherIntensity, worldSelection])
  const { settings: audioSettings, patch: patchAudioSettings, reset: resetAudioSettings } = useGlobalAudio()
  const audio = useFootballAudio(audioSettings, {
    homeId: home.id,
    awayId: away.id,
    homeName: home.amharicName ?? home.name,
    awayName: away.amharicName ?? away.name,
    stadiumName: world.venue.name,
    competition: world.competition.name,
  })
  const commentaryCaption = audio.caption
  const commentarySupported = audio.speechSupported

  const clearPhaseTimers = useCallback(() => {
    if (phaseTimerRef.current !== null) window.clearTimeout(phaseTimerRef.current)
    if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current)
    phaseTimerRef.current = null
    countdownTimerRef.current = null
  }, [])

  const stopReplay = useCallback(() => {
    if (replayTimerRef.current !== null) window.clearTimeout(replayTimerRef.current)
    replayTimerRef.current = null
    setReplayActive(false)
  }, [])

  const reset = useCallback(() => {
    stopReplay()
    clearPhaseTimers()
    completedRef.current = false
    halftimeRef.current = false
    replayResumeRef.current = false
    setSceneKey((value) => value + 1)
    setReplayToken(0)
    setPresentationPhase('idle')
    setCelebrationTeam(null)
    setCountdown(null)
    setScore({ home: 0, away: 0, time: 0 })
    setActions(INITIAL_ACTIONS)
    setTelemetry(INITIAL_TELEMETRY)
    setHumanTelemetry(INITIAL_HUMAN_TELEMETRY)
    setMessage('Ready for broadcast')
    setRunning(false)
    audio.setCrowd({ intensity: 0.26, tension: 0.15, attackThreat: 0, momentum: 0 })
    audio.setSnapshot('pre-match', 0.4)
    audio.clearVoices()
  }, [audio, clearPhaseTimers, stopReplay])

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
    audio.emit('replay-start', { matchMinute: score.time, scoreHome: score.home, scoreAway: score.away, replay: true })
    audio.setSnapshot('replay', 0.16)
    replayTimerRef.current = window.setTimeout(() => {
      setReplayActive(false)
      audio.emit('replay-end', { matchMinute: score.time, replay: false })
      audio.setSnapshot('normal-match', 0.45)
      setCelebrationTeam(null)
      replayTimerRef.current = null
      if (replayResumeRef.current && !completedRef.current) {
        setPresentationPhase('live')
        setRunning(true)
        setMessage('Live play')
      }
    }, REPLAY_DURATION_MS)
  }, [audio, running, score.away, score.home, score.time])

  const handleGoal = useCallback((team: TeamSide) => {
    setScore((current) => ({ ...current, [team]: current[team] + 1 }))
    setCelebrationTeam(team)
    audio.emit('goal-scored', { team, matchMinute: score.time, scoreHome: score.home, scoreAway: score.away, importance: 0.72, tension: 0.9 })
    audio.setCrowd({ intensity: 1, tension: 0.82, momentum: team === 'home' ? 1 : -1, attackThreat: 0.3 })
    beginReplay(`${team === 'home' ? home.shortName : away.shortName} goal · cinematic replay`)
  }, [audio, away.shortName, beginReplay, home.shortName, score.away, score.home, score.time])

  const handleAction = useCallback((action: MatchAction, team: TeamSide) => {
    setActions((current) => {
      if (action === 'pass') {
        return team === 'home'
          ? { ...current, homePasses: current.homePasses + 1 }
          : { ...current, awayPasses: current.awayPasses + 1 }
      }
      if (action === 'save') {
        return team === 'home'
          ? { ...current, homeSaves: current.homeSaves + 1 }
          : { ...current, awaySaves: current.awaySaves + 1 }
      }
      return team === 'home'
        ? { ...current, homeShots: current.homeShots + 1 }
        : { ...current, awayShots: current.awayShots + 1 }
    })
    if (action === 'pass') audio.emit('pass-completed', { team, matchMinute: score.time, scoreHome: score.home, scoreAway: score.away, force: 0.48 })
    else if (action === 'save') audio.emit('save-made', { team, matchMinute: score.time, scoreHome: score.home, scoreAway: score.away, force: 0.8 })
    else audio.emit('shot-taken', { team, matchMinute: score.time, scoreHome: score.home, scoreAway: score.away, force: 0.88, speed: telemetry.ballSpeed })
  }, [audio, score.away, score.home, score.time, telemetry.ballSpeed])

  const startOpeningSequence = useCallback(async () => {
    await audio.ensureStarted()
    clearPhaseTimers()
    setRunning(false)
    setPresentationPhase('intro')
    setMessage(`Live from ${world.venue.name}`)
    audio.setSnapshot('pre-match', 0.35)
    audio.emit('match-started', { scoreHome: score.home, scoreAway: score.away, importance: world.competition.prestige })
    audio.announceWelcome()
    setCountdown(5)
    audio.setCrowd({ intensity: 0.48, importance: world.competition.prestige, capacityRatio: world.attendance.capacityRatio, tension: world.crowd.tension, derby: worldSelection.importance === 'derby' })
    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((current) => current === null ? null : Math.max(1, current - 1))
    }, 1000)
    phaseTimerRef.current = window.setTimeout(() => {
      clearPhaseTimers()
      setCountdown(null)
      setPresentationPhase('live')
      setMessage('Kick-off')
      audio.setSnapshot('normal-match', 0.28)
      audio.emit('kickoff', { scoreHome: score.home, scoreAway: score.away, matchMinute: 0 })
      setRunning(true)
    }, INTRO_DURATION_MS)
  }, [audio, clearPhaseTimers, score.away, score.home, world.attendance.capacityRatio, world.competition.prestige, world.crowd.tension, world.venue.name, worldSelection.importance])

  const toggleMatch = useCallback(async () => {
    if (replayActive || completedRef.current) return
    if (running) {
      setRunning(false)
      setMessage('Match paused')
      audio.setSnapshot('pause-menu', 0.25)
      return
    }
    if (score.time === 0 && presentationPhase === 'idle') {
      await startOpeningSequence()
      return
    }
    await audio.ensureStarted()
    setPresentationPhase('live')
    setMessage(score.time > 0 ? 'Match resumed' : 'Kick-off')
    if (score.time === 0) audio.emit('kickoff', { scoreHome: score.home, scoreAway: score.away, matchMinute: 0 })
    audio.setSnapshot('normal-match', 0.3)
    setRunning(true)
  }, [audio, presentationPhase, replayActive, running, score.away, score.home, score.time, startOpeningSequence])

  useEffect(() => () => {
    if (replayTimerRef.current !== null) window.clearTimeout(replayTimerRef.current)
    clearPhaseTimers()
  }, [clearPhaseTimers])

  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => {
      setScore((current) => ({ ...current, time: Math.min(90, current.time + MATCH_MINUTES_PER_SECOND / 10) }))
    }, 100)
    return () => window.clearInterval(interval)
  }, [running])

  useEffect(() => {
    if (score.time < 45 || score.time >= 90 || halftimeRef.current || presentationPhase !== 'live') return
    halftimeRef.current = true
    setRunning(false)
    setPresentationPhase('halftime')
    setMessage('Half-time')
    audio.emit('half-time', { scoreHome: score.home, scoreAway: score.away, matchMinute: 45 })
    audio.setSnapshot('half-time', 0.4)
    audio.setCrowd({ intensity: 0.36, tension: 0.28, attackThreat: 0 })
    phaseTimerRef.current = window.setTimeout(() => {
      phaseTimerRef.current = null
      if (completedRef.current) return
      setPresentationPhase('live')
      setMessage('Second half')
      audio.emit('second-half', { scoreHome: score.home, scoreAway: score.away, matchMinute: 45 })
      audio.setSnapshot('normal-match', 0.35)
      setRunning(true)
      audio.setCrowd({ intensity: 0.44, tension: 0.36 })
    }, HALFTIME_DURATION_MS)
  }, [audio, presentationPhase, score.away, score.home, score.time])

  useEffect(() => {
    if (score.time < 90 || completedRef.current) return
    completedRef.current = true
    clearPhaseTimers()
    stopReplay()
    setRunning(false)
    setPresentationPhase('fulltime')
    setMessage('Full time')
    setCelebrationTeam(score.home === score.away ? null : score.home > score.away ? 'home' : 'away')
    audio.emit('full-time', { scoreHome: score.home, scoreAway: score.away, matchMinute: 90, team: score.home === score.away ? undefined : score.home > score.away ? 'home' : 'away' })
    audio.announceResult(score.home, score.away)
    audio.setSnapshot('full-time', 0.28)
    audio.setCrowd({ intensity: 0.62, tension: 0.18, momentum: score.home === score.away ? 0 : score.home > score.away ? 1 : -1 })
    const record: MatchRecord = {
      id: crypto.randomUUID(),
      home: home.name,
      away: away.name,
      homeScore: score.home,
      awayScore: score.away,
      date: new Date().toISOString(),
    }
    setRecords((items) => [record, ...items].slice(0, 8))
  }, [audio, clearPhaseTimers, home.name, away.name, score.away, score.home, score.time, setRecords, stopReplay])

  useEffect(() => {
    if (!running || replayActive) return
    const tension = 0.27 + matchProgress * 0.15 + Math.min(0.1, Math.abs(score.home - score.away) * 0.03)
    audio.setCrowd({ intensity: tension + telemetry.homeTerritory / 500, tension: Math.min(1, tension + matchProgress * 0.25), attackThreat: Math.min(1, telemetry.ballSpeed / 55), momentum: Math.max(-1, Math.min(1, (score.home - score.away) / 2)) })
  }, [audio, matchProgress, replayActive, running, score.away, score.home, telemetry.ballSpeed, telemetry.homeTerritory])

  useEffect(() => {
    audio.setWeather(weather, weatherIntensity)
    if (weather === 'rain') audio.emit('weather-rain', { wetness: weatherIntensity, weather })
    else if (weather === 'wind') audio.emit('weather-wind', { weather, force: weatherIntensity })
  }, [audio, weather, weatherIntensity])


  const handleSceneEvent = useCallback((eventMessage: string) => {
    setMessage(eventMessage)
    if (eventMessage.toLowerCase().includes('restart')) audio.emit('ball-kicked', { scoreHome: score.home, scoreAway: score.away, matchMinute: score.time, force: 0.45 })
  }, [audio, score.away, score.home, score.time])

  const dispatchKey = (key: string, down: boolean) => {
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true }))
  }

  const enterFullscreen = () => {
    void shellRef.current?.requestFullscreen?.()
  }

  const sceneCameraMode = replayActive ? 'replay' : cameraMode
  const phaseLabel = presentationPhase === 'idle' ? 'pre-match' : presentationPhase

  return (
    <div className="view-stack match-view phase-three-view phase-four-view">
      <section className="page-title-row">
        <div>
          <span className="section-kicker">Living football world · competitions, venues, operations and atmosphere</span>
          <h1>Ethiopian Football World</h1>
          <p>Enter distinct competitions and Ethiopian venues with engineered surfaces, match-specific balls, dynamic attendance, intelligent supporter sections, active staff and benches, synchronized screens, cultural presentation, evolving weather and skippable ceremonies.</p>
        </div>
        <div className="title-actions"><span className="prototype-badge phase-three-badge phase-four-badge"><span /> LIVING WORLD · {world.competition.shortName}</span></div>
      </section>

      <section className="match-setup panel">
        <div className="team-selector">
          <span>HOME</span>
          <select value={homeId} onChange={(event) => changeTeam('home', event)}>
            {premierClubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
          </select>
          <div className="mini-crest" style={{ '--club-a': home.colors[0], '--club-b': home.colors[1] } as CSSProperties}>{home.shortName}</div>
        </div>
        <div className="match-versus"><small>{world.competition.broadcastStyle}</small><strong>VS</strong><span>{world.venue.city} · {world.venue.altitudeM.toLocaleString()} m</span></div>
        <div className="team-selector away">
          <span>AWAY</span>
          <select value={awayId} onChange={(event) => changeTeam('away', event)}>
            {premierClubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
          </select>
          <div className="mini-crest" style={{ '--club-a': away.colors[0], '--club-b': away.colors[1] } as CSSProperties}>{away.shortName}</div>
        </div>
      </section>

      <WorldControlPanel selection={worldSelection} patchSelection={patchWorldSelection} world={world} disabled={running || replayActive || presentationPhase === 'intro'} />

      <section
        ref={shellRef}
        className={`game-shell game-shell-3d phase-three-shell phase-four-shell quality-${quality} phase-${presentationPhase} ${replayActive ? 'is-replay' : ''} weather-${weather} venue-${world.venue.archetype}`}
      >
        <div className="world-broadcast-tag"><strong>{world.competition.shortName} · {world.venue.name}</strong><small>{world.surface.name} · {world.attendance.total.toLocaleString()} attendance · {world.phase}</small><div className="world-atmosphere-strip"><span>Grip {Math.round(world.pitch.grip * 100)}%</span><span>Crowd {Math.round(world.telemetry.crowdEnergy * 100)}%</span><span>{world.ball.name}</span></div></div>
        <div className="broadcast-scorebug phase-three-scorebug">
          <div className="broadcast-team"><i style={{ background: home.colors[0] }} />{home.shortName}</div>
          <strong>{score.home}</strong>
          <span className="broadcast-clock">{formatClock(score.time)}</span>
          <strong>{score.away}</strong>
          <div className="broadcast-team away">{away.shortName}<i style={{ background: away.colors[0] }} /></div>
        </div>

        <div className="camera-status"><Camera size={13} /><span>{sceneCameraMode} · {phaseLabel}</span></div>
        {replayActive && <div className="replay-watermark"><Film size={14} /> INSTANT REPLAY</div>}
        <div className="match-event-banner">{message}</div>
        {commentaryCaption && (
          <div className="audio-caption" role="status" aria-live="polite">
            <small><Radio size={12} /> LIVE {audioSettings.commentaryLanguage.toUpperCase()} · PRIORITY {audio.commentaryPriority}</small>
            <strong>{commentaryCaption}</strong>
          </div>
        )}
        {audioSettings.visualIndicators && audio.profile?.lastEvents[0] && <div className="sound-indicator">◉ {audio.profile.lastEvents[0]}</div>}

        <MatchScene
          key={sceneKey}
          running={running}
          homeName={home.shortName}
          awayName={away.shortName}
          world={world}
          homeColor={home.colors[0]}
          homeSecondaryColor={home.colors[1]}
          awayColor={away.colors[0]}
          awaySecondaryColor={away.colors[1]}
          weather={weather}
          weatherIntensity={weatherIntensity}
          timeOfDay={timeOfDay}
          cameraMode={sceneCameraMode}
          difficulty={difficulty}
          quality={quality}
          replayToken={replayToken}
          replayActive={replayActive}
          matchProgress={matchProgress}
          presentationPhase={presentationPhase}
          celebrationTeam={celebrationTeam}
          cameraShake={cameraShake}
          scoreHome={score.home}
          scoreAway={score.away}
          onGoal={handleGoal}
          onEvent={handleSceneEvent}
          onAction={handleAction}
          onTelemetry={setTelemetry}
          onHumanTelemetry={setHumanTelemetry}
          onAudioEvent={(event, context) => audio.emit(event, { ...context, scoreHome: score.home, scoreAway: score.away, matchMinute: score.time })}
        />

        {(presentationPhase === 'intro' || presentationPhase === 'halftime' || presentationPhase === 'fulltime') && (
          <div className={`cinematic-package package-${presentationPhase}`}>
            {presentationPhase === 'intro' && (
              <>
                <span>ETHIOPIA FOOTBALL UNIVERSE</span>
                <div className="cinematic-matchup">
                  <strong>{home.shortName}</strong><em>{countdown ?? 'LIVE'}</em><strong>{away.shortName}</strong>
                </div>
                <small>{world.competition.name.toUpperCase()} · {world.venue.city.toUpperCase()}</small>
              </>
            )}
            {presentationPhase === 'halftime' && (
              <><span>HALF-TIME</span><strong>{home.shortName} {score.home} — {score.away} {away.shortName}</strong><small>Second half preparing</small></>
            )}
            {presentationPhase === 'fulltime' && (
              <><span>FULL-TIME</span><strong>{home.shortName} {score.home} — {score.away} {away.shortName}</strong><small>{score.home === score.away ? 'Honours even' : `${score.home > score.away ? home.name : away.name} win`}</small></>
            )}
          </div>
        )}

        {showStats && (
          <aside className="live-stats-panel">
            <div className="live-stats-head"><span><BarChart3 size={14} /> LIVE MATCH DATA</span><button onClick={() => setShowStats(false)}>×</button></div>
            <div className="territory-labels"><b>{home.shortName} {telemetry.homeTerritory}%</b><span>ATTACKING TERRITORY</span><b>{telemetry.awayTerritory}% {away.shortName}</b></div>
            <div className="territory-bar"><i style={{ width: `${telemetry.homeTerritory}%`, background: home.colors[0] }} /><i style={{ width: `${telemetry.awayTerritory}%`, background: away.colors[0] }} /></div>
            <div className="live-stat-row"><span>Shots</span><strong>{actions.homeShots}</strong><strong>{actions.awayShots}</strong></div>
            <div className="live-stat-row"><span>Passes</span><strong>{actions.homePasses}</strong><strong>{actions.awayPasses}</strong></div>
            <div className="live-stat-row"><span>Saves</span><strong>{actions.homeSaves}</strong><strong>{actions.awaySaves}</strong></div>
            <div className="live-stat-metrics">
              <div><small>Ball speed</small><b>{telemetry.ballSpeed} km/h</b></div>
              <div><small>Distance</small><b>{telemetry.controlledDistance} m</b></div>
              <div><small>Stamina</small><b>{telemetry.stamina}%</b></div>
              <div><small>Human fatigue</small><b>{Math.round(humanTelemetry.averageFatigue * 100)}%</b></div>
              <div><small>Pressure</small><b>{Math.round(humanTelemetry.averagePressure * 100)}%</b></div>
              <div><small>Physical contacts</small><b>{humanTelemetry.ballContacts}</b></div>
              <div><small>Organic mistakes</small><b>{humanTelemetry.mistakes}</b></div>
              <div><small>GK reaction</small><b>{humanTelemetry.goalkeeperReactionMs || '—'} ms</b></div>
              <div><small>Max player speed</small><b>{(humanTelemetry.maxPlayerSpeed * 3.6).toFixed(1)} km/h</b></div>
            </div>
            <div className="human-decision-grid">
              {Object.entries(humanTelemetry.activeDecisions).filter(([, count]) => count > 0).map(([action, count]) => <span key={action}><b>{count}</b>{action}</span>)}
            </div>
            <div className="world-data-grid"><div><small>Attendance</small><b>{world.attendance.total.toLocaleString()}</b></div><div><small>Pitch grip</small><b>{Math.round(world.pitch.grip * 100)}%</b></div><div><small>Moisture</small><b>{Math.round(world.pitch.moisture * 100)}%</b></div><div><small>Divots</small><b>{Math.round(world.pitch.divots * 100)}%</b></div><div><small>Media</small><b>{world.staff.cameraOperators} cameras</b></div></div>
          </aside>
        )}

        <div className="broadcast-lower-third">
          <span><Gamepad2 size={14} /> WASD MOVE</span><span>SHIFT SPRINT</span><span>E PASS</span><span>SPACE SHOOT</span><span>F TACKLE</span>{cameraMode === 'free' && <span>Q / R VERTICAL</span>}
        </div>
        <div className="broadcast-tech-strip"><span><Sparkles size={12} /> {quality.toUpperCase()}</span><span>{weather.toUpperCase()} {Math.round(weatherIntensity * 100)}%</span><span>{timeOfDay.toUpperCase()}</span></div>

        <button className="stats-button" onClick={() => setShowStats((value) => !value)} title="Toggle live statistics"><BarChart3 size={16} /></button>
        <button className="fullscreen-button" onClick={enterFullscreen} title="Enter fullscreen"><Expand size={16} /></button>

        <div className="game-controls-overlay">
          <div className="touch-dpad mobile-game-controls">
            <button onPointerDown={() => dispatchKey('w', true)} onPointerUp={() => dispatchKey('w', false)}>▲</button>
            <button onPointerDown={() => dispatchKey('a', true)} onPointerUp={() => dispatchKey('a', false)}>◀</button>
            <button onPointerDown={() => dispatchKey('d', true)} onPointerUp={() => dispatchKey('d', false)}>▶</button>
            <button onPointerDown={() => dispatchKey('s', true)} onPointerUp={() => dispatchKey('s', false)}>▼</button>
          </div>
          <div className="touch-actions mobile-game-controls">
            <button onPointerDown={() => dispatchKey('e', true)} onPointerUp={() => dispatchKey('e', false)}>PASS</button>
            <button onPointerDown={() => dispatchKey(' ', true)} onPointerUp={() => dispatchKey(' ', false)}>SHOOT</button>
            <button onPointerDown={() => dispatchKey('f', true)} onPointerUp={() => dispatchKey('f', false)}>TACKLE</button>
          </div>
        </div>
      </section>

      <section className="match-toolbar panel match-toolbar-3d phase-three-toolbar phase-four-toolbar">
        <div className="match-primary-actions">
          <button className="primary-button" onClick={() => void toggleMatch()} disabled={replayActive || presentationPhase === 'intro' || presentationPhase === 'halftime' || presentationPhase === 'fulltime'}>
            {running ? <CirclePause size={18} /> : <CirclePlay size={18} />}
            {running ? 'Pause' : score.time > 0 ? 'Resume' : 'Start broadcast'}
          </button>
          <button className="secondary-button replay-button" onClick={() => beginReplay('Manual instant replay')} disabled={score.time === 0 || replayActive || presentationPhase !== 'live'}><Film size={17} /> Replay</button>
          <button className="secondary-button" onClick={reset}><RotateCcw size={17} /> Reset</button>
        </div>

        <div className="camera-picker" aria-label="Camera mode">
          {([
            ['broadcast', Video, 'Broadcast'],
            ['auto', WandSparkles, 'Director'],
            ['follow', Gamepad2, 'Follow'],
            ['ball', Camera, 'Ball'],
            ['free', Expand, 'Free 8D'],
          ] as const).map(([mode, Icon, label]) => (
            <button key={mode} className={cameraMode === mode ? 'active' : ''} onClick={() => setCameraMode(mode)} title={`${label} camera`} disabled={replayActive}>
              <Icon size={16} /><span>{label}</span>
            </button>
          ))}
        </div>

        <div className="match-environment-controls phase-three-controls">
          <label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}><option>Academy</option><option>Professional</option><option>Legendary</option></select></label>
          <label>Light<select value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value as TimeOfDay)}><option value="dynamic">Dynamic match</option><option value="dawn">Dawn</option><option value="morning">Morning</option><option value="midday">Midday</option><option value="afternoon">Afternoon</option><option value="golden">Golden hour</option><option value="sunset">Sunset</option><option value="evening">Evening</option><option value="night">Night</option><option value="late-night">Late night</option></select></label>
          <label>Graphics<select value={quality} onChange={(event) => setQuality(event.target.value as QualityLevel)}><option value="performance">Performance</option><option value="balanced">Balanced</option><option value="ultra">Ultra</option></select></label>
          <div className="weather-picker">
            <button className={weather === 'clear' ? 'active' : ''} onClick={() => setWeather('clear')} title="Clear"><Sun size={17} /></button>
            <button className={weather === 'overcast' ? 'active' : ''} onClick={() => setWeather('overcast')} title="Overcast"><Cloud size={17} /></button>
            <button className={weather === 'rain' ? 'active' : ''} onClick={() => setWeather('rain')} title="Rain"><CloudRain size={17} /></button>
            <button className={weather === 'wind' ? 'active' : ''} onClick={() => setWeather('wind')} title="Wind"><Wind size={17} /></button>
          </div>
          <label>Weather type<select value={weather} onChange={(event) => setWeather(event.target.value as Weather)}><option value="clear">Clear</option><option value="overcast">Overcast</option><option value="rain">Rain</option><option value="wind">Wind</option><option value="storm">Thunderstorm</option><option value="fog">Fog</option><option value="snow">Snow</option><option value="heat">Extreme heat</option><option value="dust">Dust</option></select></label>
          <label className="range-control">Weather<input type="range" min="0.2" max="1" step="0.05" value={weatherIntensity} onChange={(event) => setWeatherIntensity(Number(event.target.value))} /></label>
          <button className={`sound-toggle ${audioSettings.enabled ? 'active' : ''}`} onClick={() => patchAudioSettings({ enabled: !audioSettings.enabled })} title="Toggle complete audio system">{audioSettings.enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
          <label className="range-control volume-control">Master<input type="range" min="0" max="1" step="0.02" value={audioSettings.master} onChange={(event) => patchAudioSettings({ master: Number(event.target.value) })} /></label>
          <button className={`sound-toggle commentary-toggle ${audioSettings.commentaryEnabled ? 'active' : ''}`} onClick={() => { patchAudioSettings({ commentaryEnabled: !audioSettings.commentaryEnabled }); void audio.ensureStarted() }} title={commentarySupported ? 'Toggle localized commentary' : 'Subtitles available; speech voice depends on browser support'}><Radio size={17} /></button>
          <button className="secondary-button audio-master-button" onClick={() => setShowAudioSettings(true)}><Volume2 size={15} /> Audio mix</button>
          <button className="secondary-button audio-debug-toggle" onClick={() => setShowAudioDebug((value) => !value)}>AUDIO DEBUG</button>
          <label className="toggle-control"><input type="checkbox" checked={cameraShake} onChange={(event) => setCameraShake(event.target.checked)} /><span>Camera shake</span></label>
        </div>
      </section>

      <div className="dashboard-grid three phase-three-stats">
        <article className="stat-panel panel"><Activity /><div><span>Human biomechanics runtime</span><strong>22 independent football agents</strong><small>Weight transfer, acceleration limits, turn radius, foot planting, surface traction, fatigue, balance and context-sensitive imperfection</small></div></article>
        <article className="stat-panel panel"><Shield /><div><span>Physical football intelligence</span><strong>Perception · utility AI · contact physics</strong><small>Passing lanes, pressure, support runs, marking, pressing, tackles, weak-foot errors and non-magnetic ball interaction</small></div></article>
        <article className="stat-panel panel"><Trophy /><div><span>Living match ecosystem</span><strong>{world.competition.name}</strong><small>{world.venue.architecture} {world.competition.visualIdentity}</small></div></article>
      </div>

      <AudioSettingsPanel settings={audioSettings} patch={patchAudioSettings} reset={resetAudioSettings} open={showAudioSettings} setOpen={setShowAudioSettings} />
      <AudioDebugOverlay profile={audio.profile} open={showAudioDebug} close={() => setShowAudioDebug(false)} trigger={(event) => audio.emit(event, { team: 'home', scoreHome: score.home, scoreAway: score.away, matchMinute: score.time, force: 0.85 })} />

      {records.length > 0 && (
        <section className="panel history-panel">
          <div className="panel-heading"><h2>Recent results</h2><button className="text-button" onClick={() => setRecords([])}>Clear history</button></div>
          {records.map((record) => (
            <div className="history-row" key={record.id}><span>{new Date(record.date).toLocaleDateString()}</span><strong>{record.home}</strong><b>{record.homeScore} — {record.awayScore}</b><strong>{record.away}</strong></div>
          ))}
        </section>
      )}
    </div>
  )
}
