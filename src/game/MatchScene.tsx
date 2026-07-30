import { Suspense, useMemo, useRef } from 'react'
import { AdaptiveDpr, Sky, SoftShadows } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Football } from './Ball'
import { CameraRig } from './CameraRig'
import { FORMATION, GOAL_HEIGHT, GOAL_WIDTH, HALF_LENGTH, HALF_WIDTH, PLAYER_HEIGHT } from './config'
import { Pitch } from './Pitch'
import { PlayerAvatar } from './PlayerAvatar'
import { QUALITY_PRESETS } from './quality'
import { Stadium } from './Stadium'
import { SurfaceEffects } from './SurfaceEffects'
import type { MatchSceneProps } from './types'
import { useKeyboard } from './useKeyboard'

function Lighting({ timeOfDay, weather, quality }: Pick<MatchSceneProps, 'timeOfDay' | 'weather' | 'quality'>) {
  const settings = {
    afternoon: { ambient: 1.55, sun: 3.7, color: '#fff3d4', position: [-38, 52, 22] as [number, number, number] },
    golden: { ambient: 1.08, sun: 4.5, color: '#ffb866', position: [-50, 19, -28] as [number, number, number] },
    night: { ambient: 0.48, sun: 0.34, color: '#9cb8da', position: [12, 38, 25] as [number, number, number] },
  }[timeOfDay]
  const weatherFactor = weather === 'rain' ? 0.63 : weather === 'overcast' ? 0.72 : 1
  const mapSize = QUALITY_PRESETS[quality].shadowMapSize
  return <><hemisphereLight args={[timeOfDay === 'night' ? '#5f7394' : weather === 'overcast' ? '#aabcc4' : '#cfe7ff', '#163222', settings.ambient * weatherFactor]} /><directionalLight position={settings.position} color={weather === 'overcast' ? '#d9e0df' : settings.color} intensity={settings.sun * weatherFactor} castShadow shadow-mapSize-width={mapSize} shadow-mapSize-height={mapSize} shadow-camera-left={-66} shadow-camera-right={66} shadow-camera-top={48} shadow-camera-bottom={-48} shadow-camera-near={1} shadow-camera-far={125} shadow-bias={-0.00016} shadow-normalBias={0.018} /></>
}

function Rain({ count, wind }: { count: number; wind: boolean }) {
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
    ref.current.position.y -= delta * 28
    ref.current.position.x -= delta * (wind ? 5.5 : 2.2)
    if (ref.current.position.y < -38) { ref.current.position.y = 0; ref.current.position.x = 0 }
  })
  return <points ref={ref} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#d8e9f4" size={0.065} transparent opacity={0.54} depthWrite={false} sizeAttenuation /></points>
}

interface RuntimeProps extends MatchSceneProps { ballRef: { current: RapierRigidBody | null } }

function MatchRuntime({ ballRef, onGoal, onEvent, weather }: RuntimeProps) {
  const goalCooldown = useRef(0)
  useFrame((state, delta) => {
    const ball = ballRef.current
    if (!ball) return
    goalCooldown.current = Math.max(0, goalCooldown.current - delta)
    const position = ball.translation()
    if (weather === 'wind') ball.applyImpulse({ x: 0, y: 0, z: Math.sin(state.clock.elapsedTime * 0.42) * 0.0032 }, true)
    const inGoalMouth = Math.abs(position.z) < GOAL_WIDTH / 2 && position.y < GOAL_HEIGHT
    if (goalCooldown.current === 0 && inGoalMouth && Math.abs(position.x) > HALF_LENGTH + 0.35) {
      const team = position.x > 0 ? 'home' : 'away'
      onGoal(team)
      onEvent(team === 'home' ? 'GOAL — home side!' : 'GOAL — away side!')
      ball.setTranslation({ x: 0, y: 0.28, z: 0 }, true)
      ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
      ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
      goalCooldown.current = 1.5
      return
    }
    if (Math.abs(position.x) > HALF_LENGTH + 5 || Math.abs(position.z) > HALF_WIDTH + 5 || position.y < -2) {
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
  const sky = {
    afternoon: { sun: [7, 4, -3] as [number, number, number], turbidity: 7, rayleigh: 1.4, background: '#8ec8ed' },
    golden: { sun: [-8, 1.5, -4] as [number, number, number], turbidity: 10, rayleigh: 2.5, background: '#d98d60' },
    night: { sun: [0, -2, 0] as [number, number, number], turbidity: 14, rayleigh: 0.25, background: '#050b15' },
  }[props.timeOfDay]
  const background = props.weather === 'overcast' ? '#7f949d' : props.weather === 'rain' ? '#647880' : sky.background
  return (
    <Canvas className="match-canvas" shadows dpr={preset.dpr} camera={{ position: [0, 26, 38], fov: 45, near: 0.1, far: 280 }} gl={{ antialias: preset.antialias, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: props.timeOfDay === 'night' ? 0.86 : props.weather === 'overcast' ? 0.94 : 1.06 }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.shadowMap.type = props.quality === 'ultra' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap }}>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, props.weather === 'rain' ? 43 : props.weather === 'overcast' ? 58 : 92, props.weather === 'rain' ? 148 : props.weather === 'overcast' ? 178 : 235]} />
      <Sky distance={230} sunPosition={sky.sun} turbidity={props.weather === 'overcast' ? 18 : sky.turbidity} rayleigh={props.weather === 'overcast' ? 0.62 : sky.rayleigh} mieCoefficient={props.weather === 'rain' ? 0.018 : 0.006} mieDirectionalG={0.82} />
      {preset.softShadows && <SoftShadows size={18} samples={14} focus={0.42} />}
      <Lighting timeOfDay={props.timeOfDay} weather={props.weather} quality={props.quality} />
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} paused={!props.running} timeStep={1 / 60} interpolate>
          <Pitch weather={props.weather} quality={props.quality} eventPulse={props.replayToken} />
          <Stadium timeOfDay={props.timeOfDay} weather={props.weather} quality={props.quality} difficulty={props.difficulty} eventPulse={props.replayToken} />
          <Football ref={ballRef} weather={props.weather} quality={props.quality} />
          {(['home', 'away'] as const).flatMap((team) => FORMATION.map(([baseX, baseZ], index) => {
            const position: [number, number, number] = team === 'home' ? [baseX, PLAYER_HEIGHT / 2, baseZ] : [-baseX, PLAYER_HEIGHT / 2, -baseZ]
            return <PlayerAvatar key={`${team}-${index}`} index={index} team={team} position={position} color={team === 'home' ? props.homeColor : props.awayColor} secondaryColor={team === 'home' ? props.homeSecondaryColor : props.awaySecondaryColor} controlled={team === 'home' && index === 9} running={props.running && props.cameraMode !== 'free' && !props.replayActive} difficulty={props.difficulty} quality={props.quality} keyboard={keyboard} ballRef={ballRef} controlledPosition={controlledPosition} onEvent={props.onEvent} />
          }))}
          <SurfaceEffects ballRef={ballRef} controlledPosition={controlledPosition} quality={props.quality} weather={props.weather} />
          <MatchRuntime {...props} ballRef={ballRef} />
        </Physics>
      </Suspense>
      {props.weather === 'rain' && <Rain count={preset.rainDrops} wind />}
      <CameraRig mode={props.cameraMode} replayToken={props.replayToken} replayActive={props.replayActive} quality={props.quality} ballRef={ballRef} controlledPosition={controlledPosition} keyboard={keyboard} />
      <AdaptiveDpr pixelated={props.quality === 'performance'} />
    </Canvas>
  )
}
