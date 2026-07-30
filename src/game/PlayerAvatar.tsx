import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { HALF_LENGTH, HALF_WIDTH, PLAYER_HEIGHT } from './config'
import type { Difficulty, TeamSide } from './types'
import type { KeyboardState } from './useKeyboard'

interface PlayerAvatarProps {
  index: number
  team: TeamSide
  position: [number, number, number]
  color: string
  controlled?: boolean
  running: boolean
  difficulty: Difficulty
  keyboard: { current: KeyboardState }
  ballRef: { current: RapierRigidBody | null }
  controlledPosition: { current: THREE.Vector3 }
  onEvent: (message: string) => void
}

const skinTones = ['#5e3324', '#75432e', '#8b5539', '#a56e4e', '#c08462']

function Limb({ position, color, refValue }: { position: [number, number, number]; color: string; refValue?: RefObject<THREE.Group | null> }) {
  return (
    <group ref={refValue} position={position}>
      <mesh position={[0, -0.31, 0]} castShadow>
        <capsuleGeometry args={[0.09, 0.42, 5, 8]} />
        <meshStandardMaterial color={color} roughness={0.72} />
      </mesh>
    </group>
  )
}

export function PlayerAvatar({ index, team, position, color, controlled = false, running, difficulty, keyboard, ballRef, controlledPosition, onEvent }: PlayerAvatarProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const groupRef = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)
  const velocity = useRef(new THREE.Vector3())
  const facing = useRef(team === 'home' ? 0 : Math.PI)
  const kickCooldown = useRef(0)
  const homePosition = useMemo(() => new THREE.Vector3(...position), [position])
  const skin = skinTones[index % skinTones.length]
  const buildScale = 0.94 + (index % 4) * 0.035

  useFrame((state, delta) => {
    const body = bodyRef.current
    if (!body) return
    const current = body.translation()
    kickCooldown.current = Math.max(0, kickCooldown.current - delta)

    if (!running) {
      velocity.current.multiplyScalar(0.82)
    } else if (controlled) {
      const held = keyboard.current.held
      let x = 0
      let z = 0
      if (held.has('w') || held.has('arrowup')) x += 1
      if (held.has('s') || held.has('arrowdown')) x -= 1
      if (held.has('a') || held.has('arrowleft')) z -= 1
      if (held.has('d') || held.has('arrowright')) z += 1
      const inputLength = Math.hypot(x, z)
      const speed = held.has('shift') ? 9.3 : 6.4
      if (inputLength > 0) {
        x /= inputLength
        z /= inputLength
        velocity.current.x = THREE.MathUtils.damp(velocity.current.x, x * speed, 9, delta)
        velocity.current.z = THREE.MathUtils.damp(velocity.current.z, z * speed, 9, delta)
        facing.current = Math.atan2(z, x)
      } else {
        velocity.current.x = THREE.MathUtils.damp(velocity.current.x, 0, 12, delta)
        velocity.current.z = THREE.MathUtils.damp(velocity.current.z, 0, 12, delta)
      }

      const ball = ballRef.current
      if (ball && (keyboard.current.pressed.has(' ') || keyboard.current.pressed.has('e'))) {
        const ballPosition = ball.translation()
        const distance = Math.hypot(ballPosition.x - current.x, ballPosition.z - current.z)
        if (distance < 1.45 && kickCooldown.current === 0) {
          const shot = keyboard.current.pressed.has(' ')
          const direction = new THREE.Vector3(Math.cos(facing.current), shot ? 0.22 : 0.08, Math.sin(facing.current)).normalize()
          const force = shot ? 8.7 : 5.1
          ball.setLinvel({ x: velocity.current.x * 0.25, y: 0, z: velocity.current.z * 0.25 }, true)
          ball.applyImpulse({ x: direction.x * force, y: direction.y * force, z: direction.z * force }, true)
          ball.applyTorqueImpulse({ x: -direction.z * 0.07, y: direction.x * 0.14, z: direction.z * 0.05 }, true)
          kickCooldown.current = 0.55
          onEvent(shot ? 'Power shot' : 'Pass released')
        }
      }
      keyboard.current.pressed.delete(' ')
      keyboard.current.pressed.delete('e')
    } else {
      const ball = ballRef.current?.translation()
      const aiAggression = difficulty === 'Legendary' ? 1 : difficulty === 'Professional' ? 0.75 : 0.5
      const ballDistance = ball ? Math.hypot(ball.x - current.x, ball.z - current.z) : Number.POSITIVE_INFINITY
      const chaseRadius = 7 + aiAggression * 8
      const shouldChase = index > 0 && ball && ballDistance < chaseRadius && ((team === 'away' && ball.x > -12) || (team === 'home' && ball.x < 15))
      const target = shouldChase && ball ? new THREE.Vector3(ball.x, 0, ball.z) : homePosition
      const toTarget = target.clone().sub(new THREE.Vector3(current.x, 0, current.z))
      const distance = toTarget.length()
      if (distance > 0.2) {
        toTarget.normalize()
        const aiSpeed = shouldChase ? 4.2 + aiAggression * 1.9 : 1.5
        velocity.current.x = THREE.MathUtils.damp(velocity.current.x, toTarget.x * aiSpeed, 4.5, delta)
        velocity.current.z = THREE.MathUtils.damp(velocity.current.z, toTarget.z * aiSpeed, 4.5, delta)
        facing.current = Math.atan2(velocity.current.z, velocity.current.x)
      } else {
        velocity.current.multiplyScalar(0.86)
      }

      if (ball && ballDistance < 0.85 && kickCooldown.current === 0) {
        const attackDirection = team === 'home' ? 1 : -1
        ballRef.current?.applyImpulse({ x: attackDirection * (5.5 + aiAggression * 2.3), y: 1.1, z: (Math.sin(state.clock.elapsedTime + index) * 1.8) }, true)
        kickCooldown.current = 1.3
      }
    }

    const nextX = THREE.MathUtils.clamp(current.x + velocity.current.x * delta, -HALF_LENGTH + 0.5, HALF_LENGTH - 0.5)
    const nextZ = THREE.MathUtils.clamp(current.z + velocity.current.z * delta, -HALF_WIDTH + 0.5, HALF_WIDTH - 0.5)
    body.setNextKinematicTranslation({ x: nextX, y: PLAYER_HEIGHT / 2, z: nextZ })
    if (groupRef.current) groupRef.current.rotation.y = -facing.current + Math.PI / 2

    if (controlled) controlledPosition.current.set(nextX, PLAYER_HEIGHT / 2, nextZ)

    const movement = velocity.current.length()
    const stride = Math.sin(state.clock.elapsedTime * (movement > 7 ? 14 : 9) + index) * Math.min(0.7, movement * 0.09)
    if (leftLeg.current) leftLeg.current.rotation.x = stride
    if (rightLeg.current) rightLeg.current.rotation.x = -stride
    if (leftArm.current) leftArm.current.rotation.x = -stride * 0.72
    if (rightArm.current) rightArm.current.rotation.x = stride * 0.72
    if (groupRef.current) groupRef.current.position.y = Math.abs(stride) * 0.025
  })

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" colliders={false} position={position} enabledRotations={[false, false, false]}>
      <CapsuleCollider args={[0.5, 0.28]} position={[0, 0, 0]} friction={0.8} />
      <group ref={groupRef} scale={[buildScale, buildScale, buildScale]}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <capsuleGeometry args={[0.25, 0.52, 8, 14]} />
          <meshStandardMaterial color={color} roughness={0.68} />
        </mesh>
        <mesh position={[0, 0.35, -0.21]} castShadow>
          <boxGeometry args={[0.42, 0.34, 0.055]} />
          <meshStandardMaterial color="#f4f1e8" roughness={0.74} />
        </mesh>
        <mesh position={[0, 0.8, 0]} castShadow>
          <sphereGeometry args={[0.2, 20, 20]} />
          <meshPhysicalMaterial color={skin} roughness={0.62} clearcoat={0.06} />
        </mesh>
        <mesh position={[0, 0.98, 0]} castShadow>
          <sphereGeometry args={[0.205, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#171815" roughness={0.92} />
        </mesh>
        <Limb refValue={leftArm} position={[-0.34, 0.44, 0]} color={skin} />
        <Limb refValue={rightArm} position={[0.34, 0.44, 0]} color={skin} />
        <Limb refValue={leftLeg} position={[-0.14, -0.2, 0]} color="#f0f0eb" />
        <Limb refValue={rightLeg} position={[0.14, -0.2, 0]} color="#f0f0eb" />
        <mesh position={[-0.14, -0.89, 0.08]} castShadow>
          <boxGeometry args={[0.19, 0.12, 0.42]} />
          <meshStandardMaterial color="#141817" roughness={0.62} />
        </mesh>
        <mesh position={[0.14, -0.89, 0.08]} castShadow>
          <boxGeometry args={[0.19, 0.12, 0.42]} />
          <meshStandardMaterial color="#141817" roughness={0.62} />
        </mesh>
        {controlled && (
          <mesh position={[0, 1.45, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.22, 0.42, 3]} />
            <meshStandardMaterial color="#f2cc41" emissive="#d99d12" emissiveIntensity={0.9} />
          </mesh>
        )}
      </group>
    </RigidBody>
  )
}
