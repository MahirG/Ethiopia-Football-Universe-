import { Line } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { BALL_RADIUS, GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, HALF_LENGTH, HALF_WIDTH, PITCH_LENGTH, PITCH_WIDTH } from './config'
import type { Weather } from './types'

interface PitchProps {
  weather: Weather
}

function Marking({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#f4f4e9" roughness={0.72} />
    </mesh>
  )
}

function Goal({ side }: { side: -1 | 1 }) {
  const x = side * (HALF_LENGTH + GOAL_DEPTH / 2)
  const frontX = side * HALF_LENGTH
  const backX = side * (HALF_LENGTH + GOAL_DEPTH)
  const postColor = '#f7f7f2'

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.04, GOAL_HEIGHT / 2, 0.06]} position={[frontX, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2]} />
        <CuboidCollider args={[0.04, GOAL_HEIGHT / 2, 0.06]} position={[frontX, GOAL_HEIGHT / 2, GOAL_WIDTH / 2]} />
        <CuboidCollider args={[0.04, 0.05, GOAL_WIDTH / 2]} position={[frontX, GOAL_HEIGHT, 0]} />
        <mesh position={[frontX, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, GOAL_HEIGHT, 12]} />
          <meshStandardMaterial color={postColor} metalness={0.18} roughness={0.4} />
        </mesh>
        <mesh position={[frontX, GOAL_HEIGHT / 2, GOAL_WIDTH / 2]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, GOAL_HEIGHT, 12]} />
          <meshStandardMaterial color={postColor} metalness={0.18} roughness={0.4} />
        </mesh>
        <mesh position={[frontX, GOAL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, GOAL_WIDTH, 12]} />
          <meshStandardMaterial color={postColor} metalness={0.18} roughness={0.4} />
        </mesh>
      </RigidBody>
      <mesh position={[x, GOAL_HEIGHT / 2, 0]}>
        <boxGeometry args={[GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH]} />
        <meshStandardMaterial color="#d9ebe2" transparent opacity={0.12} wireframe side={2} />
      </mesh>
      <Line points={[[frontX, 0, -GOAL_WIDTH / 2], [backX, 0, -GOAL_WIDTH / 2], [backX, 0, GOAL_WIDTH / 2], [frontX, 0, GOAL_WIDTH / 2]]} color="#d9ebe2" lineWidth={1} transparent opacity={0.45} />
    </group>
  )
}

export function Pitch({ weather }: PitchProps) {
  const stripeWidth = PITCH_LENGTH / 14
  const grassRoughness = weather === 'rain' ? 0.42 : 0.82

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[HALF_LENGTH + 5, 0.12, HALF_WIDTH + 5]} position={[0, -0.12, 0]} friction={weather === 'rain' ? 0.45 : 0.8} restitution={0.12} />
        <mesh position={[0, -0.15, 0]} receiveShadow>
          <boxGeometry args={[PITCH_LENGTH + 12, 0.3, PITCH_WIDTH + 12]} />
          <meshStandardMaterial color="#0c2c1d" roughness={1} />
        </mesh>
        {Array.from({ length: 14 }, (_, index) => (
          <mesh key={index} position={[-HALF_LENGTH + stripeWidth / 2 + index * stripeWidth, 0, 0]} receiveShadow>
            <boxGeometry args={[stripeWidth, 0.025, PITCH_WIDTH]} />
            <meshStandardMaterial color={index % 2 === 0 ? '#217a46' : '#1c6f3f'} roughness={grassRoughness} metalness={weather === 'rain' ? 0.08 : 0} />
          </mesh>
        ))}
      </RigidBody>

      <Marking position={[0, 0.025, -HALF_WIDTH]} size={[PITCH_LENGTH, 0.035, 0.1]} />
      <Marking position={[0, 0.025, HALF_WIDTH]} size={[PITCH_LENGTH, 0.035, 0.1]} />
      <Marking position={[-HALF_LENGTH, 0.025, 0]} size={[0.1, 0.035, PITCH_WIDTH]} />
      <Marking position={[HALF_LENGTH, 0.025, 0]} size={[0.1, 0.035, PITCH_WIDTH]} />
      <Marking position={[0, 0.028, 0]} size={[0.09, 0.04, PITCH_WIDTH]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[9.1, 9.22, 96]} />
        <meshStandardMaterial color="#f4f4e9" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.045, 24]} />
        <meshStandardMaterial color="#f4f4e9" />
      </mesh>

      {([-1, 1] as const).map((side) => {
        const sixX = side * (HALF_LENGTH - 2.75)
        return (
          <group key={side}>
            <Marking position={[side * (HALF_LENGTH - 8.25), 0.028, -20.16]} size={[16.5, 0.04, 0.1]} />
            <Marking position={[side * (HALF_LENGTH - 8.25), 0.028, 20.16]} size={[16.5, 0.04, 0.1]} />
            <Marking position={[side * (HALF_LENGTH - 16.5), 0.028, 0]} size={[0.1, 0.04, 40.32]} />
            <Marking position={[sixX, 0.03, -9.16]} size={[5.5, 0.04, 0.1]} />
            <Marking position={[sixX, 0.03, 9.16]} size={[5.5, 0.04, 0.1]} />
            <Marking position={[side * (HALF_LENGTH - 5.5), 0.03, 0]} size={[0.1, 0.04, 18.32]} />
            <mesh position={[side * (HALF_LENGTH - 11), 0.04, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.045, 20]} />
              <meshStandardMaterial color="#f4f4e9" />
            </mesh>
            <Goal side={side} />
          </group>
        )
      })}

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[HALF_LENGTH + 2, 1.2, 0.35]} position={[0, 1.2, HALF_WIDTH + 1.6]} />
        <CuboidCollider args={[HALF_LENGTH + 2, 1.2, 0.35]} position={[0, 1.2, -HALF_WIDTH - 1.6]} />
      </RigidBody>

      <mesh position={[0, BALL_RADIUS * 0.2, 0]} visible={false}>
        <sphereGeometry args={[BALL_RADIUS, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  )
}
