import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdaptiveDpr, Sky, SoftShadows } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Football } from './Ball'
import { CameraRig } from './CameraRig'
import { CinematicAtmosphere } from './CinematicAtmosphere'
import { FORMATION, HALF_LENGTH, PLAYER_HEIGHT } from './config'
import { Pitch } from './Pitch'
import { PlayerAvatar } from './PlayerAvatar'
import { QUALITY_PRESETS } from './quality'
import { Stadium } from './Stadium'
import { SurfaceEffects } from './SurfaceEffects'
import type { MatchAction, MatchSceneProps, TeamSide, TimeOfDay } from './types'
import { useUniversalInput } from '../input/useUniversalInput'
import { createHumanWorld, updateHumanTelemetry, type HumanWorldBundle } from '../human/world'
import { WorldLayer } from '../world/WorldLayer'
import { DEFAULT_COMPETITIVE_SETTINGS } from '../phase5/catalog'
import { CompetitiveMatchDirector } from '../phase5/engine'
import { CompetitiveOverlay } from '../phase5/CompetitiveOverlay'
import { MatchIntelligenceLayer } from '../phase5/MatchIntelligenceLayer'
import type { CompetitiveMatchState, Phase5BallContact, Phase5FoulContact } from '../phase5/types'
import './phase4.css'
import '../human/human.css'
import '../phase5/phase5.css'

type FixedTime = Exclude<TimeOfDay, 'dynamic'>

function fixedTime(time: TimeOfDay, progress: number): FixedTime {
  if (time !== 'dynamic') return time
  return progress < 0.46 ? 'afternoon' : progress < 0.78 ? 'golden' : 'night'
}

function lightState(time: FixedTime) {
  if (time === 'night' || time === 'late-night') return { bg: '#050b15', hemi: '#607695', ambient: 0.5, sun: '#aac5e7', power: 0.45, pos: [12, 38, 25] as [number, number, number], sky: [0, -2, 0] as [number, number, number] }
  if (time === 'evening') return { bg: '#17233a', hemi: '#7788a2', ambient: 0.68, sun: '#d7dff1', power: 0.8, pos: [-24, 25, -30] as [number, number, number], sky: [-4, -1, 0] as [number, number, number] }
  if (time === 'golden' || time === 'sunset') return { bg: '#d98d60', hemi: '#f4c792', ambient: 1.08, sun: '#ffb866', power: 4.4, pos: [-50, 19, -28] as [number, number, number], sky: [-8, 1.5, -4] as [number, number, number] }
  if (time === 'dawn') return { bg: '#9b9fc4', hemi: '#d8c8ca', ambient: 0.92, sun: '#ffcfad', power: 2.2, pos: [-44, 13, 18] as [number, number, number], sky: [-8, 0.4, 2] as [number, number, number] }
  if (time === 'morning') return { bg: '#a8d2ec', hemi: '#dcecff', ambient: 1.32, sun: '#ffe6bd', power: 3.2, pos: [-46, 34, 24] as [number, number, number], sky: [5, 2, 1] as [number, number, number] }
  if (time === 'midday') return { bg: '#78bde9', hemi: '#e1f3ff', ambient: 1.65, sun: '#fff8df', power: 4.1, pos: [-8, 66, 12] as [number, number, number], sky: [2, 9, 0] as [number, number, number] }
  return { bg: '#8ec8ed', hemi: '#cfe7ff', ambient: 1.55, sun: '#fff3d4', power: 3.7, pos: [-38, 52, 22] as [number, number, number], sky: [7, 4, -3] as [number, number, number] }
}

function Rain({ count, intensity }: { count: number; intensity: number }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3)
    for (let index = 0; index < count; index += 1) {
      values[index * 3] = (Math.random() - 0.5) * 125
      values[index * 3 + 1] = Math.random() * 38 + 1
      values[index * 3 + 2] = (Math.random() - 0.5) * 90
    }
    return values
  }, [count])
  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.position.y -= delta * (20 + intensity * 18)
    ref.current.position.x -= delta * 3
    if (ref.current.position.y < -38) ref.current.position.set(0, 0, 0)
  })
  return <points ref={ref} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#d8e9f4" size={0.05 + intensity * 0.035} transparent opacity={0.3 + intensity * 0.4} depthWrite={false} /></points>
}

interface RuntimeProps extends MatchSceneProps {
  ballRef: { current: RapierRigidBody | null }
  controlledPosition: { current: THREE.Vector3 }
  controlledIndex: number
  scoreGoal: (team: TeamSide) => void
  humanWorld: HumanWorldBundle
  director: CompetitiveMatchDirector
  setCompetitiveState: (state: CompetitiveMatchState) => void
}

function Runtime({ ballRef, controlledPosition, controlledIndex, scoreGoal, onTelemetry, weather, weatherIntensity, matchProgress, humanWorld, director, setCompetitiveState, ...props }: RuntimeProps) {
  const lastTelemetry = useRef(0)
  const lastPlayer = useRef(controlledPosition.current.clone())
  const distance = useRef(0)
  const rollCooldown = useRef(0)
  const previousVerticalSpeed = useRef(0)
  const humanTelemetryCooldown = useRef(0)
  const competitiveTelemetryCooldown = useRef(0)
  const lastManualRequest = useRef(0)
  const lastCompetitiveContact = useRef(0)
  const lastCollisionFoul = useRef(0)
  const previousCompetitiveVelocity = useMemo(() => new THREE.Vector3(), [])
  const ballPosition = useMemo(() => new THREE.Vector3(), [])
  const ballVelocity = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
    const ball = ballRef.current
    if (!ball) return
    rollCooldown.current = Math.max(0, rollCooldown.current - delta)
    humanTelemetryCooldown.current -= delta
    competitiveTelemetryCooldown.current -= delta
    const position = ball.translation()
    const velocity = ball.linvel()
    const angularVelocity = ball.angvel()
    ballPosition.set(position.x, position.y, position.z)
    ballVelocity.set(velocity.x, velocity.y, velocity.z)

    humanWorld.world.ballPosition.copy(ballPosition)
    humanWorld.world.ballVelocity.copy(ballVelocity)
    humanWorld.world.matchProgress = matchProgress
    humanWorld.world.weather = weather
    humanWorld.world.weatherIntensity = weatherIntensity
    humanWorld.world.scoreHome = props.scoreHome
    humanWorld.world.scoreAway = props.scoreAway
    humanWorld.world.eventPulse = props.replayToken

    if (props.manualRestartRequest && props.manualRestartRequest.id !== lastManualRequest.current) {
      lastManualRequest.current = props.manualRestartRequest.id
      director.requestManual(props.manualRestartRequest, matchProgress * 90)
    }

    const velocityChange = previousCompetitiveVelocity.distanceTo(ballVelocity)
    const closestPlayer = humanWorld.world.players.reduce<(typeof humanWorld.world.players)[number] | null>((best, player) => {
      if (!best) return player
      return player.position.distanceTo(ballPosition) < best.position.distanceTo(ballPosition) ? player : best
    }, null)
    if (closestPlayer && closestPlayer.position.distanceTo(ballPosition) < 1.45 && velocityChange > 0.9 && state.clock.elapsedTime - lastCompetitiveContact.current > 0.16) {
      const action = (['pass', 'shoot', 'clear', 'tackle', 'intercept', 'goalkeeper-claim'] as const).includes(closestPlayer.action as never)
        ? closestPlayer.action as Phase5BallContact['action']
        : ballVelocity.length() > 13 ? 'shoot' : ballVelocity.length() > 6 ? 'pass' : 'dribble'
      const receiver = action === 'pass'
        ? humanWorld.world.players.filter((player) => player.team === closestPlayer.team && player.id !== closestPlayer.id).sort((a, b) => a.position.distanceTo(ballPosition) - b.position.distanceTo(ballPosition))[0]
        : undefined
      director.registerContact({
        team: closestPlayer.team,
        playerId: closestPlayer.id,
        receiverId: receiver?.id,
        action,
        position: [ballPosition.x, ballPosition.y, ballPosition.z],
        ballSpeed: ballVelocity.length(),
        offsideRisk: closestPlayer.offsideRisk,
        timestamp: state.clock.elapsedTime,
      }, humanWorld.world.players, matchProgress * 90)
      lastCompetitiveContact.current = state.clock.elapsedTime
    }
    previousCompetitiveVelocity.copy(ballVelocity)

    if (state.clock.elapsedTime - lastCollisionFoul.current > 0.7) {
      outer: for (const player of humanWorld.world.players) {
        for (const opponent of humanWorld.world.players) {
          if (opponent.team === player.team || opponent.id === player.id) continue
          const distanceBetween = player.position.distanceTo(opponent.position)
          const relativeSpeed = player.velocity.clone().sub(opponent.velocity).length()
          if (distanceBetween < 0.62 && relativeSpeed > 5.6) {
            const severity = THREE.MathUtils.clamp(relativeSpeed / 10 + (1 - player.physical.balance) * 0.18, 0.35, 1)
            const foul: Phase5FoulContact = {
              team: player.team,
              playerId: player.id,
              opponentId: opponent.id,
              position: [player.position.x, player.position.y, player.position.z],
              assessment: {
                foul: true,
                severity,
                card: severity > 0.9 ? 'red' : severity > 0.62 ? 'yellow' : 'none',
                reason: severity > 0.9 ? 'dangerous' : severity > 0.68 ? 'reckless' : 'late',
              },
              lastDefender: Math.abs(opponent.position.x - (player.team === 'home' ? HALF_LENGTH : -HALF_LENGTH)) < 18,
              timestamp: state.clock.elapsedTime,
            }
            director.registerFoul(foul, { matchMinute: matchProgress * 90, possession: director.snapshot().possession, ballPosition, ballVelocity })
            lastCollisionFoul.current = state.clock.elapsedTime
            break outer
          }
        }
      }
    }

    const competitiveResult = director.tick({
      now: state.clock.elapsedTime,
      delta,
      matchMinute: matchProgress * 90,
      difficulty: props.difficulty,
      quality: props.quality,
      scoreHome: props.scoreHome,
      scoreAway: props.scoreAway,
      running: props.running,
      ballPosition,
      ballVelocity,
      players: humanWorld.world.players,
    })

    for (const directive of competitiveResult.directives) {
      if (directive.position) ball.setTranslation({ x: directive.position[0], y: directive.position[1], z: directive.position[2] }, true)
      if (directive.type === 'freeze' || directive.type === 'place') {
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
      if (directive.type === 'impulse' && directive.impulse) {
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.applyImpulse({ x: directive.impulse[0], y: directive.impulse[1], z: directive.impulse[2] }, true)
        if (directive.torque) ball.applyTorqueImpulse({ x: directive.torque[0], y: directive.torque[1], z: directive.torque[2] }, true)
      }
    }
    for (const event of competitiveResult.events) {
      props.onCompetitiveEvent?.(event)
      props.onEvent(event.message)
      if (event.type === 'goal-confirmed' && event.team) scoreGoal(event.team)
    }

    distance.current += controlledPosition.current.distanceTo(lastPlayer.current)
    lastPlayer.current.copy(controlledPosition.current)
    const planarSpeed = Math.hypot(velocity.x, velocity.z)
    if (planarSpeed > 0.8 && position.y < 0.5 && rollCooldown.current === 0) {
      props.onAudioEvent('ball-roll', { position: [position.x, position.y, position.z], speed: planarSpeed, spin: Math.hypot(angularVelocity.x, angularVelocity.y, angularVelocity.z), wetness: weather === 'rain' ? weatherIntensity : 0, camera: props.cameraMode })
      rollCooldown.current = 0.34
    }
    if (previousVerticalSpeed.current < -1.8 && velocity.y > 0.25 && position.y < 0.7) props.onAudioEvent('ball-bounce', { position: [position.x, position.y, position.z], force: Math.min(1, Math.abs(previousVerticalSpeed.current) / 8), wetness: weather === 'rain' ? weatherIntensity : 0 })
    previousVerticalSpeed.current = velocity.y

    if (weather === 'wind' || weather === 'storm') {
      const windForce = props.world.telemetry.windExposure
      ball.applyImpulse({ x: Math.sin(state.clock.elapsedTime * 0.31) * 0.0015 * windForce, y: 0, z: Math.sin(state.clock.elapsedTime * 0.42) * 0.0045 * (0.4 + weatherIntensity) * windForce }, true)
    }

    if (state.clock.elapsedTime - lastTelemetry.current > 0.45) {
      lastTelemetry.current = state.clock.elapsedTime
      const home = THREE.MathUtils.clamp(50 + (position.x / HALF_LENGTH) * 28, 18, 82)
      const controlledRuntime = humanWorld.world.players.find((player) => player.team === 'home' && player.index === controlledIndex)
      onTelemetry({ homeTerritory: Math.round(home), awayTerritory: Math.round(100 - home), ballSpeed: Math.round(Math.hypot(velocity.x, velocity.y, velocity.z) * 36) / 10, controlledDistance: Math.round(distance.current * 10) / 10, stamina: Math.round((1 - (controlledRuntime?.physical.fatigue ?? matchProgress * 0.5)) * 100) })
    }
    if (humanTelemetryCooldown.current <= 0) {
      updateHumanTelemetry(humanWorld)
      props.onHumanTelemetry({ ...humanWorld.telemetry, activeDecisions: { ...humanWorld.telemetry.activeDecisions } })
      humanTelemetryCooldown.current = 0.5
    }
    if (competitiveResult.changed || competitiveTelemetryCooldown.current <= 0) {
      const snapshot = director.snapshot()
      setCompetitiveState(snapshot)
      props.onCompetitiveState?.(snapshot)
      competitiveTelemetryCooldown.current = 0.2
    }
  })
  return null
}

export function MatchScene(props: MatchSceneProps) {
  const controls = useUniversalInput()
  const ballRef = useRef<RapierRigidBody>(null)
  const controlledPosition = useRef(new THREE.Vector3(FORMATION[9][0], PLAYER_HEIGHT / 2, FORMATION[9][1]))
  const [controlledIndex, setControlledIndex] = useState(9)
  const humanWorldRef = useRef<HumanWorldBundle | null>(null)
  const directorRef = useRef<CompetitiveMatchDirector | null>(null)
  if (!humanWorldRef.current) humanWorldRef.current = createHumanWorld(props.weather, props.weatherIntensity)
  const competitiveSettings = props.competitiveSettings ?? DEFAULT_COMPETITIVE_SETTINGS
  if (!directorRef.current) directorRef.current = new CompetitiveMatchDirector(competitiveSettings)
  const humanWorld = humanWorldRef.current
  const director = directorRef.current
  const [competitiveState, setCompetitiveState] = useState(() => director.snapshot())
  const onEvent = props.onEvent
  useEffect(() => director.updateSettings(competitiveSettings), [director, competitiveSettings])

  useEffect(() => {
    let frame = 0
    const watchPlayerSwitch = () => {
      if (controls.current.pressed.has('player-switch')) {
        controls.current.pressed.delete('player-switch')
        const ball = ballRef.current?.translation()
        const move = controls.current.move
        if (ball) {
          const candidates = humanWorld.world.players
            .filter((player) => player.team === 'home' && player.index !== controlledIndex)
            .map((player) => {
              const distance = Math.hypot(player.position.x - ball.x, player.position.z - ball.z)
              const directionX = player.position.x - controlledPosition.current.x
              const directionZ = player.position.z - controlledPosition.current.z
              const directionLength = Math.max(0.001, Math.hypot(directionX, directionZ))
              const directionalBias = move.magnitude > 0.15 ? 4 * (1 - ((directionX / directionLength) * move.x + (directionZ / directionLength) * move.z)) : 0
              return { index: player.index, score: distance + directionalBias + (player.role === 'goalkeeper' ? 9 : 0) }
            })
            .sort((a, b) => a.score - b.score)
          if (candidates[0]) {
            setControlledIndex(candidates[0].index)
            onEvent(`Manual player switch · #${candidates[0].index + 1}`)
          }
        }
      }
      frame = window.requestAnimationFrame(watchPlayerSwitch)
    }
    frame = window.requestAnimationFrame(watchPlayerSwitch)
    return () => window.cancelAnimationFrame(frame)
  }, [controlledIndex, controls, humanWorld, onEvent])

  const preset = QUALITY_PRESETS[props.quality]
  const time = fixedTime(props.timeOfDay, props.matchProgress)
  const light = lightState(time)
  const handleAction = useCallback((action: MatchAction, team: TeamSide) => props.onAction(action, team), [props])
  const handleGoal = useCallback((team: TeamSide) => props.onGoal(team), [props])
  const weatherBackground = props.weather === 'overcast' ? '#7f949d' : props.weather === 'rain' || props.weather === 'storm' ? '#637780' : props.weather === 'fog' ? '#aab1b0' : props.weather === 'snow' ? '#c8d4d8' : props.weather === 'dust' ? '#a9825d' : props.weather === 'heat' ? '#d7a46f' : light.bg

  return <div className="phase5-match-stage human-simulation-stage">
    <CompetitiveOverlay state={competitiveState} />
    <Canvas className="match-canvas" shadows dpr={preset.dpr} camera={{ position: [0, 26, 38], fov: 45, near: 0.1, far: 280 }} gl={{ antialias: preset.antialias, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: time === 'night' ? 0.86 : 1.04 }}>
      <color attach="background" args={[weatherBackground]} />
      <fog attach="fog" args={[weatherBackground, props.weather === 'fog' ? 18 : props.weather === 'rain' || props.weather === 'storm' ? 42 : 88, props.weather === 'fog' ? 86 : props.weather === 'rain' || props.weather === 'storm' ? 130 : 230]} />
      <Sky distance={230} sunPosition={light.sky} turbidity={props.weather === 'overcast' || props.weather === 'fog' || props.weather === 'dust' ? 18 : 8} rayleigh={props.weather === 'overcast' || props.weather === 'fog' ? 0.6 : 1.4} mieCoefficient={props.weather === 'rain' || props.weather === 'storm' || props.weather === 'fog' ? 0.018 : 0.006} />
      {preset.softShadows && <SoftShadows size={18} samples={14} focus={0.42} />}
      <hemisphereLight args={[light.hemi, '#163222', light.ambient]} />
      <directionalLight position={light.pos} color={light.sun} intensity={light.power} castShadow shadow-mapSize-width={preset.shadowMapSize} shadow-mapSize-height={preset.shadowMapSize} shadow-camera-left={-66} shadow-camera-right={66} shadow-camera-top={48} shadow-camera-bottom={-48} shadow-camera-far={125} shadow-bias={-0.00016} />
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} paused={!props.running} timeStep={1 / 60} interpolate>
          <Pitch weather={props.weather} quality={props.quality} eventPulse={props.replayToken} world={props.world} />
          <Stadium timeOfDay={time} weather={props.weather} quality={props.quality} difficulty={props.difficulty} eventPulse={props.replayToken} world={props.world} />
          <WorldLayer world={props.world} homeName={props.homeName} awayName={props.awayName} homeColor={props.homeColor} awayColor={props.awayColor} eventPulse={props.replayToken} />
          <MatchIntelligenceLayer state={competitiveState} settings={competitiveSettings} />
          <Football ref={ballRef} weather={props.weather} quality={props.quality} world={props.world} />
          {(['home', 'away'] as const).flatMap((team) => FORMATION.map(([x, z], index) => <PlayerAvatar key={`${team}-${index}`} index={index} team={team} position={team === 'home' ? [x, PLAYER_HEIGHT / 2, z] : [-x, PLAYER_HEIGHT / 2, -z]} color={team === 'home' ? props.homeColor : props.awayColor} secondaryColor={team === 'home' ? props.homeSecondaryColor : props.awaySecondaryColor} controlled={team === 'home' && index === controlledIndex} running={props.running && props.cameraMode !== 'free' && !props.replayActive} difficulty={props.difficulty} quality={props.quality} controls={controls} ballRef={ballRef} controlledPosition={controlledPosition} matchProgress={props.matchProgress} presentationPhase={props.presentationPhase} celebrationTeam={props.celebrationTeam} weather={props.weather} weatherIntensity={props.weatherIntensity} scoreHome={props.scoreHome} scoreAway={props.scoreAway} humanWorld={humanWorld} onEvent={props.onEvent} onAction={handleAction} onSoundEvent={props.onAudioEvent} />))}
          <SurfaceEffects ballRef={ballRef} controlledPosition={controlledPosition} quality={props.quality} weather={props.weather} />
          <Runtime {...props} scoreGoal={handleGoal} ballRef={ballRef} controlledPosition={controlledPosition} controlledIndex={controlledIndex} humanWorld={humanWorld} director={director} setCompetitiveState={setCompetitiveState} />
        </Physics>
      </Suspense>
      <CinematicAtmosphere timeOfDay={props.timeOfDay} weather={props.weather} weatherIntensity={props.weatherIntensity} quality={props.quality} matchProgress={props.matchProgress} eventPulse={props.replayToken} presentationPhase={props.presentationPhase} />
      {(props.weather === 'rain' || props.weather === 'storm' || props.weather === 'snow') && <Rain count={Math.round(preset.rainDrops * (0.45 + props.weatherIntensity * 0.85))} intensity={props.weather === 'snow' ? props.weatherIntensity * 0.45 : props.weatherIntensity} />}
      <CameraRig mode={props.cameraMode} replayToken={props.replayToken} replayActive={props.replayActive} quality={props.quality} presentationPhase={props.presentationPhase} matchProgress={props.matchProgress} cameraShake={props.cameraShake} ballRef={ballRef} controlledPosition={controlledPosition} controls={controls} />
      <AdaptiveDpr pixelated={props.quality === 'performance'} />
    </Canvas>
  </div>
}
