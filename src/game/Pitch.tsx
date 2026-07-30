import { useEffect, useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { BALL_RADIUS, GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, HALF_LENGTH, HALF_WIDTH, PITCH_LENGTH, PITCH_WIDTH } from './config'
import { GrassField } from './GrassField'
import type { QualityLevel, Weather } from './types'

interface PitchProps {
  weather: Weather
  quality: QualityLevel
  eventPulse: number
}

function Marking({ position, size, wet }: { position: [number, number, number]; size: [number, number, number]; wet: boolean }) {
  return <mesh position={position} receiveShadow><boxGeometry args={size} /><meshPhysicalMaterial color="#f4f4e9" roughness={wet ? 0.42 : 0.72} clearcoat={wet ? 0.18 : 0} /></mesh>
}

function createNetGeometry(side: -1 | 1) {
  const positions: number[] = []
  const frontX = side * HALF_LENGTH
  const backX = side * (HALF_LENGTH + GOAL_DEPTH)
  for (let index = 0; index <= 12; index += 1) {
    const z = -GOAL_WIDTH / 2 + (index / 12) * GOAL_WIDTH
    positions.push(frontX, 0, z, frontX, GOAL_HEIGHT, z, frontX, GOAL_HEIGHT, z, backX, GOAL_HEIGHT * 0.82, z, frontX, 0, z, backX, 0, z)
  }
  for (let index = 0; index <= 8; index += 1) {
    const y = (index / 8) * GOAL_HEIGHT
    const backY = (index / 8) * GOAL_HEIGHT * 0.82
    positions.push(frontX, y, -GOAL_WIDTH / 2, frontX, y, GOAL_WIDTH / 2, backX, backY, -GOAL_WIDTH / 2, backX, backY, GOAL_WIDTH / 2)
  }
  for (let index = 0; index <= 5; index += 1) {
    const amount = index / 5
    const x = THREE.MathUtils.lerp(frontX, backX, amount)
    const y = THREE.MathUtils.lerp(GOAL_HEIGHT, GOAL_HEIGHT * 0.82, amount)
    positions.push(x, y, -GOAL_WIDTH / 2, x, y, GOAL_WIDTH / 2, x, 0, -GOAL_WIDTH / 2, x, y, -GOAL_WIDTH / 2, x, 0, GOAL_WIDTH / 2, x, y, GOAL_WIDTH / 2)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geometry
}

function GoalNet({ side, eventPulse, quality }: { side: -1 | 1; eventPulse: number; quality: QualityLevel }) {
  const group = useRef<THREE.Group>(null)
  const ripple = useRef(0)
  const geometry = useMemo(() => createNetGeometry(side), [side])
  useEffect(() => { if (eventPulse > 0) ripple.current = 1 }, [eventPulse])
  useFrame(({ clock }, delta) => {
    if (!group.current) return
    ripple.current = THREE.MathUtils.damp(ripple.current, 0, 2.15, delta)
    group.current.scale.x = 1 + Math.sin(clock.elapsedTime * 15) * ripple.current * 0.11 * side
    group.current.rotation.z = Math.sin(clock.elapsedTime * 12) * ripple.current * 0.006
  })
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group ref={group}><lineSegments geometry={geometry}><lineBasicMaterial color="#e8f2ec" transparent opacity={quality === 'performance' ? 0.34 : 0.58} /></lineSegments></group>
}

function Goal({ side, eventPulse, quality }: { side: -1 | 1; eventPulse: number; quality: QualityLevel }) {
  const frontX = side * HALF_LENGTH
  const backX = side * (HALF_LENGTH + GOAL_DEPTH)
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.04, GOAL_HEIGHT / 2, 0.06]} position={[frontX, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2]} />
        <CuboidCollider args={[0.04, GOAL_HEIGHT / 2, 0.06]} position={[frontX, GOAL_HEIGHT / 2, GOAL_WIDTH / 2]} />
        <CuboidCollider args={[0.04, 0.05, GOAL_WIDTH / 2]} position={[frontX, GOAL_HEIGHT, 0]} />
        <CuboidCollider args={[0.04, GOAL_HEIGHT * 0.41, GOAL_WIDTH / 2]} position={[backX, GOAL_HEIGHT * 0.41, 0]} restitution={0.08} />
        {[-GOAL_WIDTH / 2, GOAL_WIDTH / 2].map((z) => <mesh key={z} position={[frontX, GOAL_HEIGHT / 2, z]} castShadow><cylinderGeometry args={[0.06, 0.06, GOAL_HEIGHT, 16]} /><meshPhysicalMaterial color="#f7f7f2" metalness={0.24} roughness={0.34} clearcoat={0.22} /></mesh>)}
        <mesh position={[frontX, GOAL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, GOAL_WIDTH, 16]} /><meshPhysicalMaterial color="#f7f7f2" metalness={0.24} roughness={0.34} clearcoat={0.22} /></mesh>
      </RigidBody>
      <GoalNet side={side} eventPulse={eventPulse} quality={quality} />
      <Line points={[[frontX, 0, -GOAL_WIDTH / 2], [backX, 0, -GOAL_WIDTH / 2], [backX, 0, GOAL_WIDTH / 2], [frontX, 0, GOAL_WIDTH / 2]]} color="#d9ebe2" lineWidth={1} transparent opacity={0.42} />
    </group>
  )
}

function WetPatches() {
  return <group>{Array.from({ length: 14 }, (_, index) => <mesh key={index} position={[Math.sin(index * 4.19) * 44, 0.034, Math.cos(index * 2.71) * 28]} rotation={[-Math.PI / 2, 0, index * 0.73]}><circleGeometry args={[1.8 + (index % 4) * 0.7, 24]} /><meshPhysicalMaterial color="#1a5739" transparent opacity={0.16} roughness={0.18} metalness={0.06} clearcoat={0.72} depthWrite={false} /></mesh>)}</group>
}

export function Pitch({ weather, quality, eventPulse }: PitchProps) {
  const stripeWidth = PITCH_LENGTH / 14
  const wet = weather === 'rain'
  const grassRoughness = wet ? 0.38 : weather === 'overcast' ? 0.72 : 0.84
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[HALF_LENGTH + 5, 0.12, HALF_WIDTH + 5]} position={[0, -0.12, 0]} friction={wet ? 0.42 : 0.82} restitution={wet ? 0.1 : 0.12} />
        <mesh position={[0, -0.15, 0]} receiveShadow><boxGeometry args={[PITCH_LENGTH + 12, 0.3, PITCH_WIDTH + 12]} /><meshStandardMaterial color="#0c2c1d" roughness={1} /></mesh>
        {Array.from({ length: 14 }, (_, index) => <mesh key={index} position={[-HALF_LENGTH + stripeWidth / 2 + index * stripeWidth, 0, 0]} receiveShadow><boxGeometry args={[stripeWidth, 0.025, PITCH_WIDTH]} /><meshPhysicalMaterial color={index % 2 === 0 ? '#217a46' : '#1c6f3f'} roughness={grassRoughness} metalness={wet ? 0.07 : 0} clearcoat={wet ? 0.26 : 0} /></mesh>)}
      </RigidBody>
      <GrassField quality={quality} weather={weather} />
      {wet && quality !== 'performance' && <WetPatches />}
      <Marking position={[0, 0.027, -HALF_WIDTH]} size={[PITCH_LENGTH, 0.042, 0.11]} wet={wet} />
      <Marking position={[0, 0.027, HALF_WIDTH]} size={[PITCH_LENGTH, 0.042, 0.11]} wet={wet} />
      <Marking position={[-HALF_LENGTH, 0.027, 0]} size={[0.11, 0.042, PITCH_WIDTH]} wet={wet} />
      <Marking position={[HALF_LENGTH, 0.027, 0]} size={[0.11, 0.042, PITCH_WIDTH]} wet={wet} />
      <Marking position={[0, 0.03, 0]} size={[0.1, 0.044, PITCH_WIDTH]} wet={wet} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}><ringGeometry args={[9.1, 9.23, 96]} /><meshPhysicalMaterial color="#f4f4e9" roughness={wet ? 0.4 : 0.72} clearcoat={wet ? 0.18 : 0} /></mesh>
      <mesh position={[0, 0.045, 0]}><cylinderGeometry args={[0.14, 0.14, 0.05, 24]} /><meshStandardMaterial color="#f4f4e9" /></mesh>
      {([-1, 1] as const).map((side) => <group key={side}>
        <Marking position={[side * (HALF_LENGTH - 8.25), 0.03, -20.16]} size={[16.5, 0.044, 0.11]} wet={wet} />
        <Marking position={[side * (HALF_LENGTH - 8.25), 0.03, 20.16]} size={[16.5, 0.044, 0.11]} wet={wet} />
        <Marking position={[side * (HALF_LENGTH - 16.5), 0.03, 0]} size={[0.11, 0.044, 40.32]} wet={wet} />
        <Marking position={[side * (HALF_LENGTH - 2.75), 0.032, -9.16]} size={[5.5, 0.044, 0.11]} wet={wet} />
        <Marking position={[side * (HALF_LENGTH - 2.75), 0.032, 9.16]} size={[5.5, 0.044, 0.11]} wet={wet} />
        <Marking position={[side * (HALF_LENGTH - 5.5), 0.032, 0]} size={[0.11, 0.044, 18.32]} wet={wet} />
        <mesh position={[side * (HALF_LENGTH - 11), 0.045, 0]}><cylinderGeometry args={[0.12, 0.12, 0.05, 20]} /><meshStandardMaterial color="#f4f4e9" /></mesh>
        <Goal side={side} eventPulse={eventPulse} quality={quality} />
      </group>)}
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[HALF_LENGTH + 2, 1.2, 0.35]} position={[0, 1.2, HALF_WIDTH + 1.6]} /><CuboidCollider args={[HALF_LENGTH + 2, 1.2, 0.35]} position={[0, 1.2, -HALF_WIDTH - 1.6]} /></RigidBody>
      <mesh position={[0, BALL_RADIUS * 0.2, 0]} visible={false}><sphereGeometry args={[BALL_RADIUS, 8, 8]} /><meshBasicMaterial /></mesh>
    </group>
  )
}
