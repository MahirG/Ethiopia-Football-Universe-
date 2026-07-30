import { Suspense, useMemo, useRef } from 'react'
import { AdaptiveDpr, Sky, SoftShadows } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Football } from './Ball'
import { CameraRig } from './CameraRig'
import { CinematicAtmosphere } from './CinematicAtmosphere'
import { FORMATION, GOAL_HEIGHT, GOAL_WIDTH, HALF_LENGTH, HALF_WIDTH, PLAYER_HEIGHT } from './config'
import { Pitch } from './Pitch'
import { PlayerAvatar } from './PlayerAvatar'
import { QUALITY_PRESETS } from './quality'
import { Stadium } from './Stadium'
import { SurfaceEffects } from './SurfaceEffects'
import type { MatchSceneProps, TimeOfDay, Weather } from './types'
import { useKeyboard } from './useKeyboard'

interface LightState {
  ambient: number
  sun: number
  color: string
  hemisphere: string
  background: string
  position: [number, number, number]
  skySun: [number, number, number]
  turbidity: number
  rayleigh: number
}

const LIGHTS: Record<'afternoon' | 'golden' | 'night', LightState> = {
  afternoon: { ambient: 1.55, sun: 3.7, color: '#fff3d4', hemisphere: '#cfe7ff', background: '#8ec8ed', position: [-38, 52, 22], skySun: [7, 4, -3], turbidity: 7, rayleigh: 1.4 },
  golden: { ambient: 1.08, sun: 4.5, color: '#ffbd70', hemisphere: '#ffd9b4', background: '#d98d60', position: [-50, 19, -28], skySun: [-8, 1.5, -4], turbidity: 10, rayleigh: 2.5 },
  night: { ambient: 0.48, sun: 0.38, color: '#9cb8da', hemisphere: '#5f7394', background: '#050b15', position: [12, 38, 25], skySun: [0, -2, 0], turbidity: 14, rayleigh: 0.25 },
}

function fixedTime(time: TimeOfDay, progress: number): 'afternoon' | 'golden' | 'night' {
  if (time !== 'dynamic') return time
  return progress < 0.38 ? 'afternoon' : progress < 0.74 ? 'golden' : 'night'
}

function Lighting({ time, weather, intensity, quality }: { time: 'afternoon' | 'golden' | 'night'; weather: Weather; intensity: number; quality: MatchSceneProps['quality'] }) {
  const light = LIGHTS[time]
  const weatherFactor = weather === 'rain' ? 1 - intensity * 0.36 : weather === 'overcast' ? 0.73 : 1
  const mapSize = QUALITY_PRESETS[quality].shadowMapSize
  return <>
    <hemisphereLight args={[weather === 'overcast' ? '#aabcc4' : light.hemisphere, '#163222', light.ambient * weatherFactor]} />
    <directionalLight position={light.position} color={weather === 'overcast' ? '#d9e0df' : light.color} intensity={light.sun * weatherFactor} castShadow shadow-mapSize-width={mapSize} shadow-mapSize-height={mapSize} shadow-camera-left={-66} shadow-camera-right={66} shadow-camera-top={48} shadow-camera-bottom={-48} shadow-camera-near={1} shadow-camera-far={125} shadow-bias={-0.00016} shadow-normalBias={0.018} />
  </>
}

function Rain({ count, intensity }: { count: number; intensity: number }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const points = new Float32Array(count * 3)
    for (let index = 0; index < count; index += 1) {
      points[index * 3] = (Math.random() - 0.5) * 125
      points[index * 3 + 1] = Math.random() * 38 + 1
      points[index * 3 + 2] = (Math.random() - 0.5) * 90
    }
    return points
  }, [count])
  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.position.y -= delta * (18 + intensity * 18)
    ref.current.position.x -= delta * (1.3 + intensity * 5)
    if (ref.current.position.y < -38) { ref.current.position.y = 0; ref.current.position.x = 0 }
  })
  return <points ref={ref} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#d8e9f4" size={0.045 + intensity * 0.04} transparent opacity={0.25 + intensity * 0.42} depthWrite={false} /></points>
}

interface RuntimeProps extends MatchSceneProps {
  ballRef: { current: RapierRigidBody | null }
  controlledPosition: { current: THREE.Vector3 }
}

function MatchRuntime({ ballRef, controlledPosition, onGoal, onEvent, onTelemetry, weather, weatherIntensity, matchProgress }: RuntimeProps) {
  const goalCooldown = useRef(0)
  const lastTelemetry = useRef(0)
  const lastPlayer = useRef(controlledPosition.current.clone())
  const distance = useRef(0)
  useFrame((state, delta) => {
    const ball = ballRef.current
    if (!ball) return
    goalCooldown.current = Math.max(0, goalCooldown.current - delta)
    const position = ball.translation()
    const velocity = ball.linvel()
    distance.current += controlledPosition.current.distanceTo(lastPlayer.current)
    lastPlayer.current.copy(controlledPosition.current)
    if (weather === 'wind') ball.applyImpulse({ x: 0, y: 0, z: Math.sin(state.clock.elapsedTime * 0.42) * 0.0032 * (0.4 + weatherIntensity) }, true)
    if (state.clock.elapsedTime - lastTelemetry.current > 0.45) {
      lastTelemetry.current = state.clock.elapsedTime
      const homeTerritory = THREE.MathUtils.clamp(50 + position.x / HALF_LENGTH * 28, 18, 82)
      onTelemetry({ homeTerritory: Math.round(homeTerritory), awayTerritory: Math.round(100 - homeTerritory), ballSpeed: Math.round(Math.hypot(velocity.x, velocity.y, velocity.z) * 36) / 10, controlledDistance: Math.round(distance.current * 10) / 10, stamina: Math.round(THREE.MathUtils.clamp(100 - matchProgress * 48, 48, 100)) })
    }
    const inGoal = Math.abs(position.z) < GOAL_WIDTH / 2 && position.y < GOAL_HEIGHT
    if (goalCooldown.current === 0 && inGoal && Math.abs(position.x) > HALF_LENGTH + 0.35) {
      const team = position.x > 0 ? 'home' : 'away'
      onGoal(team)
      onEvent(team === 'home' ? 'GOAL — home side!' : 'GOAL — away side!')
      ball.setTranslation({ x: 0, y: 0.28, z: 0 }, true)
      ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
      ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
      goalCooldown.current = 1.5
    } else if (Math.abs(position.x) > HALF_LENGTH + 5 || Math.abs(position.z) > HALF_WIDTH + 5 || position.y < -2) {
      ball.setTranslation({ x: 0, y: 0.28, z: 0 }, true)
      ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
      ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
      onEvent('Restart from midfield')
    }
  })
  return null
}

export function MatchScene(props: MatchSceneProps) {
  const keyboard = useKeyboard()
  const ballRef = useRef<RapierRigidBody>(null)
  const controlledPosition = useRef(new THREE.Vector3(FORMATION[9][0], PLAYER_HEIGHT / 2, FORMATION[9][1]))
  const preset = QUALITY_PRESETS[props.quality]
  const resolvedTime = fixedTime(props.timeOfDay, props.matchProgress)
  const light = LIGHTS[resolvedTime]
  const weatherBackground = props.weather === 'rain' ? '#647880' : props.weather === 'overcast' ? '#7f949d' : light.background
  const background = new THREE.Color(light.background).lerp(new THREE.Color(weatherBackground), props.weather === 'clear' || props.weather === 'wind' ? 0 : props.weatherIntensity * 0.82).getStyle()
  const fogNear = props.weather === 'rain' ? THREE.MathUtils.lerp(72, 36, props.weatherIntensity) : props.weather === 'overcast' ? 58 : 92
  const fogFar = props.weather === 'rain' ? THREE.MathUtils.lerp(190, 118, props.weatherIntensity) : props.weather === 'overcast' ? 178 : 235

  return <Canvas className="match-canvas" shadows dpr={preset.dpr} camera={{ position: [0, 26, 38], fov: 45, near: 0.1, far: 280 }} gl={{ antialias: preset.antialias, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: resolvedTime === 'night' ? 0.86 : props.weather === 'overcast' ? 0.94 : 1.06 }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.shadowMap.type = props.quality === 'ultra' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap }}>
    <color attach="background" args={[background]} /><fog attach="fog" args={[background, fogNear, fogFar]} />
    <Sky distance={230} sunPosition={light.skySun} turbidity={props.weather === 'overcast' ? 18 : light.turbidity} rayleigh={props.weather === 'overcast' ? 0.62 : light.rayleigh} mieCoefficient={props.weather === 'rain' ? 0.008 + props.weatherIntensity * 0.016 : 0.006} mieDirectionalG={0.82} />
    {preset.softShadows && <SoftShadows size={18} samples={14} focus={0.42} />}
    <Lighting time={resolvedTime} weather={props.weather} intensity={props.weatherIntensity} quality={props.quality} />
    <Suspense fallback={null}><Physics gravity={[0, -9.81, 0]} paused={!props.running} timeStep={1 / 60} interpolate>
      <Pitch weather={props.weather} quality={props.quality} eventPulse={props.replayToken} />
      <Stadium timeOfDay={resolvedTime} weather={props.weather} quality={props.quality} difficulty={props.difficulty} eventPulse={props.replayToken} />
      <Football ref={ballRef} weather={props.weather} quality={props.quality} />
      {(['home', 'away'] as const).flatMap((team) => FORMATION.map(([baseX, baseZ], index) => <PlayerAvatar key={`${team}-${index}`} index={index} team={team} position={team === 'home' ? [baseX, PLAYER_HEIGHT / 2, baseZ] : [-baseX, PLAYER_HEIGHT / 2, -baseZ]} color={team === 'home' ? props.homeColor : props.awayColor} secondaryColor={team === 'home' ? props.homeSecondaryColor : props.awaySecondaryColor} controlled={team === 'home' && index === 9} running={props.running && props.cameraMode !== 'free' && !props.replayActive} difficulty={props.difficulty} quality={props.quality} keyboard={keyboard} ballRef={ballRef} controlledPosition={controlledPosition} matchProgress={props.matchProgress} presentationPhase={props.presentationPhase} celebrationTeam={props.celebrationTeam} onEvent={props.onEvent} onAction={props.onAction} />))}
      <SurfaceEffects ballRef={ballRef} controlledPosition={controlledPosition} quality={props.quality} weather={props.weather} />
      <MatchRuntime {...props} ballRef={ballRef} controlledPosition={controlledPosition} />
    </Physics></Suspense>
    <CinematicAtmosphere timeOfDay={props.timeOfDay} weather={props.weather} weatherIntensity={props.weatherIntensity} quality={props.quality} matchProgress={props.matchProgress} eventPulse={props.replayToken} presentationPhase={props.presentationPhase} />
    {props.weather === 'rain' && <Rain count={Math.round(preset.rainDrops * (0.45 + props.weatherIntensity * 0.85))} intensity={props.weatherIntensity} />}
    <CameraRig mode={props.cameraMode} replayToken={props.replayToken} replayActive={props.replayActive} quality={props.quality} presentationPhase={props.presentationPhase} matchProgress={props.matchProgress} cameraShake={props.cameraShake} ballRef={ballRef} controlledPosition={controlledPosition} keyboard={keyboard} />
    <AdaptiveDpr pixelated={props.quality === 'performance'} />
  </Canvas>
}
