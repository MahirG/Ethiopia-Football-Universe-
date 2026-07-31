import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import { AdaptiveDpr, Sky, SoftShadows } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Football } from './Ball'
import { CameraRig } from './CameraRig'
import { CinematicAtmosphere } from './CinematicAtmosphere'
import { useAmharicCommentary, type CommentaryEvent } from './commentary'
import { FORMATION, GOAL_HEIGHT, GOAL_WIDTH, HALF_LENGTH, HALF_WIDTH, PLAYER_HEIGHT } from './config'
import { Pitch } from './Pitch'
import { PlayerAvatar } from './PlayerAvatar'
import { QUALITY_PRESETS } from './quality'
import { Stadium } from './Stadium'
import { SurfaceEffects } from './SurfaceEffects'
import type { MatchAction, MatchSceneProps, TeamSide, TimeOfDay } from './types'
import { useKeyboard } from './useKeyboard'
import './phase4.css'

type FixedTime = Exclude<TimeOfDay, 'dynamic'>

function fixedTime(time: TimeOfDay, progress: number): FixedTime {
  if (time !== 'dynamic') return time
  return progress < 0.46 ? 'afternoon' : progress < 0.78 ? 'golden' : 'night'
}

function lightState(time: FixedTime) {
  if (time === 'night') return { bg: '#050b15', hemi: '#607695', ambient: 0.5, sun: '#aac5e7', power: 0.45, pos: [12, 38, 25] as [number, number, number], sky: [0, -2, 0] as [number, number, number] }
  if (time === 'golden') return { bg: '#d98d60', hemi: '#f4c792', ambient: 1.08, sun: '#ffb866', power: 4.4, pos: [-50, 19, -28] as [number, number, number], sky: [-8, 1.5, -4] as [number, number, number] }
  return { bg: '#8ec8ed', hemi: '#cfe7ff', ambient: 1.55, sun: '#fff3d4', power: 3.7, pos: [-38, 52, 22] as [number, number, number], sky: [7, 4, -3] as [number, number, number] }
}

function Rain({ count, intensity }: { count: number; intensity: number }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) { values[i * 3] = (Math.random() - 0.5) * 125; values[i * 3 + 1] = Math.random() * 38 + 1; values[i * 3 + 2] = (Math.random() - 0.5) * 90 }
    return values
  }, [count])
  useFrame((_, delta) => { if (!ref.current) return; ref.current.position.y -= delta * (20 + intensity * 18); ref.current.position.x -= delta * 3; if (ref.current.position.y < -38) ref.current.position.set(0, 0, 0) })
  return <points ref={ref} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#d8e9f4" size={0.05 + intensity * 0.035} transparent opacity={0.3 + intensity * 0.4} depthWrite={false} /></points>
}

interface RuntimeProps extends MatchSceneProps {
  ballRef: { current: RapierRigidBody | null }
  controlledPosition: { current: THREE.Vector3 }
  scoreGoal: (team: TeamSide) => void
}

function Runtime({ ballRef, controlledPosition, scoreGoal, onEvent, onTelemetry, weather, weatherIntensity, matchProgress }: RuntimeProps) {
  const cooldown = useRef(0)
  const lastTelemetry = useRef(0)
  const lastPlayer = useRef(controlledPosition.current.clone())
  const distance = useRef(0)
  useFrame((state, delta) => {
    const ball = ballRef.current
    if (!ball) return
    cooldown.current = Math.max(0, cooldown.current - delta)
    const position = ball.translation(), velocity = ball.linvel()
    distance.current += controlledPosition.current.distanceTo(lastPlayer.current); lastPlayer.current.copy(controlledPosition.current)
    if (weather === 'wind') ball.applyImpulse({ x: 0, y: 0, z: Math.sin(state.clock.elapsedTime * 0.42) * 0.0032 * (0.4 + weatherIntensity) }, true)
    if (state.clock.elapsedTime - lastTelemetry.current > 0.45) {
      lastTelemetry.current = state.clock.elapsedTime
      const home = THREE.MathUtils.clamp(50 + (position.x / HALF_LENGTH) * 28, 18, 82)
      onTelemetry({ homeTerritory: Math.round(home), awayTerritory: Math.round(100 - home), ballSpeed: Math.round(Math.hypot(velocity.x, velocity.y, velocity.z) * 36) / 10, controlledDistance: Math.round(distance.current * 10) / 10, stamina: Math.round(THREE.MathUtils.clamp(100 - matchProgress * 48, 48, 100)) })
    }
    const mouth = Math.abs(position.z) < GOAL_WIDTH / 2 && position.y < GOAL_HEIGHT
    if (cooldown.current === 0 && mouth && Math.abs(position.x) > HALF_LENGTH + 0.35) {
      const team = position.x > 0 ? 'home' : 'away'
      scoreGoal(team); onEvent(team === 'home' ? 'GOAL — home side!' : 'GOAL — away side!')
      ball.setTranslation({ x: 0, y: 0.28, z: 0 }, true); ball.setLinvel({ x: 0, y: 0, z: 0 }, true); ball.setAngvel({ x: 0, y: 0, z: 0 }, true); cooldown.current = 1.5
    } else if (Math.abs(position.x) > HALF_LENGTH + 5 || Math.abs(position.z) > HALF_WIDTH + 5 || position.y < -2) {
      ball.setTranslation({ x: 0, y: 0.28, z: 0 }, true); ball.setLinvel({ x: 0, y: 0, z: 0 }, true); ball.setAngvel({ x: 0, y: 0, z: 0 }, true); onEvent('Restart from midfield')
    }
  })
  return null
}

export function MatchScene(props: MatchSceneProps) {
  const keyboard = useKeyboard()
  const ballRef = useRef<RapierRigidBody>(null)
  const controlledPosition = useRef(new THREE.Vector3(FORMATION[9][0], PLAYER_HEIGHT / 2, FORMATION[9][1]))
  const preset = QUALITY_PRESETS[props.quality]
  const time = fixedTime(props.timeOfDay, props.matchProgress)
  const light = lightState(time)
  const commentary = useAmharicCommentary(true, 0.9)
  const context = useMemo(() => ({ homeName: 'የቤት ቡድን', awayName: 'የእንግዳ ቡድን' }), [])

  const say = useCallback((event: CommentaryEvent, team?: TeamSide) => commentary.comment(event, { ...context, team }), [commentary, context])
  const handleAction = useCallback((action: MatchAction, team: TeamSide) => { props.onAction(action, team); say(action, team) }, [props, say])
  const handleGoal = useCallback((team: TeamSide) => { props.onGoal(team); say('goal', team) }, [props, say])

  useEffect(() => {
    if (props.presentationPhase === 'intro') say('intro')
    else if (props.presentationPhase === 'halftime') say('halftime')
    else if (props.presentationPhase === 'fulltime') say('fulltime')
  }, [props.presentationPhase, say])
  useEffect(() => { if (props.running && props.matchProgress < 0.015) say('kickoff') }, [props.matchProgress, props.running, say])

  const weatherBg = props.weather === 'overcast' ? '#7f949d' : props.weather === 'rain' ? '#637780' : light.bg
  return (
    <div className="phase4-match-stage">
      <Canvas className="match-canvas" shadows dpr={preset.dpr} camera={{ position: [0, 26, 38], fov: 45, near: 0.1, far: 280 }} gl={{ antialias: preset.antialias, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: time === 'night' ? 0.86 : 1.04 }}>
        <color attach="background" args={[weatherBg]} /><fog attach="fog" args={[weatherBg, props.weather === 'rain' ? 42 : 88, props.weather === 'rain' ? 130 : 230]} />
        <Sky distance={230} sunPosition={light.sky} turbidity={props.weather === 'overcast' ? 18 : 8} rayleigh={props.weather === 'overcast' ? 0.6 : 1.4} mieCoefficient={props.weather === 'rain' ? 0.018 : 0.006} />
        {preset.softShadows && <SoftShadows size={18} samples={14} focus={0.42} />}
        <hemisphereLight args={[light.hemi, '#163222', light.ambient]} />
        <directionalLight position={light.pos} color={light.sun} intensity={light.power} castShadow shadow-mapSize-width={preset.shadowMapSize} shadow-mapSize-height={preset.shadowMapSize} shadow-camera-left={-66} shadow-camera-right={66} shadow-camera-top={48} shadow-camera-bottom={-48} shadow-camera-far={125} shadow-bias={-0.00016} />
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]} paused={!props.running} timeStep={1 / 60} interpolate>
            <Pitch weather={props.weather} quality={props.quality} eventPulse={props.replayToken} />
            <Stadium timeOfDay={time} weather={props.weather} quality={props.quality} difficulty={props.difficulty} eventPulse={props.replayToken} />
            <Football ref={ballRef} weather={props.weather} quality={props.quality} />
            {(['home', 'away'] as const).flatMap((team) => FORMATION.map(([x, z], index) => (
              <PlayerAvatar key={`${team}-${index}`} index={index} team={team} position={team === 'home' ? [x, PLAYER_HEIGHT / 2, z] : [-x, PLAYER_HEIGHT / 2, -z]} color={team === 'home' ? props.homeColor : props.awayColor} secondaryColor={team === 'home' ? props.homeSecondaryColor : props.awaySecondaryColor} controlled={team === 'home' && index === 9} running={props.running && props.cameraMode !== 'free' && !props.replayActive} difficulty={props.difficulty} quality={props.quality} keyboard={keyboard} ballRef={ballRef} controlledPosition={controlledPosition} matchProgress={props.matchProgress} presentationPhase={props.presentationPhase} celebrationTeam={props.celebrationTeam} onEvent={props.onEvent} onAction={handleAction} />
            )))}
            <SurfaceEffects ballRef={ballRef} controlledPosition={controlledPosition} quality={props.quality} weather={props.weather} />
            <Runtime {...props} scoreGoal={handleGoal} ballRef={ballRef} controlledPosition={controlledPosition} />
          </Physics>
        </Suspense>
        <CinematicAtmosphere timeOfDay={props.timeOfDay} weather={props.weather} weatherIntensity={props.weatherIntensity} quality={props.quality} matchProgress={props.matchProgress} eventPulse={props.replayToken} presentationPhase={props.presentationPhase} />
        {props.weather === 'rain' && <Rain count={Math.round(preset.rainDrops * (0.45 + props.weatherIntensity * 0.85))} intensity={props.weatherIntensity} />}
        <CameraRig mode={props.cameraMode} replayToken={props.replayToken} replayActive={props.replayActive} quality={props.quality} presentationPhase={props.presentationPhase} matchProgress={props.matchProgress} cameraShake={props.cameraShake} ballRef={ballRef} controlledPosition={controlledPosition} keyboard={keyboard} />
        <AdaptiveDpr pixelated={props.quality === 'performance'} />
      </Canvas>
      {commentary.caption && <div className="amharic-commentary" role="status" aria-live="polite"><span>ቀጥታ አማርኛ</span><strong>{commentary.caption}</strong></div>}
    </div>
  )
}
