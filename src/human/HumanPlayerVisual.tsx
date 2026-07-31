import { useMemo, useRef, type MutableRefObject, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { PresentationPhase, QualityLevel, TeamSide } from '../game/types'
import { footPlantOffset } from './biomechanics'
import type { PlayerProfile, PlayerRuntimeState, VisualMotionState } from './types'

interface HumanPlayerVisualProps {
  profile: PlayerProfile
  runtime: PlayerRuntimeState
  motion: MutableRefObject<VisualMotionState>
  kitColor: string
  secondaryColor: string
  quality: QualityLevel
  controlled: boolean
  presentationPhase: PresentationPhase
  celebrationTeam: TeamSide | null
}

interface LimbProps {
  side: -1 | 1
  profile: PlayerProfile
  kitColor: string
  leg?: boolean
  upperRef: RefObject<THREE.Group | null>
  lowerRef: RefObject<THREE.Group | null>
  footRef?: RefObject<THREE.Group | null>
  closeDetailRef: RefObject<THREE.Group | null>
  skinMaterialRefs: MutableRefObject<THREE.MeshPhysicalMaterial[]>
  kitMaterialRefs: MutableRefObject<THREE.MeshPhysicalMaterial[]>
}

function PhysicalMaterial({
  color,
  skin = false,
  refs,
}: {
  color: string
  skin?: boolean
  refs: MutableRefObject<THREE.MeshPhysicalMaterial[]>
}) {
  return (
    <meshPhysicalMaterial
      ref={(value) => { if (value && !refs.current.includes(value)) refs.current.push(value) }}
      color={color}
      roughness={skin ? 0.55 : 0.62}
      clearcoat={skin ? 0.05 : 0.04}
      clearcoatRoughness={0.42}
      sheen={skin ? 0.05 : 0.28}
      sheenRoughness={0.7}
    />
  )
}

function HumanLimb({ side, profile, kitColor, leg, upperRef, lowerRef, footRef, closeDetailRef, skinMaterialRefs, kitMaterialRefs }: LimbProps) {
  const body = profile.body
  const upperLength = leg ? body.upperLegLength : body.upperArmLength
  const lowerLength = leg ? body.lowerLegLength : body.lowerArmLength
  const upperRadius = leg ? THREE.MathUtils.lerp(0.092, 0.128, body.muscle) : THREE.MathUtils.lerp(0.07, 0.1, body.muscle)
  const lowerRadius = leg ? upperRadius * 0.74 : upperRadius * 0.72
  const lateral = leg ? body.hipWidth * 0.44 : body.shoulderWidth * 0.56
  const skin = profile.face.skinTone
  const asymmetry = 1 + body.asymmetry * side

  return (
    <group ref={upperRef} position={[side * lateral, leg ? -body.torsoLength * 0.42 : body.torsoLength * 0.44, 0]} scale={[asymmetry, 1, 1]}>
      <mesh position={[0, -upperLength / 2, 0]} castShadow>
        <capsuleGeometry args={[upperRadius, Math.max(0.08, upperLength - upperRadius * 2), 8, 14]} />
        <PhysicalMaterial color={leg ? kitColor : skin} skin={!leg} refs={leg ? kitMaterialRefs : skinMaterialRefs} />
      </mesh>
      <mesh position={[0, -upperLength, 0]} castShadow scale={[1, 0.88, 1]}>
        <sphereGeometry args={[upperRadius * 0.92, 14, 12]} />
        <PhysicalMaterial color={leg ? profile.face.skinTone : skin} skin refs={skinMaterialRefs} />
      </mesh>
      <group ref={lowerRef} position={[0, -upperLength, 0]}>
        <mesh position={[0, -lowerLength / 2, 0]} castShadow>
          <capsuleGeometry args={[lowerRadius, Math.max(0.08, lowerLength - lowerRadius * 2), 8, 14]} />
          <PhysicalMaterial color={leg ? '#f5f1e9' : skin} skin={!leg} refs={leg ? kitMaterialRefs : skinMaterialRefs} />
        </mesh>
        {leg ? (
          <group ref={footRef} position={[0, -lowerLength - 0.02, body.footLength * 0.32]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.92, body.footLength / 0.27, 0.68]} castShadow>
              <capsuleGeometry args={[0.09, 0.18, 7, 14]} />
              <meshPhysicalMaterial color="#0c1110" roughness={0.36} clearcoat={0.28} clearcoatRoughness={0.3} />
            </mesh>
            <group ref={closeDetailRef}>
              {[-0.055, -0.018, 0.018, 0.055].map((x) => (
                <mesh key={x} position={[x, -0.045, 0.07]}>
                  <cylinderGeometry args={[0.009, 0.011, 0.018, 6]} />
                  <meshStandardMaterial color="#7b8b7f" roughness={0.58} />
                </mesh>
              ))}
            </group>
          </group>
        ) : (
          <group position={[0, -lowerLength - 0.045, 0]} scale={[body.handScale, body.handScale, body.handScale]}>
            <mesh scale={[0.72, 1.08, 0.46]} castShadow>
              <sphereGeometry args={[0.09, 14, 12]} />
              <PhysicalMaterial color={skin} skin refs={skinMaterialRefs} />
            </mesh>
            <group ref={closeDetailRef} position={[0, -0.075, 0.012]}>
              {[-0.04, -0.014, 0.014, 0.04].map((x, index) => (
                <mesh key={x} position={[x, -0.032 - index * 0.002, 0]}>
                  <capsuleGeometry args={[0.012, 0.06, 5, 8]} />
                  <PhysicalMaterial color={skin} skin refs={skinMaterialRefs} />
                </mesh>
              ))}
            </group>
          </group>
        )}
      </group>
    </group>
  )
}

function Hair({ profile, hairRef, closeDetailRef }: { profile: PlayerProfile; hairRef: RefObject<THREE.Group | null>; closeDetailRef: RefObject<THREE.Group | null> }) {
  const style = profile.face.hairStyle
  const tone = profile.face.hairTone
  const strands = style === 'braids' ? 12 : style === 'afro' ? 18 : style === 'coiled' ? 14 : 8
  const radius = style === 'afro' ? 0.075 : style === 'coiled' ? 0.047 : 0.035
  if (style === 'shaved') {
    return (
      <mesh position={[0, 0.105, -0.012]} scale={[1.02, 0.54, 0.96]}>
        <sphereGeometry args={[0.215, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial color={tone} roughness={0.84} />
      </mesh>
    )
  }
  if (style === 'fade') {
    return (
      <group ref={hairRef}>
        <mesh position={[0, 0.145, -0.01]} scale={[1.02, 0.7, 0.96]} castShadow>
          <sphereGeometry args={[0.215, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color={tone} roughness={0.96} />
        </mesh>
      </group>
    )
  }
  return (
    <group ref={hairRef}>
      <mesh position={[0, 0.12, -0.012]} scale={[1.02, style === 'afro' ? 0.78 : 0.64, 0.96]}>
        <sphereGeometry args={[0.218, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color={tone} roughness={0.98} />
      </mesh>
      <group ref={closeDetailRef}>
        {Array.from({ length: strands }, (_, index) => {
          const angle = (index / strands) * Math.PI * 2
          const ring = index % 3
          const x = Math.cos(angle) * (0.09 + ring * 0.036)
          const z = Math.sin(angle) * (0.072 + ring * 0.025)
          const y = 0.15 + (index % 4) * 0.028
          return (
            <mesh key={index} position={[x, y, z]} scale={[1, style === 'braids' ? 1.8 : 1, 1]} castShadow>
              <sphereGeometry args={[radius, 8, 7]} />
              <meshStandardMaterial color={tone} roughness={0.98} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

function HumanHead({
  profile,
  headRef,
  eyeRef,
  leftLidRef,
  rightLidRef,
  mouthRef,
  jawRef,
  leftBrowRef,
  rightBrowRef,
  hairRef,
  closeDetailRef,
  hairDetailRef,
  skinMaterialRefs,
}: {
  profile: PlayerProfile
  headRef: RefObject<THREE.Group | null>
  eyeRef: RefObject<THREE.Group | null>
  leftLidRef: RefObject<THREE.Mesh | null>
  rightLidRef: RefObject<THREE.Mesh | null>
  mouthRef: RefObject<THREE.Mesh | null>
  jawRef: RefObject<THREE.Group | null>
  leftBrowRef: RefObject<THREE.Mesh | null>
  rightBrowRef: RefObject<THREE.Mesh | null>
  hairRef: RefObject<THREE.Group | null>
  closeDetailRef: RefObject<THREE.Group | null>
  hairDetailRef: RefObject<THREE.Group | null>
  skinMaterialRefs: MutableRefObject<THREE.MeshPhysicalMaterial[]>
}) {
  const face = profile.face
  const headScale: [number, number, number] = [face.faceWidth, 1 + (face.foreheadHeight - 1) * 0.12, 0.93]
  const eyeX = 0.072 * face.eyeSpacing
  const skin = face.skinTone
  return (
    <group ref={headRef} position={[0, profile.body.torsoLength * 0.65 + profile.body.neckLength + 0.16, 0]}>
      <mesh castShadow scale={headScale}>
        <sphereGeometry args={[0.205, 28, 22]} />
        <PhysicalMaterial color={skin} skin refs={skinMaterialRefs} />
      </mesh>
      <group ref={jawRef} position={[0, -0.12, 0.012]}>
        <mesh scale={[face.jawWidth, 0.64, 0.84]} castShadow>
          <sphereGeometry args={[0.185, 22, 16]} />
          <PhysicalMaterial color={skin} skin refs={skinMaterialRefs} />
        </mesh>
      </group>
      <mesh position={[0, 0.01, 0.198]} rotation={[Math.PI / 2, 0, 0]} scale={[face.noseWidth, face.noseLength, 1]}>
        <coneGeometry args={[0.045, 0.13, 12]} />
        <PhysicalMaterial color={skin} skin refs={skinMaterialRefs} />
      </mesh>
      <group ref={eyeRef}>
        {[-eyeX, eyeX].map((x, index) => (
          <group key={x} position={[x, 0.057, 0.185]} scale={[face.eyeScale, 1, 1]}>
            <mesh scale={[1.12, 0.62, 0.52]}>
              <sphereGeometry args={[0.032, 14, 10]} />
              <meshPhysicalMaterial color="#f3eee4" roughness={0.24} clearcoat={0.68} clearcoatRoughness={0.15} />
            </mesh>
            <mesh position={[0, 0, 0.021]}>
              <sphereGeometry args={[0.0145, 10, 10]} />
              <meshPhysicalMaterial color={face.eyeTone} roughness={0.24} clearcoat={0.72} />
            </mesh>
            <mesh position={[0, 0, 0.033]}>
              <sphereGeometry args={[0.006, 8, 8]} />
              <meshBasicMaterial color="#090807" />
            </mesh>
            <mesh ref={index === 0 ? leftLidRef : rightLidRef} position={[0, 0.013, 0.033]} scale={[1.2, 0.2, 0.55]}>
              <sphereGeometry args={[0.033, 12, 8]} />
              <PhysicalMaterial color={skin} skin refs={skinMaterialRefs} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh ref={leftBrowRef} position={[-eyeX, 0.112, 0.193]} rotation={[0, 0, -0.08]} scale={[1.2, 0.35, 0.45]}>
        <capsuleGeometry args={[0.014, 0.06, 4, 8]} />
        <meshStandardMaterial color={face.hairTone} roughness={0.92} />
      </mesh>
      <mesh ref={rightBrowRef} position={[eyeX, 0.112, 0.193]} rotation={[0, 0, 0.08]} scale={[1.2, 0.35, 0.45]}>
        <capsuleGeometry args={[0.014, 0.06, 4, 8]} />
        <meshStandardMaterial color={face.hairTone} roughness={0.92} />
      </mesh>
      <mesh ref={mouthRef} position={[0, -0.087, 0.188]} scale={[face.lipFullness, 0.42, 0.5]}>
        <sphereGeometry args={[0.062, 16, 10]} />
        <meshPhysicalMaterial color="#532b26" roughness={0.58} clearcoat={0.16} />
      </mesh>
      <mesh position={[0, -0.074, 0.213]} scale={[0.76, 0.18, 0.32]}>
        <boxGeometry args={[0.09, 0.03, 0.02]} />
        <meshStandardMaterial color="#e8dfcf" roughness={0.5} />
      </mesh>
      <mesh position={[-0.205, 0.005, 0]} scale={[face.earScale, 1, 0.72]}>
        <sphereGeometry args={[0.045, 12, 10]} />
        <PhysicalMaterial color={skin} skin refs={skinMaterialRefs} />
      </mesh>
      <mesh position={[0.205, 0.005, 0]} scale={[face.earScale, 1, 0.72]}>
        <sphereGeometry args={[0.045, 12, 10]} />
        <PhysicalMaterial color={skin} skin refs={skinMaterialRefs} />
      </mesh>
      {face.beardStyle !== 'none' && (
        <mesh position={[0, -0.14, 0.105]} scale={[face.jawWidth, face.beardStyle === 'goatee' ? 0.42 : 0.64, 0.84]}>
          <sphereGeometry args={[0.183, 18, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55]} />
          <meshStandardMaterial color={face.hairTone} roughness={0.96} transparent opacity={face.beardStyle === 'stubble' ? 0.32 : 0.7} />
        </mesh>
      )}
      <Hair profile={profile} hairRef={hairRef} closeDetailRef={hairDetailRef} />
      <group ref={closeDetailRef}>
        {face.scar > 0 && <mesh position={[0.11, -0.005, 0.198]} rotation={[0, 0, -0.36]} scale={[0.9, face.scar, 0.2]}><boxGeometry args={[0.012, 0.08, 0.006]} /><meshBasicMaterial color="#6d332c" transparent opacity={0.46} /></mesh>}
        {face.freckles > 0 && [-0.1, -0.07, 0.07, 0.1].map((x, index) => <mesh key={x} position={[x, -0.012 + (index % 2) * 0.025, 0.203]}><sphereGeometry args={[0.006, 6, 5]} /><meshBasicMaterial color="#563126" transparent opacity={0.44} /></mesh>)}
      </group>
    </group>
  )
}

export function HumanPlayerVisual({ profile, runtime, motion, kitColor, secondaryColor, quality, controlled, presentationPhase, celebrationTeam }: HumanPlayerVisualProps) {
  const { camera } = useThree()
  const rootRef = useRef<THREE.Group>(null)
  const highLodRef = useRef<THREE.Group>(null)
  const lowLodRef = useRef<THREE.Group>(null)
  const torsoRef = useRef<THREE.Group>(null)
  const pelvisRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const eyesRef = useRef<THREE.Group>(null)
  const leftLidRef = useRef<THREE.Mesh>(null)
  const rightLidRef = useRef<THREE.Mesh>(null)
  const mouthRef = useRef<THREE.Mesh>(null)
  const jawRef = useRef<THREE.Group>(null)
  const leftBrowRef = useRef<THREE.Mesh>(null)
  const rightBrowRef = useRef<THREE.Mesh>(null)
  const hairRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftForearmRef = useRef<THREE.Group>(null)
  const rightForearmRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const leftCalfRef = useRef<THREE.Group>(null)
  const rightCalfRef = useRef<THREE.Group>(null)
  const leftFootRef = useRef<THREE.Group>(null)
  const rightFootRef = useRef<THREE.Group>(null)
  const leftHandDetailRef = useRef<THREE.Group>(null)
  const rightHandDetailRef = useRef<THREE.Group>(null)
  const leftBootDetailRef = useRef<THREE.Group>(null)
  const rightBootDetailRef = useRef<THREE.Group>(null)
  const faceDetailRef = useRef<THREE.Group>(null)
  const hairDetailRef = useRef<THREE.Group>(null)
  const jerseyFrontRef = useRef<THREE.Mesh>(null)
  const jerseyBackRef = useRef<THREE.Mesh>(null)
  const dirtRef = useRef<THREE.Mesh>(null)
  const skinMaterials = useRef<THREE.MeshPhysicalMaterial[]>([])
  const kitMaterials = useRef<THREE.MeshPhysicalMaterial[]>([])
  const blinkTimer = useRef(1.5 + profile.number * 0.07)
  const blinkPhase = useRef(0)
  const lastScan = useRef(0)
  const temporaryScan = useRef(new THREE.Vector3())
  const kitBase = useMemo(() => new THREE.Color(kitColor), [kitColor])
  const dirtColor = useMemo(() => new THREE.Color('#564125'), [])
  const body = profile.body
  const torsoWidth = body.shoulderWidth * 0.78
  const torsoDepth = THREE.MathUtils.lerp(0.22, 0.29, body.muscle)
  const currentWorld = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
    const root = rootRef.current
    if (!root) return
    const speed = runtime.velocity.length()
    const visual = motion.current
    visual.gaitPhase += visual.gaitRate * delta
    root.rotation.y = -runtime.facing + Math.PI / 2
    root.rotation.z = THREE.MathUtils.damp(root.rotation.z, -visual.slip * 0.22 + visual.stumble * 0.3, 6, delta)
    root.position.y = Math.abs(Math.sin(visual.gaitPhase * 2)) * Math.min(0.034, speed * 0.004) - visual.goalkeeperDive * 0.24 + visual.jump * 0.25

    const leftPlant = footPlantOffset(visual.gaitPhase, -1, visual.strideLength, speed, visual.plantBias)
    const rightPlant = footPlantOffset(visual.gaitPhase, 1, visual.strideLength, speed, visual.plantBias)
    const hipRotation = Math.sin(visual.gaitPhase) * Math.min(0.18, speed * 0.018)
    const shoulderCounter = -hipRotation * (0.82 + profile.movement.armSwing * 0.18)

    if (pelvisRef.current) {
      pelvisRef.current.rotation.y = hipRotation
      pelvisRef.current.rotation.x = visual.lean * 0.28
    }
    if (torsoRef.current) {
      torsoRef.current.rotation.y = shoulderCounter
      torsoRef.current.rotation.x = visual.lean + runtime.physical.fatigue * 0.08 + runtime.physical.injurySeverity * 0.08
      torsoRef.current.rotation.z = Math.sin(visual.gaitPhase * 2) * 0.022 * Math.min(1, speed / 5)
      torsoRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * (2.2 + runtime.physical.breathing * 2.8)) * (0.008 + runtime.physical.breathing * 0.018)
    }

    const leftSwing = THREE.MathUtils.clamp(leftPlant.forward / Math.max(0.4, visual.strideLength * 0.34), -1, 1)
    const rightSwing = THREE.MathUtils.clamp(rightPlant.forward / Math.max(0.4, visual.strideLength * 0.34), -1, 1)
    const kick = visual.kick
    if (leftLegRef.current) leftLegRef.current.rotation.x = leftSwing * 0.78 + (profile.preferredFoot === 'left' ? kick * 1.15 : 0)
    if (rightLegRef.current) rightLegRef.current.rotation.x = rightSwing * 0.78 + (profile.preferredFoot === 'right' ? kick * 1.15 : 0)
    if (leftCalfRef.current) leftCalfRef.current.rotation.x = Math.max(0, -leftSwing) * 0.84 - (profile.preferredFoot === 'left' ? kick * 0.65 : 0)
    if (rightCalfRef.current) rightCalfRef.current.rotation.x = Math.max(0, -rightSwing) * 0.84 - (profile.preferredFoot === 'right' ? kick * 0.65 : 0)
    if (leftFootRef.current) leftFootRef.current.rotation.x = leftPlant.grounded ? -leftSwing * 0.12 : -0.18 + leftPlant.height * 0.9
    if (rightFootRef.current) rightFootRef.current.rotation.x = rightPlant.grounded ? -rightSwing * 0.12 : -0.18 + rightPlant.height * 0.9

    const armAmplitude = Math.min(0.9, speed * 0.09) * profile.movement.armSwing
    if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.sin(visual.gaitPhase) * armAmplitude - visual.goalkeeperDive * 1.15
    if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(visual.gaitPhase) * armAmplitude - visual.goalkeeperDive * 1.15
    if (leftForearmRef.current) leftForearmRef.current.rotation.x = 0.18 + Math.max(0, Math.sin(visual.gaitPhase)) * 0.34
    if (rightForearmRef.current) rightForearmRef.current.rotation.x = 0.18 + Math.max(0, -Math.sin(visual.gaitPhase)) * 0.34

    const celebrating = celebrationTeam === runtime.team && presentationPhase !== 'idle'
    if (celebrating) {
      const style = profile.movement.celebrationStyle
      if (leftArmRef.current) leftArmRef.current.rotation.x = style % 2 === 0 ? -2.3 : -1.15
      if (rightArmRef.current) rightArmRef.current.rotation.x = style === 3 ? -0.6 : -2.3
      root.rotation.z += Math.sin(state.clock.elapsedTime * 5 + profile.number) * 0.04
    }

    blinkTimer.current -= delta
    if (blinkTimer.current <= 0 && blinkPhase.current === 0) blinkPhase.current = 1
    if (blinkPhase.current > 0) {
      blinkPhase.current += delta * 12
      const closure = Math.sin(Math.min(Math.PI, blinkPhase.current))
      if (leftLidRef.current) leftLidRef.current.scale.y = 0.18 + closure * 1.05
      if (rightLidRef.current) rightLidRef.current.scale.y = 0.18 + closure * 1.05
      if (blinkPhase.current >= Math.PI) {
        blinkPhase.current = 0
        blinkTimer.current = THREE.MathUtils.lerp(1.8, 5.6, Math.abs(Math.sin(profile.number * 8.73 + state.clock.elapsedTime)))
      }
    }

    if (state.clock.elapsedTime - lastScan.current > THREE.MathUtils.lerp(0.8, 2.5, 1 - profile.movement.scanFrequency / 1.35)) {
      lastScan.current = state.clock.elapsedTime
      const scanSide = Math.sin(profile.number * 2.1 + state.clock.elapsedTime * 0.7) > 0 ? 1 : -1
      temporaryScan.current.copy(runtime.position).add(new THREE.Vector3(Math.cos(runtime.facing) * 5, 1.2, Math.sin(runtime.facing) * 5 + scanSide * 4))
      runtime.scanTarget.copy(temporaryScan.current)
    }
    if (headRef.current) {
      const targetAngle = Math.atan2(runtime.scanTarget.z - runtime.position.z, runtime.scanTarget.x - runtime.position.x)
      const offset = Math.atan2(Math.sin(targetAngle - runtime.facing), Math.cos(targetAngle - runtime.facing))
      headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, THREE.MathUtils.clamp(offset, -0.72, 0.72), 6.5, delta)
      headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, -runtime.physical.fatigue * 0.1 + runtime.emotion.joy * -0.04, 4, delta)
    }
    if (eyesRef.current) {
      eyesRef.current.rotation.y = headRef.current ? headRef.current.rotation.y * 0.32 : 0
      eyesRef.current.scale.setScalar(THREE.MathUtils.lerp(1.08, 0.94, runtime.emotion.pressure))
    }
    if (mouthRef.current) {
      const open = THREE.MathUtils.clamp(runtime.physical.breathing * 0.55 + runtime.emotion.joy * 0.32 + runtime.emotion.pain * 0.38, 0.1, 0.85)
      mouthRef.current.scale.y = THREE.MathUtils.damp(mouthRef.current.scale.y, open, 5, delta)
    }
    if (jawRef.current) jawRef.current.rotation.x = THREE.MathUtils.damp(jawRef.current.rotation.x, runtime.physical.breathing * 0.06 + runtime.emotion.pain * 0.08, 4, delta)
    const brow = runtime.emotion.frustration * 0.18 + runtime.emotion.pressure * 0.1 - runtime.emotion.joy * 0.1
    if (leftBrowRef.current) leftBrowRef.current.rotation.z = -0.08 - brow
    if (rightBrowRef.current) rightBrowRef.current.rotation.z = 0.08 + brow

    const wetness = Math.max(runtime.physical.sweat, runtime.physical.wetness)
    for (const material of skinMaterials.current) {
      material.roughness = THREE.MathUtils.damp(material.roughness, THREE.MathUtils.lerp(0.57, 0.28, wetness), 1.5, delta)
      material.clearcoat = THREE.MathUtils.damp(material.clearcoat, THREE.MathUtils.lerp(0.04, 0.52, wetness), 1.5, delta)
    }
    for (const material of kitMaterials.current) {
      material.roughness = THREE.MathUtils.damp(material.roughness, THREE.MathUtils.lerp(0.64, 0.36, runtime.physical.wetness), 1.2, delta)
      material.clearcoat = THREE.MathUtils.damp(material.clearcoat, runtime.physical.wetness * 0.18, 1.2, delta)
      material.color.copy(kitBase).lerp(dirtColor, runtime.physical.dirt * 0.18)
    }
    if (hairRef.current) {
      hairRef.current.scale.y = THREE.MathUtils.damp(hairRef.current.scale.y, 1 - runtime.physical.wetness * 0.18, 1.1, delta)
      hairRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3 + profile.number) * speed * 0.0018
    }
    if (jerseyFrontRef.current) jerseyFrontRef.current.rotation.x = THREE.MathUtils.damp(jerseyFrontRef.current.rotation.x, -speed * 0.006 - runtime.physical.wetness * 0.08, 5, delta)
    if (jerseyBackRef.current) jerseyBackRef.current.rotation.x = THREE.MathUtils.damp(jerseyBackRef.current.rotation.x, speed * 0.008 + runtime.physical.wetness * 0.06, 5, delta)
    if (dirtRef.current) (dirtRef.current.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.damp((dirtRef.current.material as THREE.MeshBasicMaterial).opacity, runtime.physical.dirt * 0.42, 1, delta)

    root.getWorldPosition(currentWorld)
    const distance = camera.position.distanceTo(currentWorld)
    const highDetailDistance = quality === 'ultra' ? 56 : quality === 'balanced' ? 32 : 14
    const useHighDetail = controlled || distance < highDetailDistance
    if (highLodRef.current) highLodRef.current.visible = useHighDetail
    if (lowLodRef.current) lowLodRef.current.visible = !useHighDetail
    const closeVisible = useHighDetail && (quality === 'ultra' ? distance < 24 : quality === 'balanced' ? distance < 15 : distance < 8)
    const detailVisible = useHighDetail && quality !== 'performance' && distance < 36
    if (faceDetailRef.current) faceDetailRef.current.visible = closeVisible
    if (hairDetailRef.current) hairDetailRef.current.visible = detailVisible
    if (leftHandDetailRef.current) leftHandDetailRef.current.visible = closeVisible
    if (rightHandDetailRef.current) rightHandDetailRef.current.visible = closeVisible
    if (leftBootDetailRef.current) leftBootDetailRef.current.visible = detailVisible
    if (rightBootDetailRef.current) rightBootDetailRef.current.visible = detailVisible

    visual.kick = THREE.MathUtils.damp(visual.kick, 0, 8, delta)
    visual.tackle = THREE.MathUtils.damp(visual.tackle, 0, 7, delta)
    visual.stumble = THREE.MathUtils.damp(visual.stumble, 0, 5, delta)
    visual.goalkeeperDive = THREE.MathUtils.damp(visual.goalkeeperDive, 0, 3.6, delta)
    visual.jump = THREE.MathUtils.damp(visual.jump, 0, 5.4, delta)
  })

  const goalkeeper = profile.role === 'goalkeeper'
  const kit = goalkeeper ? secondaryColor : kitColor
  const skin = profile.face.skinTone
  return (
    <group ref={rootRef} scale={[1, 1, 1]}>
      <group ref={highLodRef}>
        <group ref={pelvisRef} position={[0, -0.02, 0]}>
          <mesh position={[0, -body.torsoLength * 0.35, 0]} castShadow scale={[body.hipWidth / 0.35, 0.74, 0.9]}>
            <capsuleGeometry args={[0.235, 0.16, 8, 16]} />
            <PhysicalMaterial color={kit} refs={kitMaterials} />
          </mesh>
        </group>
        <group ref={torsoRef} position={[0, 0.08, 0]}>
          <mesh position={[0, body.torsoLength * 0.08, 0]} castShadow scale={[torsoWidth / 0.37, body.torsoLength / 0.58, torsoDepth / 0.25]}>
            <capsuleGeometry args={[0.27, 0.32, 10, 18]} />
            <PhysicalMaterial color={kit} refs={kitMaterials} />
          </mesh>
          <mesh ref={jerseyFrontRef} position={[0, -body.torsoLength * 0.32, 0.235]} rotation={[-0.08, 0, 0]}>
            <planeGeometry args={[body.shoulderWidth * 0.82, 0.22, 3, 3]} />
            <PhysicalMaterial color={kit} refs={kitMaterials} />
          </mesh>
          <mesh ref={jerseyBackRef} position={[0, -body.torsoLength * 0.32, -0.235]} rotation={[0.08, Math.PI, 0]}>
            <planeGeometry args={[body.shoulderWidth * 0.82, 0.22, 3, 3]} />
            <PhysicalMaterial color={kit} refs={kitMaterials} />
          </mesh>
          <mesh ref={dirtRef} position={[0.08, -0.02, 0.248]} rotation={[0, 0, -0.25]} scale={[0.9, 1.7, 1]}>
            <circleGeometry args={[0.1, 12]} />
            <meshBasicMaterial color="#5c4329" transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh position={[0, body.torsoLength * 0.58, 0]}>
            <cylinderGeometry args={[body.neckThickness * 0.8, body.neckThickness, body.neckLength, 16]} />
            <PhysicalMaterial color={skin} skin refs={skinMaterials} />
          </mesh>
        </group>
        <HumanHead profile={profile} headRef={headRef} eyeRef={eyesRef} leftLidRef={leftLidRef} rightLidRef={rightLidRef} mouthRef={mouthRef} jawRef={jawRef} leftBrowRef={leftBrowRef} rightBrowRef={rightBrowRef} hairRef={hairRef} closeDetailRef={faceDetailRef} hairDetailRef={hairDetailRef} skinMaterialRefs={skinMaterials} />
        <HumanLimb side={-1} profile={profile} kitColor={kit} upperRef={leftArmRef} lowerRef={leftForearmRef} closeDetailRef={leftHandDetailRef} skinMaterialRefs={skinMaterials} kitMaterialRefs={kitMaterials} />
        <HumanLimb side={1} profile={profile} kitColor={kit} upperRef={rightArmRef} lowerRef={rightForearmRef} closeDetailRef={rightHandDetailRef} skinMaterialRefs={skinMaterials} kitMaterialRefs={kitMaterials} />
        <HumanLimb side={-1} profile={profile} kitColor={kit} leg upperRef={leftLegRef} lowerRef={leftCalfRef} footRef={leftFootRef} closeDetailRef={leftBootDetailRef} skinMaterialRefs={skinMaterials} kitMaterialRefs={kitMaterials} />
        <HumanLimb side={1} profile={profile} kitColor={kit} leg upperRef={rightLegRef} lowerRef={rightCalfRef} footRef={rightFootRef} closeDetailRef={rightBootDetailRef} skinMaterialRefs={skinMaterials} kitMaterialRefs={kitMaterials} />
      </group>
      <group ref={lowLodRef} visible={false}>
        <mesh position={[0, 0.18, 0]} castShadow scale={[body.shoulderWidth / 0.45, body.torsoLength / 0.58, 0.9]}>
          <capsuleGeometry args={[0.25, 0.36, 5, 8]} />
          <meshStandardMaterial color={kit} roughness={0.68} />
        </mesh>
        <mesh position={[0, body.torsoLength * 0.74, 0]} castShadow scale={[profile.face.faceWidth, 1, 0.92]}>
          <sphereGeometry args={[0.2, 10, 8]} />
          <meshStandardMaterial color={skin} roughness={0.62} />
        </mesh>
        <mesh position={[-body.hipWidth * 0.22, -0.55, 0]} castShadow>
          <capsuleGeometry args={[0.09, body.upperLegLength + body.lowerLegLength - 0.18, 4, 7]} />
          <meshStandardMaterial color="#f5f1e9" roughness={0.72} />
        </mesh>
        <mesh position={[body.hipWidth * 0.22, -0.55, 0]} castShadow>
          <capsuleGeometry args={[0.09, body.upperLegLength + body.lowerLegLength - 0.18, 4, 7]} />
          <meshStandardMaterial color="#f5f1e9" roughness={0.72} />
        </mesh>
      </group>
      {controlled && (
        <group position={[0, body.height * 0.72, 0]}>
          <mesh rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.19, 0.36, 3]} />
            <meshStandardMaterial color="#f2cc41" emissive="#d99d12" emissiveIntensity={0.9} />
          </mesh>
        </group>
      )}
    </group>
  )
}
