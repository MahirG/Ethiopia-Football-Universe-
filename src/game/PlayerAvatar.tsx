import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { HALF_LENGTH, HALF_WIDTH, PLAYER_HEIGHT } from './config'
import type { Difficulty, MatchAction, PresentationPhase, QualityLevel, TeamSide } from './types'
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
  matchProgress: number
  presentationPhase: PresentationPhase
  celebrationTeam: TeamSide | null
  onEvent: (message: string) => void
  onAction: (action: MatchAction, team: TeamSide) => void
}

const SKIN_TONES = ['#4d2a20', '#603526', '#75432e', '#8d5a3e', '#a96f50', '#bd8060']
const HAIR_TONES = ['#101210', '#1c1814', '#29211b', '#382a21']

function createProfile(index: number, team: TeamSide) {
  const seed = index + (team === 'away' ? 17 : 0)
  return {
    skin: SKIN_TONES[seed % SKIN_TONES.length],
    hair: HAIR_TONES[(seed * 3) % HAIR_TONES.length],
    height: 0.96 + (seed % 5) * 0.018,
    width: 0.92 + ((seed * 5) % 4) * 0.045,
    faceWidth: 0.93 + ((seed * 7) % 4) * 0.03,
    curls: seed % 3 === 2,
    beard: seed % 4 === 1,
  }
}

function HumanLimb({ side, skin, kit, leg, upperRef, lowerRef }: {
  side: -1 | 1
  skin: string
  kit: string
  leg?: boolean
  upperRef: RefObject<THREE.Group | null>
  lowerRef: RefObject<THREE.Group | null>
}) {
  const upperLength = leg ? 0.37 : 0.27
  const lowerLength = leg ? 0.39 : 0.29
  const x = side * (leg ? 0.15 : 0.35)

  return (
    <group ref={upperRef} position={[x, leg ? -0.25 : 0.42, 0]}>
      <mesh position={[0, -upperLength / 2, 0]} castShadow>
        <capsuleGeometry args={[leg ? 0.11 : 0.095, upperLength, 6, 10]} />
        <meshPhysicalMaterial color={kit} roughness={0.62} sheen={0.24} />
      </mesh>
      <mesh position={[0, -upperLength, 0]} castShadow>
        <sphereGeometry args={[leg ? 0.105 : 0.085, 12, 10]} />
        <meshStandardMaterial color={leg ? kit : skin} roughness={0.62} />
      </mesh>
      <group ref={lowerRef} position={[0, -upperLength, 0]}>
        <mesh position={[0, -lowerLength / 2, 0]} castShadow>
          <capsuleGeometry args={[leg ? 0.085 : 0.075, lowerLength, 6, 10]} />
          <meshPhysicalMaterial color={leg ? '#f4f1e8' : skin} roughness={0.57} clearcoat={0.04} />
        </mesh>
        {leg ? (
          <mesh position={[0, -lowerLength - 0.05, 0.09]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.5, 0.72]} castShadow>
            <capsuleGeometry args={[0.095, 0.24, 5, 10]} />
            <meshPhysicalMaterial color="#111514" roughness={0.4} clearcoat={0.22} />
          </mesh>
        ) : (
          <mesh position={[0, -lowerLength - 0.055, 0.01]} scale={[0.82, 1.08, 0.68]} castShadow>
            <sphereGeometry args={[0.095, 12, 10]} />
            <meshPhysicalMaterial color={skin} roughness={0.54} clearcoat={0.05} />
          </mesh>
        )}
      </group>
    </group>
  )
}

function HumanHead({ skin, hair, faceWidth, curls, beard, quality, headRef }: {
  skin: string
  hair: string
  faceWidth: number
  curls: boolean
  beard: boolean
  quality: QualityLevel
  headRef: RefObject<THREE.Group | null>
}) {
  const segments = quality === 'performance' ? 14 : 24

  return (
    <group ref={headRef} position={[0, 0.78, 0]}>
      <mesh castShadow scale={[faceWidth, 1.04, 0.92]}>
        <sphereGeometry args={[0.205, segments, Math.max(10, segments - 4)]} />
        <meshPhysicalMaterial color={skin} roughness={0.5} clearcoat={0.08} />
      </mesh>
      <mesh position={[0, -0.13, 0.015]} scale={[faceWidth * 0.94, 0.62, 0.82]} castShadow>
        <sphereGeometry args={[0.19, 16, 12]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.01, 0.198]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.046, 0.13, 10]} />
        <meshStandardMaterial color={skin} roughness={0.56} />
      </mesh>
      {[-0.072, 0.072].map((x) => (
        <group key={x} position={[x, 0.065, 0.19]}>
          <mesh scale={[1.1, 0.62, 0.5]}><sphereGeometry args={[0.03, 10, 8]} /><meshBasicMaterial color="#eee9df" /></mesh>
          <mesh position={[0, 0, 0.019]}><sphereGeometry args={[0.014, 8, 8]} /><meshPhysicalMaterial color="#35251e" roughness={0.3} clearcoat={0.5} /></mesh>
        </group>
      ))}
      <mesh position={[0, -0.095, 0.19]} scale={[1.2, 0.45, 0.55]}>
        <sphereGeometry args={[0.064, 12, 8]} />
        <meshStandardMaterial color="#512c25" roughness={0.74} />
      </mesh>
      {beard && (
        <mesh position={[0, -0.155, 0.12]} scale={[faceWidth, 0.64, 0.82]}>
          <sphereGeometry args={[0.19, 16, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5]} />
          <meshStandardMaterial color={hair} roughness={0.96} transparent opacity={0.48} />
        </mesh>
      )}
      <mesh position={[0, 0.135, -0.015]} castShadow>
        <sphereGeometry args={[0.205, quality === 'performance' ? 12 : 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={hair} roughness={0.96} />
      </mesh>
      {curls && quality !== 'performance' && Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.13, 0.19 + (index % 2) * 0.035, Math.sin(angle) * 0.1]}>
            <sphereGeometry args={[0.055, 8, 7]} />
            <meshStandardMaterial color={hair} roughness={0.98} />
          </mesh>
        )
      })}
    </group>
  )
}

export function PlayerAvatar({
  index,
  team,
  position,
  color,
  secondaryColor,
  controlled = false,
  running,
  difficulty,
  quality,
  keyboard,
  ballRef,
  controlledPosition,
  matchProgress,
  presentationPhase,
  celebrationTeam,
  onEvent,
  onAction,
}: PlayerAvatarProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const rootRef = useRef<THREE.Group>(null)
  const torsoRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftForearm = useRef<THREE.Group>(null)
  const rightForearm = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)
  const leftCalf = useRef<THREE.Group>(null)
  const rightCalf = useRef<THREE.Group>(null)
  const velocity = useRef(new THREE.Vector3())
  const facing = useRef(team === 'home' ? 0 : Math.PI)
  const cooldown = useRef(0)
  const fatigue = useRef(0)

  const profile = useMemo(() => createProfile(index, team), [index, team])
  const anchor = useMemo(() => new THREE.Vector3(...position), [position])
  const target = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])
  const goalkeeper = index === 0
  const kit = goalkeeper ? secondaryColor : color

  useFrame((state, delta) => {
    const body = bodyRef.current
    if (!body) return

    const current = body.translation()
    const ball = ballRef.current
    const ballTranslation = ball?.translation()
    cooldown.current = Math.max(0, cooldown.current - delta)

    if (!running) {
      velocity.current.multiplyScalar(Math.pow(0.08, delta))
    } else if (controlled) {
      const held = keyboard.current.held
      let x = Number(held.has('w') || held.has('arrowup')) - Number(held.has('s') || held.has('arrowdown'))
      let z = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'))
      const inputLength = Math.hypot(x, z)
      const sprinting = held.has('shift') && inputLength > 0
      const baselineFatigue = matchProgress * 0.18
      fatigue.current = THREE.MathUtils.clamp(fatigue.current + delta * (sprinting ? 0.04 : -0.018), baselineFatigue, 1)

      if (inputLength > 0) {
        x /= inputLength
        z /= inputLength
        facing.current = Math.atan2(z, x)
      }

      const movementSpeed = (sprinting ? 9.2 : 6.25) * (1 - fatigue.current * 0.2)
      velocity.current.x = THREE.MathUtils.damp(velocity.current.x, x * movementSpeed, 11, delta)
      velocity.current.z = THREE.MathUtils.damp(velocity.current.z, z * movementSpeed, 11, delta)

      if (ball && ballTranslation) {
        const distanceToBall = Math.hypot(ballTranslation.x - current.x, ballTranslation.z - current.z)
        const shooting = keyboard.current.pressed.has(' ')
        const passing = keyboard.current.pressed.has('e')
        if ((shooting || passing) && distanceToBall < 1.55 && cooldown.current === 0) {
          direction.set(Math.cos(facing.current), shooting ? 0.2 : 0.065, Math.sin(facing.current)).normalize()
          const force = shooting ? 8.9 : 5.15
          ball.applyImpulse({ x: direction.x * force, y: direction.y * force, z: direction.z * force }, true)
          ball.applyTorqueImpulse({ x: -direction.z * 0.08, y: held.has('a') ? -0.24 : held.has('d') ? 0.24 : 0, z: direction.x * 0.08 }, true)
          cooldown.current = 0.52
          onAction(shooting ? 'shot' : 'pass', team)
          onEvent(shooting ? 'Power shot · spin engaged' : 'Weighted pass released')
        }
      }
      keyboard.current.pressed.delete(' ')
      keyboard.current.pressed.delete('e')
    } else {
      const ownGoalX = team === 'home' ? -HALF_LENGTH + 0.9 : HALF_LENGTH - 0.9
      const attackDirection = team === 'home' ? 1 : -1
      const ballVelocity = ball?.linvel()
      const shotThreat = Boolean(goalkeeper && ballTranslation && ballVelocity && ((team === 'home' && ballVelocity.x < -1) || (team === 'away' && ballVelocity.x > 1)) && Math.abs(ballTranslation.x - ownGoalX) < 18)

      if (goalkeeper) {
        target.set(ownGoalX + attackDirection * 1.1, 0, THREE.MathUtils.clamp(shotThreat && ballTranslation ? ballTranslation.z : (ballTranslation?.z ?? 0) * 0.35, -3.1, 3.1))
      } else if (ballTranslation && Math.hypot(ballTranslation.x - current.x, ballTranslation.z - current.z) < 8 + (difficulty === 'Legendary' ? 8 : 4)) {
        target.set(ballTranslation.x, 0, ballTranslation.z)
      } else {
        target.copy(anchor)
      }

      direction.set(target.x - current.x, 0, target.z - current.z)
      if (direction.lengthSq() > 0.05) {
        direction.normalize()
        const aiSpeed = shotThreat ? 7.4 : goalkeeper ? 2.4 : 2.1
        velocity.current.x = THREE.MathUtils.damp(velocity.current.x, direction.x * aiSpeed, 6, delta)
        velocity.current.z = THREE.MathUtils.damp(velocity.current.z, direction.z * aiSpeed, 6, delta)
        facing.current = Math.atan2(velocity.current.z, velocity.current.x)
      } else {
        velocity.current.multiplyScalar(Math.pow(0.12, delta))
      }

      if (goalkeeper && ball && ballTranslation && Math.hypot(ballTranslation.x - current.x, ballTranslation.z - current.z) < 1.35 && cooldown.current === 0) {
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.applyImpulse({ x: -attackDirection * 8.8, y: 2.25, z: -ballTranslation.z * 0.22 }, true)
        cooldown.current = 1.1
        onAction('save', team)
        onEvent('Goalkeeper save · strong hands')
      }
    }

    const nextX = THREE.MathUtils.clamp(current.x + velocity.current.x * delta, -HALF_LENGTH + 0.5, HALF_LENGTH - 0.5)
    const nextZ = THREE.MathUtils.clamp(current.z + velocity.current.z * delta, -HALF_WIDTH + 0.5, HALF_WIDTH - 0.5)
    body.setNextKinematicTranslation({ x: nextX, y: PLAYER_HEIGHT / 2, z: nextZ })
    if (controlled) controlledPosition.current.set(nextX, PLAYER_HEIGHT / 2, nextZ)

    const speed = velocity.current.length()
    const stride = Math.sin(state.clock.elapsedTime * (speed > 6 ? 14 : 9) + index * 0.4) * Math.min(0.78, speed * 0.09)
    const leftKnee = Math.max(0, -stride) * 0.7
    const rightKnee = Math.max(0, stride) * 0.7

    if (rootRef.current) {
      rootRef.current.rotation.y = -facing.current + Math.PI / 2
      rootRef.current.position.y = Math.abs(stride) * 0.025
    }
    if (torsoRef.current) {
      torsoRef.current.rotation.z = THREE.MathUtils.damp(torsoRef.current.rotation.z, -velocity.current.z * 0.015, 7, delta)
      torsoRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.012
    }
    if (leftLeg.current) leftLeg.current.rotation.x = stride
    if (rightLeg.current) rightLeg.current.rotation.x = -stride
    if (leftCalf.current) leftCalf.current.rotation.x = leftKnee
    if (rightCalf.current) rightCalf.current.rotation.x = rightKnee
    if (leftArm.current) leftArm.current.rotation.x = -stride * 0.72
    if (rightArm.current) rightArm.current.rotation.x = stride * 0.72
    if (leftForearm.current) leftForearm.current.rotation.x = Math.abs(stride) * 0.2
    if (rightForearm.current) rightForearm.current.rotation.x = Math.abs(stride) * 0.2
    if (headRef.current && ballTranslation) {
      headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, THREE.MathUtils.clamp(Math.atan2(ballTranslation.z - current.z, ballTranslation.x - current.x) - facing.current, -0.55, 0.55), 7, delta)
    }
    if (celebrationTeam === team && presentationPhase !== 'idle') {
      if (leftArm.current) leftArm.current.rotation.x = -2.2
      if (rightArm.current) rightArm.current.rotation.x = -2.2
    }
  })

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" colliders={false} position={position} enabledRotations={[false, false, false]}>
      <CapsuleCollider args={[0.5, 0.27 * profile.width]} friction={0.82} />
      <group ref={rootRef} scale={[profile.width, profile.height, 1]}>
        <group ref={torsoRef}>
          <mesh position={[0, 0.28, 0]} castShadow scale={[1.08, 1, 0.9]}><capsuleGeometry args={[0.255, 0.34, 7, 14]} /><meshPhysicalMaterial color={kit} roughness={0.58} sheen={0.38} /></mesh>
          <mesh position={[0, -0.19, 0]} castShadow scale={[1.04, 0.68, 0.92]}><capsuleGeometry args={[0.25, 0.16, 6, 12]} /><meshPhysicalMaterial color={kit} roughness={0.64} sheen={0.25} /></mesh>
          <mesh position={[0, 0.61, 0]}><cylinderGeometry args={[0.095, 0.11, 0.18, 14]} /><meshStandardMaterial color={profile.skin} roughness={0.55} /></mesh>
        </group>
        <HumanHead skin={profile.skin} hair={profile.hair} faceWidth={profile.faceWidth} curls={profile.curls} beard={profile.beard} quality={quality} headRef={headRef} />
        <HumanLimb side={-1} skin={profile.skin} kit={kit} upperRef={leftArm} lowerRef={leftForearm} />
        <HumanLimb side={1} skin={profile.skin} kit={kit} upperRef={rightArm} lowerRef={rightForearm} />
        <HumanLimb side={-1} skin={profile.skin} kit={kit} leg upperRef={leftLeg} lowerRef={leftCalf} />
        <HumanLimb side={1} skin={profile.skin} kit={kit} leg upperRef={rightLeg} lowerRef={rightCalf} />
        {controlled && <group position={[0, 1.42, 0]}><mesh rotation={[0, 0, Math.PI]}><coneGeometry args={[0.2, 0.38, 3]} /><meshStandardMaterial color="#f2cc41" emissive="#d99d12" emissiveIntensity={0.9} /></mesh></group>}
      </group>
    </RigidBody>
  )
}
