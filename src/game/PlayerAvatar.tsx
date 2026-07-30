import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { HALF_LENGTH, HALF_WIDTH, PLAYER_HEIGHT } from './config'
import type { Difficulty, MatchAction, PresentationPhase, QualityLevel, TeamSide } from './types'
import type { KeyboardState } from './useKeyboard'

interface Props {
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
  matchProgress: number
  presentationPhase: PresentationPhase
  celebrationTeam: TeamSide | null
  onEvent: (message: string) => void
  onAction: (action: MatchAction, team: TeamSide) => void
}

const SKINS = ['#4f2b20', '#603526', '#73422d', '#89563b', '#a56d4e', '#bd8060']
const NAMES = ['TESHOME', 'GIRMA', 'BEKELE', 'DEREJE', 'ABEBE', 'TADESSE', 'MULUGETA', 'KASSA', 'MEKONNEN', 'DAWIT', 'SAMUEL']

function Label({ number, name }: { number: number; name: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext('2d')
    if (context) {
      context.fillStyle = '#f7f5ea'
      context.textAlign = 'center'
      context.font = '800 28px Arial'
      context.fillText(name, 128, 42)
      context.font = '900 132px Arial'
      context.fillText(String(number), 128, 174)
    }
    const value = new THREE.CanvasTexture(canvas)
    value.colorSpace = THREE.SRGBColorSpace
    return value
  }, [name, number])
  return <mesh position={[0, 0.25, -0.275]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.42, 0.5]} /><meshBasicMaterial map={texture} transparent toneMapped={false} /></mesh>
}

function Limb({ side, upper, lower, boot, upperRef, lowerRef }: { side: -1 | 1; upper: string; lower: string; boot?: boolean; upperRef: React.RefObject<THREE.Group | null>; lowerRef: React.RefObject<THREE.Group | null> }) {
  return <group ref={upperRef} position={[side * 0.2, boot ? -0.18 : 0.42, 0]}>
    <mesh position={[0, -0.2, 0]} castShadow><capsuleGeometry args={[boot ? 0.11 : 0.095, boot ? 0.34 : 0.24, 5, 9]} /><meshPhysicalMaterial color={upper} roughness={0.66} sheen={0.22} /></mesh>
    <group ref={lowerRef} position={[0, boot ? -0.53 : -0.42, 0]}>
      <mesh position={[0, -0.21, 0]} castShadow><capsuleGeometry args={[0.078, boot ? 0.32 : 0.22, 5, 9]} /><meshPhysicalMaterial color={lower} roughness={0.62} /></mesh>
      {boot ? <mesh position={[0, -0.45, 0.12]} castShadow><boxGeometry args={[0.18, 0.12, 0.4]} /><meshPhysicalMaterial color="#121514" roughness={0.4} clearcoat={0.22} /></mesh> : <mesh position={[0, -0.4, 0]}><sphereGeometry args={[0.085, 10, 8]} /><meshPhysicalMaterial color={lower} roughness={0.58} /></mesh>}
    </group>
  </group>
}

export function PlayerAvatar({ index, team, position, color, secondaryColor, controlled = false, running, difficulty, quality, keyboard, ballRef, controlledPosition, matchProgress, presentationPhase, celebrationTeam, onEvent, onAction }: Props) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const modelRef = useRef<THREE.Group>(null)
  const torsoRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftForearm = useRef<THREE.Group>(null)
  const rightForearm = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)
  const leftShin = useRef<THREE.Group>(null)
  const rightShin = useRef<THREE.Group>(null)
  const eyelids = useRef<Array<THREE.Mesh | null>>([])
  const mouthRef = useRef<THREE.Mesh>(null)
  const skinMaterial = useRef<THREE.MeshPhysicalMaterial>(null)
  const velocity = useRef(new THREE.Vector3())
  const facing = useRef(team === 'home' ? 0 : Math.PI)
  const kick = useRef(0)
  const cooldown = useRef(0)
  const fatigue = useRef(0)
  const anchor = useMemo(() => new THREE.Vector3(...position), [position])
  const current = useMemo(() => new THREE.Vector3(), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])
  const skin = SKINS[(index + (team === 'away' ? 2 : 0)) % SKINS.length]
  const goalkeeper = index === 0
  const kit = goalkeeper ? secondaryColor : color
  const trim = goalkeeper ? color : secondaryColor
  const build = 0.92 + ((index * 7 + (team === 'away' ? 3 : 0)) % 5) * 0.035

  useFrame((state, delta) => {
    const body = bodyRef.current
    if (!body) return
    const translation = body.translation()
    current.set(translation.x, translation.y, translation.z)
    cooldown.current = Math.max(0, cooldown.current - delta)
    kick.current = Math.max(0, kick.current - delta)
    const ball = ballRef.current
    const ballTranslation = ball?.translation()

    if (!running || presentationPhase !== 'live') velocity.current.multiplyScalar(Math.pow(0.05, delta))
    else if (controlled) {
      const held = keyboard.current.held
      let x = Number(held.has('w') || held.has('arrowup')) - Number(held.has('s') || held.has('arrowdown'))
      let z = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'))
      const length = Math.hypot(x, z)
      const sprint = held.has('shift') && length > 0
      fatigue.current = THREE.MathUtils.clamp(Math.max(matchProgress * 0.36, fatigue.current + delta * (sprint ? 0.035 : -0.016)), 0, 1)
      const speed = (sprint ? 9.4 : 6.35) * (1 - (fatigue.current + matchProgress * 0.28) * 0.2)
      if (length > 0) {
        x /= length; z /= length
        velocity.current.x = THREE.MathUtils.damp(velocity.current.x, x * speed, 10, delta)
        velocity.current.z = THREE.MathUtils.damp(velocity.current.z, z * speed, 10, delta)
        facing.current = Math.atan2(z, x)
      } else velocity.current.multiplyScalar(Math.pow(0.08, delta))

      if (ball && ballTranslation) {
        direction.set(ballTranslation.x - current.x, 0, ballTranslation.z - current.z)
        const distance = direction.length()
        if (distance < 1.35 && ball.linvel().x * ball.linvel().x + ball.linvel().z * ball.linvel().z < 85) {
          const frontX = Math.cos(facing.current)
          const frontZ = Math.sin(facing.current)
          ball.setLinvel({ x: velocity.current.x + frontX * 1.6, y: ball.linvel().y, z: velocity.current.z + frontZ * 1.6 }, true)
        }
        const shoot = keyboard.current.pressed.has(' ')
        const pass = keyboard.current.pressed.has('e')
        if ((shoot || pass) && distance < 2 && cooldown.current === 0) {
          keyboard.current.pressed.delete(shoot ? ' ' : 'e')
          const power = shoot ? 15.8 : 8.7
          const frontX = Math.cos(facing.current)
          const frontZ = Math.sin(facing.current)
          ball.setLinvel({ x: frontX * power, y: shoot ? 2.5 : 0.55, z: frontZ * power }, true)
          ball.setAngvel({ x: -frontZ * 8, y: shoot ? 4 : 1.4, z: frontX * 8 }, true)
          kick.current = 0.34; cooldown.current = 0.42
          onAction(shoot ? 'shot' : 'pass', team)
          onEvent(shoot ? 'Shot unleashed' : 'Pass released')
        }
      }
    } else {
      const pressure = difficulty === 'Legendary' ? 15 : difficulty === 'Professional' ? 10 : 7
      const nearBall = ballTranslation && Math.hypot(ballTranslation.x - current.x, ballTranslation.z - current.z) < pressure
      if (nearBall && ballTranslation) target.set(ballTranslation.x, PLAYER_HEIGHT / 2, ballTranslation.z)
      else target.copy(anchor).add(new THREE.Vector3(Math.sin(state.clock.elapsedTime * 0.22 + index) * 1.2, 0, Math.cos(state.clock.elapsedTime * 0.18 + index) * 0.9))
      direction.subVectors(target, current); direction.y = 0
      const distance = direction.length()
      if (distance > 0.2) {
        direction.normalize()
        const speed = nearBall ? (difficulty === 'Legendary' ? 6.2 : 4.8) : 1.7
        velocity.current.lerp(direction.multiplyScalar(speed), 1 - Math.exp(-4 * delta))
        facing.current = Math.atan2(velocity.current.z, velocity.current.x)
      } else velocity.current.multiplyScalar(0.8)
      if (ball && ballTranslation && Math.hypot(ballTranslation.x - current.x, ballTranslation.z - current.z) < 1.05 && cooldown.current === 0) {
        const attack = team === 'home' ? 1 : -1
        ball.setLinvel({ x: attack * (7 + Math.random() * 5), y: 0.7 + Math.random(), z: (Math.random() - 0.5) * 5 }, true)
        cooldown.current = 1.1
        onAction(Math.random() > 0.72 ? 'shot' : 'pass', team)
      }
    }

    const nextX = THREE.MathUtils.clamp(current.x + velocity.current.x * delta, -HALF_LENGTH + 0.5, HALF_LENGTH - 0.5)
    const nextZ = THREE.MathUtils.clamp(current.z + velocity.current.z * delta, -HALF_WIDTH + 0.5, HALF_WIDTH - 0.5)
    body.setNextKinematicTranslation({ x: nextX, y: PLAYER_HEIGHT / 2, z: nextZ })
    if (controlled) controlledPosition.current.set(nextX, PLAYER_HEIGHT / 2, nextZ)

    const speed = velocity.current.length()
    const stride = Math.sin(state.clock.elapsedTime * (speed > 7 ? 14 : speed > 2 ? 9 : 3) + index) * Math.min(0.75, speed * 0.09)
    const kickPose = kick.current > 0 ? Math.sin((1 - kick.current / 0.34) * Math.PI) : 0
    const celebrate = celebrationTeam === team && (presentationPhase === 'live' || presentationPhase === 'fulltime')
    if (modelRef.current) {
      modelRef.current.rotation.y = -facing.current + Math.PI / 2
      modelRef.current.position.y = Math.abs(stride) * 0.025 + (celebrate ? Math.abs(Math.sin(state.clock.elapsedTime * 7 + index)) * 0.07 : 0)
    }
    if (torsoRef.current) {
      torsoRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * (speed > 5 ? 5 : 2.4) + index) * 0.012 + matchProgress * 0.016
      torsoRef.current.rotation.x = THREE.MathUtils.damp(torsoRef.current.rotation.x, matchProgress > 0.75 && speed < 1 ? 0.12 : 0, 4, delta)
    }
    if (leftLeg.current) leftLeg.current.rotation.x = stride
    if (rightLeg.current) rightLeg.current.rotation.x = -stride - kickPose * 1.35
    if (leftShin.current) leftShin.current.rotation.x = Math.max(0, -stride) * 0.65
    if (rightShin.current) rightShin.current.rotation.x = Math.max(0, stride) * 0.65 + kickPose * 0.5
    if (leftArm.current) { leftArm.current.rotation.x = celebrate ? -2.25 : -stride * 0.7; leftArm.current.rotation.z = celebrate ? -0.5 : 0 }
    if (rightArm.current) { rightArm.current.rotation.x = celebrate ? -2.25 : stride * 0.7; rightArm.current.rotation.z = celebrate ? 0.5 : 0 }
    if (leftForearm.current) leftForearm.current.rotation.x = Math.abs(stride) * 0.2
    if (rightForearm.current) rightForearm.current.rotation.x = Math.abs(stride) * 0.2

    if (headRef.current && ballTranslation) {
      const angle = Math.atan2(ballTranslation.z - current.z, ballTranslation.x - current.x) - facing.current
      headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, THREE.MathUtils.clamp(Math.atan2(Math.sin(angle), Math.cos(angle)), -0.55, 0.55), 7, delta)
    }
    const blinkCycle = (state.clock.elapsedTime + index * 0.47) % (3.1 + (index % 4) * 0.4)
    const blink = blinkCycle < 0.11 ? Math.sin(blinkCycle / 0.11 * Math.PI) : 0
    eyelids.current.forEach((lid) => { if (lid) lid.scale.y = 0.12 + blink })
    if (mouthRef.current) mouthRef.current.scale.y = THREE.MathUtils.damp(mouthRef.current.scale.y, celebrate ? 1.6 : speed > 6 ? 0.95 : 0.42, 8, delta)
    if (skinMaterial.current) { skinMaterial.current.clearcoat = 0.06 + matchProgress * 0.3; skinMaterial.current.roughness = 0.5 - matchProgress * 0.12 }
  })

  return <RigidBody ref={bodyRef} type="kinematicPosition" colliders={false} position={position} enabledRotations={[false, false, false]}>
    <CapsuleCollider args={[0.5, 0.27 * build]} />
    <group ref={modelRef} scale={[build, 0.98 + index % 4 * 0.018, 1]}>
      <group ref={torsoRef}>
        <mesh position={[0, 0.22, 0]} castShadow><capsuleGeometry args={[0.27, 0.5, quality === 'performance' ? 6 : 9, 14]} /><meshPhysicalMaterial color={kit} roughness={0.57} sheen={0.42} /></mesh>
        <mesh position={[0, -0.18, 0]} castShadow><boxGeometry args={[0.51, 0.26, 0.43]} /><meshPhysicalMaterial color={kit} roughness={0.66} sheen={0.28} /></mesh>
        <mesh position={[0, 0.48, 0]} castShadow><cylinderGeometry args={[0.25, 0.31, 0.09, 16]} /><meshPhysicalMaterial color={trim} roughness={0.62} /></mesh>
        <Label number={index + 1} name={NAMES[index % NAMES.length]} />
      </group>
      <group ref={headRef}>
        <mesh position={[0, 0.8, 0]} castShadow><sphereGeometry args={[0.205, quality === 'performance' ? 14 : 22, 18]} /><meshPhysicalMaterial ref={skinMaterial} color={skin} roughness={0.5} clearcoat={0.06} /></mesh>
        <mesh position={[0, 0.98, 0]} castShadow><sphereGeometry args={[0.205, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#171714" roughness={0.96} /></mesh>
        {quality !== 'performance' && <><mesh position={[-0.07, 0.84, 0.19]}><sphereGeometry args={[0.018, 8, 8]} /><meshBasicMaterial color="#171717" /></mesh><mesh position={[0.07, 0.84, 0.19]}><sphereGeometry args={[0.018, 8, 8]} /><meshBasicMaterial color="#171717" /></mesh>{[-0.07, 0.07].map((x, i) => <mesh key={x} ref={(node) => { eyelids.current[i] = node }} position={[x, 0.85, 0.205]}><boxGeometry args={[0.052, 0.018, 0.008]} /><meshBasicMaterial color={skin} /></mesh>)}<mesh ref={mouthRef} position={[0, 0.72, 0.195]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.009, 0.055, 3, 7]} /><meshStandardMaterial color="#48251d" /></mesh></>}
      </group>
      <Limb side={-1} upper={kit} lower={skin} upperRef={leftArm} lowerRef={leftForearm} />
      <Limb side={1} upper={kit} lower={skin} upperRef={rightArm} lowerRef={rightForearm} />
      <Limb side={-1} upper={kit} lower="#f2f0e7" boot upperRef={leftLeg} lowerRef={leftShin} />
      <Limb side={1} upper={kit} lower="#f2f0e7" boot upperRef={rightLeg} lowerRef={rightShin} />
      {quality !== 'performance' && matchProgress > 0.2 && <mesh position={[-0.18, -0.18, 0.23]}><circleGeometry args={[0.1 + matchProgress * 0.06, 12]} /><meshBasicMaterial color="#3d281c" transparent opacity={0.08 + matchProgress * 0.23} depthWrite={false} /></mesh>}
      {controlled && <group position={[0, 1.45, 0]}><mesh rotation={[0, 0, Math.PI]}><coneGeometry args={[0.22, 0.42, 3]} /><meshStandardMaterial color="#f2cc41" emissive="#d99d12" emissiveIntensity={1.05} /></mesh><pointLight color="#f2cc41" intensity={0.45} distance={2.4} /></group>}
    </group>
  </RigidBody>
}
