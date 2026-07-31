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

const SKINS = ['#4f2b20', '#603526', '#75432e', '#8c593d', '#a76d4d', '#bd8060']
const HAIRS = ['#111210', '#1d1915', '#2a211b', '#372a21']

function profile(index: number, team: TeamSide) {
  const seed = index + (team === 'away' ? 17 : 0)
  return {
    skin: SKINS[seed % SKINS.length],
    hair: HAIRS[(seed * 3) % HAIRS.length],
    height: 0.96 + (seed % 5) * 0.018,
    width: 0.92 + ((seed * 5) % 4) * 0.045,
    face: 0.92 + ((seed * 7) % 4) * 0.035,
    curls: seed % 3 === 2,
    beard: seed % 4 === 1,
  }
}

function Limb({ color, skin, side, leg = false, upperRef, lowerRef }: {
  color: string
  skin: string
  side: -1 | 1
  leg?: boolean
  upperRef: React.RefObject<THREE.Group | null>
  lowerRef: React.RefObject<THREE.Group | null>
}) {
  const x = side * (leg ? 0.15 : 0.35)
  const upperLength = leg ? 0.37 : 0.27
  const lowerLength = leg ? 0.39 : 0.29
  return (
    <group ref={upperRef} position={[x, leg ? -0.25 : 0.42, 0]}>
      <mesh position={[0, -upperLength / 2, 0]} castShadow>
        <capsuleGeometry args={[leg ? 0.11 : 0.095, upperLength, 6, 10]} />
        <meshPhysicalMaterial color={color} roughness={0.62} sheen={0.25} />
      </mesh>
      <mesh position={[0, -upperLength, 0]} castShadow>
        <sphereGeometry args={[leg ? 0.105 : 0.085, 12, 10]} />
        <meshStandardMaterial color={leg ? color : skin} roughness={0.62} />
      </mesh>
      <group ref={lowerRef} position={[0, -upperLength, 0]}>
        <mesh position={[0, -lowerLength / 2, 0]} castShadow>
          <capsuleGeometry args={[leg ? 0.085 : 0.075, lowerLength, 6, 10]} />
          <meshPhysicalMaterial color={leg ? '#f4f1e8' : skin} roughness={0.58} clearcoat={0.04} />
        </mesh>
        {leg ? (
          <group position={[0, -lowerLength - 0.05, 0.08]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.5, 0.72]} castShadow>
              <capsuleGeometry args={[0.095, 0.24, 5, 10]} />
              <meshPhysicalMaterial color="#121514" roughness={0.4} clearcoat={0.22} />
            </mesh>
          </group>
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

function Head({ skin, hair, face, curls, beard, quality, headRef }: {
  skin: string
  hair: string
  face: number
  curls: boolean
  beard: boolean
  quality: QualityLevel
  headRef: React.RefObject<THREE.Group | null>
}) {
  return (
    <group ref={headRef} position={[0, 0.78, 0]}>
      <mesh castShadow scale={[face, 1.05, 0.92]}>
        <sphereGeometry args={[0.205, quality === 'performance' ? 14 : 26, quality === 'performance' ? 12 : 22]} />
        <meshPhysicalMaterial color={skin} roughness={0.5} clearcoat={0.08} />
      </mesh>
      <mesh position={[0, -0.13, 0.015]} scale={[face * 0.94, 0.62, 0.82]} castShadow>
        <sphereGeometry args={[0.19, 16, 12]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.01, 0.198]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.046, 0.13, 10]} />
        <meshStandardMaterial color={skin} roughness={0.56} />
      </mesh>
      <mesh position={[-0.072, 0.065, 0.186]} scale={[1.1, 0.62, 0.5]}><sphereGeometry args={[0.03, 10, 8]} /><meshBasicMaterial color="#eee9df" /></mesh>
      <mesh position={[0.072, 0.065, 0.186]} scale={[1.1, 0.62, 0.5]}><sphereGeometry args={[0.03, 10, 8]} /><meshBasicMaterial color="#eee9df" /></mesh>
      <mesh position={[-0.072, 0.065, 0.205]}><sphereGeometry args={[0.014, 8, 8]} /><meshPhysicalMaterial color="#35251e" roughness={0.3} clearcoat={0.5} /></mesh>
      <mesh position={[0.072, 0.065, 0.205]}><sphereGeometry args={[0.014, 8, 8]} /><meshPhysicalMaterial color="#35251e" roughness={0.3} clearcoat={0.5} /></mesh>
      <mesh position={[0, -0.095, 0.19]} scale={[1.2, 0.45, 0.55]}><sphereGeometry args={[0.064, 12, 8]} /><meshStandardMaterial color="#512c25" roughness={0.74} /></mesh>
      {beard && <mesh position={[0, -0.155, 0.12]} scale={[face, 0.64, 0.82]}><sphereGeometry args={[0.19, 16, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5]} /><meshStandardMaterial color={hair} roughness={0.96} transparent opacity={0.48} /></mesh>}
      <mesh position={[0, 0.135, -0.015]} castShadow>
        <sphereGeometry args={[0.205, quality === 'performance' ? 12 : 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={hair} roughness={0.96} />
      </mesh>
      {curls && quality !== 'performance' && Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2
        return <mesh key={i} position={[Math.cos(a) * 0.13, 0.19 + (i % 2) * 0.035, Math.sin(a) * 0.1]}><sphereGeometry args={[0.055, 8, 7]} /><meshStandardMaterial color={hair} roughness={0.98} /></mesh>
      })}
    </group>
  )
}

export function PlayerAvatar(props: Props) {
  const { index, team, position, color, secondaryColor, controlled = false, running, difficulty, quality, keyboard, ballRef, controlledPosition, matchProgress, presentationPhase, celebrationTeam, onEvent, onAction } = props
  const bodyRef = useRef<RapierRigidBody>(null)
  const rootRef = useRef<THREE.Group>(null)
  const torsoRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const la = useRef<THREE.Group>(null), ra = useRef<THREE.Group>(null), lfa = useRef<THREE.Group>(null), rfa = useRef<THREE.Group>(null)
  const ll = useRef<THREE.Group>(null), rl = useRef<THREE.Group>(null), lcalf = useRef<THREE.Group>(null), rcalf = useRef<THREE.Group>(null)
  const velocity = useRef(new THREE.Vector3())
  const facing = useRef(team === 'home' ? 0 : Math.PI)
  const cooldown = useRef(0)
  const fatigue = useRef(0)
  const p = useMemo(() => profile(index, team), [index, team])
  const home = useMemo(() => new THREE.Vector3(...position), [position])
  const target = useMemo(() => new THREE.Vector3(), [])
  const ballPos = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const goalkeeper = index === 0
  const kit = goalkeeper ? secondaryColor : color

  useFrame((state, delta) => {
    const body = bodyRef.current
    if (!body) return
    const current = body.translation()
    const ball = ballRef.current
    cooldown.current = Math.max(0, cooldown.current - delta)
    const ballT = ball?.translation()
    if (ballT) ballPos.set(ballT.x, ballT.y, ballT.z)

    if (!running) velocity.current.multiplyScalar(Math.pow(0.08, delta))
    else if (controlled) {
      const held = keyboard.current.held
      let x = Number(held.has('w') || held.has('arrowup')) - Number(held.has('s') || held.has('arrowdown'))
      let z = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'))
      const length = Math.hypot(x, z)
      const sprint = held.has('shift') && length > 0
      fatigue.current = THREE.MathUtils.clamp(fatigue.current + delta * (sprint ? 0.04 : -0.018), 0, 1)
      if (length > 0) { x /= length; z /= length; facing.current = Math.atan2(z, x) }
      const speed = (sprint ? 9.2 : 6.25) * (1 - fatigue.current * 0.2)
      velocity.current.x = THREE.MathUtils.damp(velocity.current.x, x * speed, 11, delta)
      velocity.current.z = THREE.MathUtils.damp(velocity.current.z, z * speed, 11, delta)
      if (ball && ballT) {
        const distance = Math.hypot(ballT.x - current.x, ballT.z - current.z)
        const shoot = keyboard.current.pressed.has(' ')
        const pass = keyboard.current.pressed.has('e')
        if ((shoot || pass) && distance < 1.55 && cooldown.current === 0) {
          dir.set(Math.cos(facing.current), shoot ? 0.2 : 0.065, Math.sin(facing.current)).normalize()
          const force = shoot ? 8.9 : 5.15
          ball.applyImpulse({ x: dir.x * force, y: dir.y * force, z: dir.z * force }, true)
          ball.applyTorqueImpulse({ x: -dir.z * 0.08, y: (held.has('a') ? -0.24 : held.has('d') ? 0.24 : 0), z: dir.x * 0.08 }, true)
          cooldown.current = 0.52
          onAction(shoot ? 'shot' : 'pass', team)
          onEvent(shoot ? 'Power shot · spin engaged' : 'Weighted pass released')
        }
      }
      keyboard.current.pressed.delete(' '); keyboard.current.pressed.delete('e')
    } else {
      const ownGoalX = team === 'home' ? -HALF_LENGTH + 0.9 : HALF_LENGTH - 0.9
      const attack = team === 'home' ? 1 : -1
      const threat = goalkeeper && ballT && ((team === 'home' && ball?.linvel().x! < -1) || (team === 'away' && ball?.linvel().x! > 1)) && Math.abs(ballT.x - ownGoalX) < 18
      if (goalkeeper) target.set(ownGoalX + attack * 1.1, 0, THREE.MathUtils.clamp(threat && ballT ? ballT.z : (ballT?.z ?? 0) * 0.35, -3.1, 3.1))
      else if (ballT && Math.hypot(ballT.x - current.x, ballT.z - current.z) < 8 + (difficulty === 'Legendary' ? 8 : 4)) target.set(ballT.x, 0, ballT.z)
      else target.copy(home)
      dir.set(target.x - current.x, 0, target.z - current.z)
      if (dir.lengthSq() > 0.05) { dir.normalize(); const s = threat ? 7.4 : goalkeeper ? 2.4 : 2.1; velocity.current.x = THREE.MathUtils.damp(velocity.current.x, dir.x * s, 6, delta); velocity.current.z = THREE.MathUtils.damp(velocity.current.z, dir.z * s, 6, delta); facing.current = Math.atan2(velocity.current.z, velocity.current.x) }
      else velocity.current.multiplyScalar(Math.pow(0.12, delta))
      if (goalkeeper && ball && ballT && Math.hypot(ballT.x - current.x, ballT.z - current.z) < 1.35 && cooldown.current === 0) {
        const clear = -attack
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.applyImpulse({ x: clear * 8.8, y: 2.25, z: -ballT.z * 0.22 }, true)
        cooldown.current = 1.1
        onAction('save', team)
        onEvent('Goalkeeper save · strong hands')
      }
    }

    const nx = THREE.MathUtils.clamp(current.x + velocity.current.x * delta, -HALF_LENGTH + 0.5, HALF_LENGTH - 0.5)
    const nz = THREE.MathUtils.clamp(current.z + velocity.current.z * delta, -HALF_WIDTH + 0.5, HALF_WIDTH - 0.5)
    body.setNextKinematicTranslation({ x: nx, y: PLAYER_HEIGHT / 2, z: nz })
    if (controlled) controlledPosition.current.set(nx, PLAYER_HEIGHT / 2, nz)

    const speed = velocity.current.length()
    const stride = Math.sin(state.clock.elapsedTime * (speed > 6 ? 14 : 9) + index * 0.4) * Math.min(0.78, speed * 0.09)
    const kneeL = Math.max(0, -stride) * 0.7, kneeR = Math.max(0, stride) * 0.7
    if (rootRef.current) { rootRef.current.rotation.y = -facing.current + Math.PI / 2; rootRef.current.position.y = Math.abs(stride) * 0.025 }
    if (torsoRef.current) { torsoRef.current.rotation.z = THREE.MathUtils.damp(torsoRef.current.rotation.z, -velocity.current.z * 0.015, 7, delta); torsoRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.012 }
    if (ll.current) ll.current.rotation.x = stride; if (rl.current) rl.current.rotation.x = -stride
    if (lcalf.current) lcalf.current.rotation.x = kneeL; if (rcalf.current) rcalf.current.rotation.x = kneeR
    if (la.current) la.current.rotation.x = -stride * 0.72; if (ra.current) ra.current.rotation.x = stride * 0.72
    if (lfa.current) lfa.current.rotation.x = Math.abs(stride) * 0.2; if (rfa.current) rfa.current.rotation.x = Math.abs(stride) * 0.2
    if (headRef.current && ballT) headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, THREE.MathUtils.clamp(Math.atan2(ballT.z - current.z, ballT.x - current.x) - facing.current, -0.55, 0.55), 7, delta)
    if (celebrationTeam === team && presentationPhase !== 'idle') { if (la.current) la.current.rotation.x = -2.2; if (ra.current) ra.current.rotation.x = -2.2 }
  })

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" colliders={false} position={position} enabledRotations={[false, false, false]}>
      <CapsuleCollider args={[0.5, 0.27 * p.width]} friction={0.82} />
      <group ref={rootRef} scale={[p.width, p.height, 1]}>
        <group ref={torsoRef}>
          <mesh position={[0, 0.28, 0]} castShadow scale={[1.08, 1, 0.9]}><capsuleGeometry args={[0.255, 0.34, 7, 14]} /><meshPhysicalMaterial color={kit} roughness={0.58} sheen={0.38} /></mesh>
          <mesh position={[0, -0.19, 0]} castShadow scale={[1.04, 0.68, 0.92]}><capsuleGeometry args={[0.25, 0.16, 6, 12]} /><meshPhysicalMaterial color={kit} roughness={0.64} sheen={0.25} /></mesh>
          <mesh position={[0, 0.61, 0]}><cylinderGeometry args={[0.095, 0.11, 0.18, 14]} /><meshStandardMaterial color={p.skin} roughness={0.55} /></mesh>
        </group>
        <Head skin={p.skin} hair={p.hair} face={p.face} curls={p.curls} beard={p.beard} quality={quality} headRef={headRef} />
        <Limb side={-1} skin={p.skin} color={kit} upperRef={la} lowerRef={lfa} /><Limb side={1} skin={p.skin} color={kit} upperRef={ra} lowerRef={rfa} />
        <Limb side={-1} skin={p.skin} color={kit} leg upperRef={ll} lowerRef={lcalf} /><Limb side={1} skin={p.skin} color={kit} leg upperRef={rl} lowerRef={rcalf} />
        {controlled && <group position={[0, 1.42, 0]}><mesh rotation={[0, 0, Math.PI]}><coneGeometry args={[0.2, 0.38, 3]} /><meshStandardMaterial color="#f2cc41" emissive="#d99d12" emissiveIntensity={0.9} /></mesh></group>}
      </group>
    </RigidBody>
  )
}
