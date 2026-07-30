import { Suspense, useMemo, useRef } from 'react'
import { AdaptiveDpr, Sky } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Football } from './Ball'
import { CameraRig } from './CameraRig'
import { FORMATION, GOAL_HEIGHT, GOAL_WIDTH, HALF_LENGTH, HALF_WIDTH, PLAYER_HEIGHT } from './config'
import { Pitch } from './Pitch'
import { PlayerAvatar } from './PlayerAvatar'
import { Stadium } from './Stadium'
import type { MatchSceneProps } from './types'
import { useKeyboard } from './useKeyboard'

function Lighting({ timeOfDay, weather }: Pick<MatchSceneProps, 'timeOfDay' | 'weather'>) {
  const settings = {
    afternoon: { ambient: 1.65, sun: 3.8, color: '#fff3d4', position: [-38, 52, 22] as [number, number, number] },
    golden: { ambient: 1.18, sun: 4.6, color: '#ffbd70', position: [-50, 19, -28] as [number, number, number] },
    night: { ambient: 0.5, sun: 0.38, color: '#9cb8da', position: [12, 38, 25] as [number, number, number] },
  }[timeOfDay]
  const weatherFactor = weather === 'rain' ? 0.7 : 1

  return (
    <>
      <hemisphereLight args={[timeOfDay === 'night' ? '#5f7394' : '#cfe7ff', '#163222', settings.ambient * weatherFactor]} />
      <directionalLight
        position={settings.position}
        color={settings.color}
        intensity={settings.sun * weatherFactor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-66}
        shadow-camera-right={66}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-bias={-0.00018}
      />
    </>
  )
}

function Rain() {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const points = new Float32Array(1800 * 3)
    for (let index = 0; index < 1800; index += 1) {
      points[index * 3] = (Math.random() - 0.5) * 125
      points[index * 3 + 1] = Math.random() * 34 + 1
      points[index * 3 + 2] = (Math.random() - 0.5) * 90
    }
    return points
  }, [])

  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.position.y -= delta * 24
    ref.current.position.x -= delta * 2
    if (ref.current.position.y < -34) ref.current.position.y = 0
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#c7def2" size={0.075} transparent opacity={0.58} depthWrite={false} />
    </points>
  )
}

interface RuntimeProps extends MatchSceneProps {
  ballRef: { current: RapierRigidBody | null }
}

function MatchRuntime({ ballRef, onGoal, onEvent, weather }: RuntimeProps) {
  const goalCooldown = useRef(0)

  useFrame((state, delta) => {
    const ball = ballRef.current
    if (!ball) return
    goalCooldown.current = Math.max(0, goalCooldown.current - delta)
    const position = ball.translation()

    if (weather === 'wind') {
      const wind = Math.sin(state.clock.elapsedTime * 0.42) * 0.0025
      ball.applyImpulse({ x: 0, y: 0, z: wind }, true)
    }

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
      onEvent('Restart from midfield')
    }
  })

  return null
}

export function MatchScene(props: MatchSceneProps) {
  const keyboard = useKeyboard()
  const ballRef = useRef<RapierRigidBody>(null)
  const controlledPosition = useRef(new THREE.Vector3(FORMATION[9][0], PLAYER_HEIGHT / 2, FORMATION[9][1]))
  const sky = {
    afternoon: { sun: [7, 4, -3] as [number, number, number], turbidity: 7, rayleigh: 1.4, background: '#8ec8ed' },
    golden: { sun: [-8, 1.5, -4] as [number, number, number], turbidity: 10, rayleigh: 2.5, background: '#d98d60' },
    night: { sun: [0, -2, 0] as [number, number, number], turbidity: 14, rayleigh: 0.25, background: '#050b15' },
  }[props.timeOfDay]

  return (
    <Canvas
      className="match-canvas"
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 26, 38], fov: 45, near: 0.1, far: 260 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: props.timeOfDay === 'night' ? 0.82 : 1.05 }}
    >
      <color attach="background" args={[sky.background]} />
      <fog attach="fog" args={[props.weather === 'rain' ? '#667b82' : sky.background, props.weather === 'rain' ? 50 : 92, props.weather === 'rain' ? 155 : 225]} />
      <Sky distance={220} sunPosition={sky.sun} turbidity={sky.turbidity} rayleigh={sky.rayleigh} mieCoefficient={0.006} mieDirectionalG={0.82} />
      <Lighting timeOfDay={props.timeOfDay} weather={props.weather} />

      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} paused={!props.running} timeStep={1 / 60} interpolation>
          <Pitch weather={props.weather} />
          <Stadium timeOfDay={props.timeOfDay} />
          <Football ref={ballRef} weather={props.weather} />

          {(['home', 'away'] as const).flatMap((team) => FORMATION.map(([baseX, baseZ], index) => {
            const position: [number, number, number] = team === 'home'
              ? [baseX, PLAYER_HEIGHT / 2, baseZ]
              : [-baseX, PLAYER_HEIGHT / 2, -baseZ]
            return (
              <PlayerAvatar
                key={`${team}-${index}`}
                index={index}
                team={team}
                position={position}
                color={team === 'home' ? props.homeColor : props.awayColor}
                controlled={team === 'home' && index === 9}
                running={props.running && props.cameraMode !== 'free'}
                difficulty={props.difficulty}
                keyboard={keyboard}
                ballRef={ballRef}
                controlledPosition={controlledPosition}
                onEvent={props.onEvent}
              />
            )
          }))}
          <MatchRuntime {...props} ballRef={ballRef} />
        </Physics>
      </Suspense>

      {props.weather === 'rain' && <Rain />}
      <CameraRig mode={props.cameraMode} ballRef={ballRef} controlledPosition={controlledPosition} keyboard={keyboard} />
      <AdaptiveDpr pixelated />
    </Canvas>
  )
}
