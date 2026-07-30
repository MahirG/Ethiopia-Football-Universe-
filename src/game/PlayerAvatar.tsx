import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { HALF_LENGTH, HALF_WIDTH, PLAYER_HEIGHT } from './config'
import type { Difficulty, QualityLevel, TeamSide } from './types'
import type { KeyboardState } from './useKeyboard'

interface PlayerAvatarProps {
  index: number
  team: TeamSide
  position: [number, number, number]
  color: string
  secondaryColor: string
  controlled?: boolean
  running: boolean
  difficulty: Difficulty
  quality: QualityLevel
  keyboard: { current: KeyboardState }
  ballRef: { current: RapierRigidBody | null }
  controlledPosition: { current: THREE.Vector3 }
  onEvent: (message: string) => void
}

const SKIN = ['#4d2a20', '#603528', '#75452f', '#8c593d', '#a86f50', '#bd8262']
const HAIR = ['#101210', '#1a1815', '#26201b', '#33271f']
const NAMES = ['TESHOME', 'GIRMA', 'BEKELE', 'DEREJE', 'ABEBE', 'TADESSE', 'MULUGETA', 'KASSA', 'MEKONNEN', 'DAWIT', 'SAMUEL']

function useShirtLabel(number: number, name: string) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext('2d')
    if (context) {
      context.clearRect(0, 0, 256, 256)
      context.fillStyle = '#f8f5e9'
      context.textAlign = 'center'
      context.font = '800 28px Arial'
      context.fillText(name, 128, 48)
      context.font = '900 132px Arial'
      context.fillText(String(number), 128, 178)
    }
    const value = new THREE.CanvasTexture(canvas)
    value.colorSpace = THREE.SRGBColorSpace
    value.anisotropy = 4
    return value
  }, [name, number])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function Arm({ side, skin, kit, upper, lower }: {
  side: -1 | 1
  skin: string
  kit: string
  upper: RefObject<THREE.Group | null>
  lower: RefObject<THREE.Group | null>
}) {
  return (
    <group ref={upper} position={[side * 0.34, 0.43, 0]}>
      <mesh position={[0, -0.17, 0]} castShadow>
        <capsuleGeometry args={[0.105, 0.21, 5, 9]} />
        <meshPhysicalMaterial color={kit} roughness={0.62} sheen={0.34} />
      </mesh>
      <group ref={lower} position={[0, -0.4, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <capsuleGeometry args={[0.078, 0.24, 5, 9]} />
          <meshPhysicalMaterial color={skin} roughness={0.55} clearcoat={0.05} />
        </mesh>
        <mesh position={[0, -0.39, 0]} castShadow>
          <sphereGeometry args={[0.085, 10, 9]} />
          <meshPhysicalMaterial color={skin} roughness={0.55} />
        </mesh>
      </group>
    </group>
  )
}

function Leg({ side, shorts, socks, boot, upper, lower, foot }: {
  side: -1 | 1
  shorts: string
  socks: string
  boot: string
  upper: RefObject<THREE.Group | null>
  lower: RefObject<THREE.Group | null>
  foot: RefObject<THREE.Group | null>
}) {
  return (
    <group ref={upper} position={[side * 0.145, -0.24, 0]}>
      <mesh position={[0, -0.23, 0]} castShadow>
        <capsuleGeometry args={[0.112, 0.32, 6, 10]} />
        <meshPhysicalMaterial color={shorts} roughness={0.7} sheen={0.18} />
      </mesh>
      <group ref={lower} position={[0, -0.52, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.084, 0.34, 6, 10]} />
          <meshPhysicalMaterial color={socks} roughness={0.76} />
        </mesh>
        <group ref={foot} position={[0, -0.52, 0.08]}>
          <mesh castShadow>
            <boxGeometry args={[0.19, 0.13, 0.42]} />
            <meshPhysicalMaterial color={boot} roughness={0.42} clearcoat={0.22} />
          </mesh>
          <mesh position={[0, -0.075, 0.07]}>
            <boxGeometry args={[0.15, 0.025, 0.27]} />
            <meshStandardMaterial color="#cdd2cc" roughness={0.65} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

export function PlayerAvatar({ index, team, position, color, secondaryColor, controlled = false, running, difficulty, quality, keyboard, ballRef, controlledPosition, onEvent }: PlayerAvatarProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const root = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftForearm = useRef<THREE.Group>(null)
  const rightForearm = useRef<THREE.Group>(null)
  const leftThigh = useRef<THREE.Group>(null)
  const rightThigh = useRef<THREE.Group>(null)
  const leftShin = useRef<THREE.Group>(null)
  const rightShin = useRef<THREE.Group>(null)
  const leftFoot = useRef<THREE.Group>(null)
  const rightFoot = useRef<THREE.Group>(null)
  const velocity = useRef(new THREE.Vector3())
  const facing = useRef(team === 'home' ? 0 : Math.PI)
  const cooldown = useRef(0)
  const kick = useRef(0)
  const fatigue = useRef(0)
  const home = useMemo(() => new THREE.Vector3(...position), [position])
  const currentVector = useMemo(() => new THREE.Vector3(), [])
  const ballVector = useMemo(() => new THREE.Vector3(), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])
  const seed = index + (team === 'away' ? 13 : 0)
  const height = 0.95 + (seed % 5) * 0.018
  const shoulders = 0.9 + (seed % 4) * 0.05
  const skin = SKIN[seed % SKIN.length]
  const hair = HAIR[(seed * 3) % HAIR.length]
  const goalkeeper = index === 0
  const kit = goalkeeper ? secondaryColor : color
  const trim = goalkeeper ? color : secondaryColor
  const socks = index % 3 === 0 ? trim : '#f0eee5'
  const boots = index % 4 === 0 ? '#773b31' : index % 4 === 1 ? '#d4bd46' : '#101412'
  const label = useShirtLabel(index + 1, NAMES[index % NAMES.length])

  useFrame((state, delta) => {
    const body = bodyRef.current
    if (!body) return
    const current = body.translation()
    currentVector.set(current.x, current.y, current.z)
    cooldown.current = Math.max(0, cooldown.current - delta)
    kick.current = Math.max(0, kick.current - delta)

    if (!running) {
      velocity.current.multiplyScalar(Math.pow(0.08, delta))
      fatigue.current = Math.max(0, fatigue.current - delta * 0.05)
    } else if (controlled) {
      const held = keyboard.current.held
      let x = 0
      let z = 0
      if (held.has('w') || held.has('arrowup')) x += 1
      if (held.has('s') || held.has('arrowdown')) x -= 1
      if (held.has('a') || held.has('arrowleft')) z -= 1
      if (held.has('d') || held.has('arrowright')) z += 1
      const length = Math.hypot(x, z)
      const sprinting = held.has('shift') && length > 0
      fatigue.current = THREE.MathUtils.clamp(fatigue.current + delta * (sprinting ? 0.034 : -0.018), 0, 1)
      const speed = (sprinting ? 9.5 : 6.45) * (1 - fatigue.current * 0.17)
      if (length > 0) {
        x /= length
        z /= length
        velocity.current.x = THREE.MathUtils.damp(velocity.current.x, x * speed, 10.5, delta)
        velocity.current.z = THREE.MathUtils.damp(velocity.current.z, z * speed, 10.5, delta)
        facing.current = Math.atan2(z, x)
      } else {
        velocity.current.x = THREE.MathUtils.damp(velocity.current.x, 0, 13, delta)
        velocity.current.z = THREE.MathUtils.damp(velocity.current.z, 0, 13, delta)
      }

      const ball = ballRef.current
      if (ball) {
        const ballPosition = ball.translation()
        ballVector.set(ballPosition.x, ballPosition.y, ballPosition.z)
        const distance = Math.hypot(ballPosition.x - current.x, ballPosition.z - current.z)
        const shot = keyboard.current.pressed.has(' ')
        const pass = keyboard.current.pressed.has('e')
        if ((shot || pass) && distance < 1.65 && cooldown.current === 0) {
          direction.set(Math.cos(facing.current), shot ? 0.18 : 0.08, Math.sin(facing.current)).normalize()
          const power = shot ? 9.8 : 5.8
          const curl = held.has('a') ? -1 : held.has('d') ? 1 : 0
          ball.applyImpulse({ x: direction.x * power, y: direction.y * power, z: direction.z * power }, true)
          ball.applyTorqueImpulse({ x: -direction.z * 0.085, y: curl * (shot ? 0.28 : 0.12), z: direction.x * 0.085 }, true)
          cooldown.current = 0.52
          kick.current = 0.34
          onEvent(shot ? 'Power shot · spin engaged' : 'Weighted pass released')
        } else if (distance < 1.25 && velocity.current.lengthSq() > 1.1) {
          target.set(current.x + Math.cos(facing.current) * 0.92, 0.16, current.z + Math.sin(facing.current) * 0.92)
          direction.copy(target).sub(ballVector).multiplyScalar(0.065)
          const ballVelocity = ball.linvel()
          direction.x -= ballVelocity.x * 0.006
          direction.z -= ballVelocity.z * 0.006
          ball.applyImpulse({ x: direction.x, y: Math.max(0, direction.y * 0.15), z: direction.z }, true)
        }
      }
      keyboard.current.pressed.delete(' ')
      keyboard.current.pressed.delete('e')
    } else {
      const ball = ballRef.current?.translation()
      const aggression = difficulty === 'Legendary' ? 1 : difficulty === 'Professional' ? 0.76 : 0.52
      const distanceToBall = ball ? Math.hypot(ball.x - current.x, ball.z - current.z) : Number.POSITIVE_INFINITY
      const chase = index > 0 && ball && distanceToBall < 7 + aggression * 8.5
      if (chase && ball) target.set(ball.x, 0, ball.z)
      else target.copy(home)
      direction.set(target.x - current.x, 0, target.z - current.z)
      if (direction.length() > 0.2) {
        direction.normalize()
        const speed = chase ? 4.25 + aggression * 2 : 1.55
        velocity.current.x = THREE.MathUtils.damp(velocity.current.x, direction.x * speed, 4.8, delta)
        velocity.current.z = THREE.MathUtils.damp(velocity.current.z, direction.z * speed, 4.8, delta)
        facing.current = Math.atan2(velocity.current.z, velocity.current.x)
      } else velocity.current.multiplyScalar(Math.pow(0.12, delta))
      if (ball && distanceToBall < 0.88 && cooldown.current === 0) {
        const attack = team === 'home' ? 1 : -1
        ballRef.current?.applyImpulse({ x: attack * (5.5 + aggression * 2.4), y: 1.05, z: Math.sin(state.clock.elapsedTime + index) * 1.75 }, true)
        cooldown.current = 1.2
        kick.current = 0.28
      }
    }

    const nextX = THREE.MathUtils.clamp(current.x + velocity.current.x * delta, -HALF_LENGTH + 0.5, HALF_LENGTH - 0.5)
    const nextZ = THREE.MathUtils.clamp(current.z + velocity.current.z * delta, -HALF_WIDTH + 0.5, HALF_WIDTH - 0.5)
    body.setNextKinematicTranslation({ x: nextX, y: PLAYER_HEIGHT / 2, z: nextZ })
    if (controlled) controlledPosition.current.set(nextX, PLAYER_HEIGHT / 2, nextZ)

    const movement = velocity.current.length()
    const frequency = movement > 7.2 ? 14.5 : movement > 2.2 ? 9.4 : 3.4
    const stride = Math.sin(state.clock.elapsedTime * frequency + index * 0.4) * Math.min(0.78, movement * 0.09)
    const kneeLeft = Math.max(0, -stride) * 0.72
    const kneeRight = Math.max(0, stride) * 0.72
    const kickProgress = kick.current > 0 ? Math.sin((1 - kick.current / 0.34) * Math.PI) : 0
    if (root.current) {
      root.current.rotation.y = -facing.current + Math.PI / 2
      root.current.position.y = Math.abs(stride) * 0.026
      root.current.rotation.z = THREE.MathUtils.damp(root.current.rotation.z, -velocity.current.z * 0.018, 7, delta)
    }
    if (torso.current) {
      torso.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * (movement > 5 ? 5.2 : 2.4) + index) * 0.012 + fatigue.current * 0.018
    }
    if (leftThigh.current) leftThigh.current.rotation.x = stride
    if (rightThigh.current) rightThigh.current.rotation.x = -stride - kickProgress * 1.35
    if (leftShin.current) leftShin.current.rotation.x = kneeLeft
    if (rightShin.current) rightShin.current.rotation.x = kneeRight + kickProgress * 0.58
    if (leftFoot.current) leftFoot.current.rotation.x = -kneeLeft * 0.42
    if (rightFoot.current) rightFoot.current.rotation.x = -kneeRight * 0.42 + kickProgress * 0.28
    if (leftArm.current) leftArm.current.rotation.x = -stride * 0.7
    if (rightArm.current) rightArm.current.rotation.x = stride * 0.7
    if (leftForearm.current) leftForearm.current.rotation.x = Math.abs(stride) * 0.22
    if (rightForearm.current) rightForearm.current.rotation.x = Math.abs(stride) * 0.22
    const trackedBall = ballRef.current?.translation()
    if (head.current && trackedBall) {
      const angle = Math.atan2(trackedBall.z - current.z, trackedBall.x - current.x) - facing.current
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, THREE.MathUtils.clamp(Math.atan2(Math.sin(angle), Math.cos(angle)), -0.58, 0.58), 7.5, delta)
    }
  })

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" colliders={false} position={position} enabledRotations={[false, false, false]}>
      <CapsuleCollider args={[0.5, 0.27 * shoulders]} friction={0.82} />
      <group ref={root} scale={[shoulders, height, 1]}>
        <group ref={torso}>
          <mesh position={[0, 0.22, 0]} castShadow><capsuleGeometry args={[0.265, 0.5, quality === 'performance' ? 6 : 9, quality === 'performance' ? 10 : 16]} /><meshPhysicalMaterial color={kit} roughness={0.57} sheen={0.44} /></mesh>
          <mesh position={[0, 0.47, 0.02]} castShadow><cylinderGeometry args={[0.255, 0.315, 0.09, 16]} /><meshPhysicalMaterial color={trim} roughness={0.62} /></mesh>
          <mesh position={[0, -0.17, 0]} castShadow><boxGeometry args={[0.5, 0.26, 0.42]} /><meshPhysicalMaterial color={kit} roughness={0.66} sheen={0.3} /></mesh>
          <mesh position={[0, 0.22, -0.274]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.43, 0.48]} /><meshBasicMaterial map={label} transparent depthWrite={false} toneMapped={false} /></mesh>
        </group>
        <group ref={head}>
          <mesh position={[0, 0.79, 0]} castShadow><sphereGeometry args={[0.205, quality === 'performance' ? 14 : 22, 18]} /><meshPhysicalMaterial color={skin} roughness={0.5} clearcoat={0.06} /></mesh>
          <mesh position={[0, 0.78, 0.195]} castShadow><coneGeometry args={[0.044, 0.12, 8]} /><meshPhysicalMaterial color={skin} roughness={0.55} /></mesh>
          <mesh position={[0, 0.96, 0]} castShadow><sphereGeometry args={[0.208, quality === 'performance' ? 12 : 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={hair} roughness={0.96} /></mesh>
          {quality !== 'performance' && <><mesh position={[-0.073, 0.835, 0.188]}><sphereGeometry args={[0.018, 8, 8]} /><meshBasicMaterial color="#171817" /></mesh><mesh position={[0.073, 0.835, 0.188]}><sphereGeometry args={[0.018, 8, 8]} /><meshBasicMaterial color="#171817" /></mesh></>}
        </group>
        <Arm side={-1} skin={skin} kit={kit} upper={leftArm} lower={leftForearm} />
        <Arm side={1} skin={skin} kit={kit} upper={rightArm} lower={rightForearm} />
        <Leg side={-1} shorts={kit} socks={socks} boot={boots} upper={leftThigh} lower={leftShin} foot={leftFoot} />
        <Leg side={1} shorts={kit} socks={socks} boot={boots} upper={rightThigh} lower={rightShin} foot={rightFoot} />
        {controlled && <group position={[0, 1.44, 0]}><mesh rotation={[0, 0, Math.PI]}><coneGeometry args={[0.22, 0.42, 3]} /><meshStandardMaterial color="#f2cc41" emissive="#d99d12" emissiveIntensity={1.05} /></mesh><pointLight color="#f2cc41" intensity={0.48} distance={2.4} /></group>}
      </group>
    </RigidBody>
  )
}
