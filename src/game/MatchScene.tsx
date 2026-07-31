import { Suspense, useCallback, useMemo, useRef } from 'react'
import { AdaptiveDpr, Sky, SoftShadows } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Football } from './Ball'
import { CameraRig } from './CameraRig'
import { CinematicAtmosphere } from './CinematicAtmosphere'
import { BALL_RADIUS, FORMATION, HALF_LENGTH, PLAYER_HEIGHT } from './config'
import { Pitch } from './Pitch'
import { PlayerAvatar } from './PlayerAvatar'
import { QUALITY_PRESETS } from './quality'
import { Stadium } from './Stadium'
import { SurfaceEffects } from './SurfaceEffects'
import type { MatchAction, MatchSceneProps, TeamSide, TimeOfDay } from './types'
import { useKeyboard } from './useKeyboard'
import { createHumanWorld, updateHumanTelemetry, type HumanWorldBundle } from '../human/world'
import { WorldLayer } from '../world/WorldLayer'
import { CoreMatchGameplayEngine } from '../core/engine'
import type { CorePlayerSnapshot } from '../core/types'
import './phase4.css'
import '../human/human.css'

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
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color="#d8e9f4" size={0.05 + intensity * 0.035} transparent opacity={0.3 + intensity * 0.4} depthWrite={false} />
    </points>
  )
}

interface RuntimeProps extends MatchSceneProps {
  ballRef: { current: RapierRigidBody | null }
  controlledPosition: { current: THREE.Vector3 }
  scoreGoal: (team: TeamSide) => void
  humanWorld: HumanWorldBundle
  coreEngine: CoreMatchGameplayEngine
}

function Runtime({ ballRef, controlledPosition, scoreGoal, onEvent, onTelemetry, weather, weatherIntensity, matchProgress, humanWorld, coreEngine, ...props }: RuntimeProps) {
  const cooldown = useRef(0)
  const lastTelemetry = useRef(0)
  const lastPlayer = useRef(controlledPosition.current.clone())
  const distance = useRef(0)
  const rollCooldown = useRef(0)
  const previousVerticalSpeed = useRef(0)
  const humanTelemetryCooldown = useRef(0)
  const lastTouchPlayerId = useRef<string | null>(null)
  const lastTouchTeam = useRef<TeamSide | null>(null)

  useFrame((state, delta) => {
    const ball = ballRef.current
    if (!ball) return
    cooldown.current = Math.max(0, cooldown.current - delta)
    rollCooldown.current = Math.max(0, rollCooldown.current - delta)
    humanTelemetryCooldown.current -= delta
    const position = ball.translation()
    const velocity = ball.linvel()
    const angularVelocity = ball.angvel()

    humanWorld.world.ballPosition.set(position.x, position.y, position.z)
    humanWorld.world.ballVelocity.set(velocity.x, velocity.y, velocity.z)
    humanWorld.world.matchProgress = matchProgress
    humanWorld.world.weather = weather
    humanWorld.world.weatherIntensity = weatherIntensity
    humanWorld.world.scoreHome = props.scoreHome
    humanWorld.world.scoreAway = props.scoreAway
    humanWorld.world.eventPulse = props.replayToken

    const touchingPlayer = humanWorld.world.players.find((player) => player.onBall)
    if (touchingPlayer) {
      lastTouchPlayerId.current = touchingPlayer.id
      lastTouchTeam.current = touchingPlayer.team
    }

    const corePlayers = humanWorld.world.players.flatMap<CorePlayerSnapshot>((player) => {
      const profile = humanWorld.profiles.get(player.id)
      if (!profile) return []
      return [{
        id: player.id,
        team: player.team,
        index: player.index,
        role: player.role,
        position: player.position,
        velocity: player.velocity,
        facing: player.facing,
        fatigue: player.physical.fatigue,
        balance: player.physical.balance,
        strength: profile.ability.strength,
        awareness: (profile.ability.vision + profile.ability.reactions) / 2,
        discipline: profile.personality.discipline,
        reaction: profile.ability.reactions,
        onBall: player.onBall,
        action: player.action,
      }]
    })
    const windStrength = (weather === 'wind' || weather === 'storm') ? weatherIntensity * props.world.telemetry.windExposure : 0
    const coreResult = coreEngine.tick({
      delta,
      simulationTime: state.clock.elapsedTime,
      matchMinute: props.matchMinute,
      running: props.running,
      scoreHome: props.scoreHome,
      scoreAway: props.scoreAway,
      weather,
      weatherIntensity,
      ball: {
        position,
        velocity,
        angularVelocity,
        radius: BALL_RADIUS,
        lastTouchPlayerId: lastTouchPlayerId.current,
        lastTouchTeam: lastTouchTeam.current,
      },
      players: corePlayers,
      surface: {
        grip: props.world.pitch.grip,
        rollingResistance: props.world.pitch.rollingResistance,
        restitution: props.world.pitch.bounce,
        wetness: props.world.pitch.moisture,
        unevenness: props.world.pitch.divots,
        altitudeMeters: props.world.venue.altitudeM,
        temperatureC: props.world.pitch.temperatureC,
        wind: { x: windStrength * 0.35, y: 0, z: windStrength },
      },
    })
    ball.applyImpulse({
      x: coreResult.environmentalAcceleration.x * delta,
      y: coreResult.environmentalAcceleration.y * delta,
      z: coreResult.environmentalAcceleration.z * delta,
    }, true)

    distance.current += controlledPosition.current.distanceTo(lastPlayer.current)
    lastPlayer.current.copy(controlledPosition.current)
    const planarSpeed = Math.hypot(velocity.x, velocity.z)
    if (planarSpeed > 0.8 && position.y < 0.5 && rollCooldown.current === 0) {
      props.onAudioEvent('ball-roll', {
        position: [position.x, position.y, position.z],
        speed: planarSpeed,
        spin: Math.hypot(angularVelocity.x, angularVelocity.y, angularVelocity.z),
        wetness: weather === 'rain' ? weatherIntensity : 0,
        camera: props.cameraMode,
      })
      rollCooldown.current = 0.34
    }
    if (previousVerticalSpeed.current < -1.8 && velocity.y > 0.25 && position.y < 0.7) {
      props.onAudioEvent('ball-bounce', {
        position: [position.x, position.y, position.z],
        force: Math.min(1, Math.abs(previousVerticalSpeed.current) / 8),
        wetness: weather === 'rain' ? weatherIntensity : 0,
      })
    }
    previousVerticalSpeed.current = velocity.y

    if (weather === 'wind' || weather === 'storm') {
      const windForce = props.world.telemetry.windExposure
      ball.applyImpulse({ x: Math.sin(state.clock.elapsedTime * 0.31) * 0.0015 * windForce, y: 0, z: Math.sin(state.clock.elapsedTime * 0.42) * 0.0045 * (0.4 + weatherIntensity) * windForce }, true)
    }

    if (state.clock.elapsedTime - lastTelemetry.current > 0.45) {
      lastTelemetry.current = state.clock.elapsedTime
      const home = THREE.MathUtils.clamp(50 + (position.x / HALF_LENGTH) * 28, 18, 82)
      const controlledRuntime = humanWorld.world.players.find((player) => player.id === 'home-9')
      onTelemetry({
        homeTerritory: Math.round(home),
        awayTerritory: Math.round(100 - home),
        ballSpeed: Math.round(Math.hypot(velocity.x, velocity.y, velocity.z) * 36) / 10,
        controlledDistance: Math.round(distance.current * 10) / 10,
        stamina: Math.round((1 - (controlledRuntime?.physical.fatigue ?? matchProgress * 0.5)) * 100),
        core: coreResult.telemetry,
      })
    }

    if (humanTelemetryCooldown.current <= 0) {
      updateHumanTelemetry(humanWorld)
      props.onHumanTelemetry({ ...humanWorld.telemetry, activeDecisions: { ...humanWorld.telemetry.activeDecisions } })
      humanTelemetryCooldown.current = 0.5
    }

    if (cooldown.current === 0 && coreResult.newRestart?.reason === 'goal' && coreResult.ruleDecision.goal) {
      const team = coreResult.ruleDecision.goal
      props.onAudioEvent('net-hit', {
        team,
        position: [position.x, position.y, position.z],
        force: Math.min(1, Math.hypot(velocity.x, velocity.y, velocity.z) / 18),
      })
      scoreGoal(team)
      onEvent(team === 'home' ? 'GOAL — home side!' : 'GOAL — away side!')
      ball.setTranslation({ x: 0, y: 0.28, z: 0 }, true)
      ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
      ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
      cooldown.current = 1.5
    } else if (cooldown.current === 0 && coreResult.newRestart) {
      const restart = coreResult.newRestart
      ball.setTranslation({ x: restart.location.x, y: Math.max(0.28, restart.location.y), z: restart.location.z }, true)
      ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
      ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
      props.onAudioEvent('ball-kicked', { position: [restart.location.x, restart.location.y, restart.location.z], force: 0.35, team: restart.team ?? undefined })
      onEvent(`${restart.type.replaceAll('-', ' ')} · ${restart.team ?? 'official'} restart`)
      cooldown.current = 0.8
    } else if (Math.abs(position.x) > HALF_LENGTH + 8 || Math.abs(position.z) > 42 || position.y < -2) {
      ball.setTranslation({ x: 0, y: 0.28, z: 0 }, true)
      ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
      ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
      onEvent('Safety recovery · dropped ball')
    }
  })
  return null
}

export function MatchScene(props: MatchSceneProps) {
  const keyboard = useKeyboard()
  const ballRef = useRef<RapierRigidBody>(null)
  const controlledPosition = useRef(new THREE.Vector3(FORMATION[9][0], PLAYER_HEIGHT / 2, FORMATION[9][1]))
  const humanWorldRef = useRef<HumanWorldBundle | null>(null)
  if (!humanWorldRef.current) humanWorldRef.current = createHumanWorld(props.weather, props.weatherIntensity)
  const humanWorld = humanWorldRef.current
  const coreEngineRef = useRef<CoreMatchGameplayEngine | null>(null)
  if (!coreEngineRef.current) coreEngineRef.current = new CoreMatchGameplayEngine()
  const coreEngine = coreEngineRef.current
  const preset = QUALITY_PRESETS[props.quality]
  const time = fixedTime(props.timeOfDay, props.matchProgress)
  const light = lightState(time)
  const handleAction = useCallback((action: MatchAction, team: TeamSide) => props.onAction(action, team), [props])
  const handleGoal = useCallback((team: TeamSide) => props.onGoal(team), [props])
  const weatherBackground = props.weather === 'overcast' ? '#7f949d' : props.weather === 'rain' || props.weather === 'storm' ? '#637780' : props.weather === 'fog' ? '#aab1b0' : props.weather === 'snow' ? '#c8d4d8' : props.weather === 'dust' ? '#a9825d' : props.weather === 'heat' ? '#d7a46f' : light.bg

  return (
    <div className="phase4-match-stage human-simulation-stage">
      <Canvas
        className="match-canvas"
        shadows
        dpr={preset.dpr}
        camera={{ position: [0, 26, 38], fov: 45, near: 0.1, far: 280 }}
        gl={{ antialias: preset.antialias, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: time === 'night' ? 0.86 : 1.04 }}
      >
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
            <Football ref={ballRef} weather={props.weather} quality={props.quality} world={props.world} />
            {(['home', 'away'] as const).flatMap((team) => FORMATION.map(([x, z], index) => (
              <PlayerAvatar
                key={`${team}-${index}`}
                index={index}
                team={team}
                position={team === 'home' ? [x, PLAYER_HEIGHT / 2, z] : [-x, PLAYER_HEIGHT / 2, -z]}
                color={team === 'home' ? props.homeColor : props.awayColor}
                secondaryColor={team === 'home' ? props.homeSecondaryColor : props.awaySecondaryColor}
                controlled={team === 'home' && index === 9}
                running={props.running && props.cameraMode !== 'free' && !props.replayActive}
                difficulty={props.difficulty}
                quality={props.quality}
                keyboard={keyboard}
                ballRef={ballRef}
                controlledPosition={controlledPosition}
                matchProgress={props.matchProgress}
                presentationPhase={props.presentationPhase}
                celebrationTeam={props.celebrationTeam}
                weather={props.weather}
                weatherIntensity={props.weatherIntensity}
                scoreHome={props.scoreHome}
                scoreAway={props.scoreAway}
                humanWorld={humanWorld}
                onEvent={props.onEvent}
                onAction={handleAction}
                onSoundEvent={props.onAudioEvent}
              />
            )))}
            <SurfaceEffects ballRef={ballRef} controlledPosition={controlledPosition} quality={props.quality} weather={props.weather} />
            <Runtime {...props} scoreGoal={handleGoal} ballRef={ballRef} controlledPosition={controlledPosition} humanWorld={humanWorld} coreEngine={coreEngine} />
          </Physics>
        </Suspense>
        <CinematicAtmosphere timeOfDay={props.timeOfDay} weather={props.weather} weatherIntensity={props.weatherIntensity} quality={props.quality} matchProgress={props.matchProgress} eventPulse={props.replayToken} presentationPhase={props.presentationPhase} />
        {(props.weather === 'rain' || props.weather === 'storm' || props.weather === 'snow') && <Rain count={Math.round(preset.rainDrops * (0.45 + props.weatherIntensity * 0.85))} intensity={props.weather === 'snow' ? props.weatherIntensity * 0.45 : props.weatherIntensity} />}
        <CameraRig mode={props.cameraMode} replayToken={props.replayToken} replayActive={props.replayActive} quality={props.quality} presentationPhase={props.presentationPhase} matchProgress={props.matchProgress} cameraShake={props.cameraShake} ballRef={ballRef} controlledPosition={controlledPosition} keyboard={keyboard} />
        <AdaptiveDpr pixelated={props.quality === 'performance'} />
      </Canvas>
    </div>
  )
}
