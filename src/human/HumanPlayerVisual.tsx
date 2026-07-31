import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { PresentationPhase, QualityLevel, TeamSide } from '../game/types'
import { useRealisticPlayerAnimation, type PlayerAnimationRefs } from './RealisticPlayerAnimation'
import { RealisticPlayerFace } from './RealisticPlayerFace'
import { createShirtTexture, PlayerPbr, RealisticArm, RealisticLeg } from './RealisticPlayerParts'
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

export function HumanPlayerVisual({ profile, runtime, motion, kitColor, secondaryColor, quality, controlled, presentationPhase, celebrationTeam }: HumanPlayerVisualProps) {
  const { camera, gl } = useThree()
  const body = profile.body
  const home = profile.team === 'home'
  const goalkeeper = profile.role === 'goalkeeper'
  const jersey = goalkeeper ? secondaryColor : home ? '#0b7a43' : kitColor
  const shorts = goalkeeper ? '#23313a' : home ? '#c92731' : secondaryColor
  const socks = goalkeeper ? '#232b2f' : home ? '#f0ce32' : '#f2f0e8'
  const trim = home && !goalkeeper ? '#efcf31' : secondaryColor
  const accent = home && !goalkeeper ? '#c91f2e' : kitColor
  const frontTexture = useMemo(() => createShirtTexture(profile.number, true, home && !goalkeeper), [profile.number, home, goalkeeper])
  const backTexture = useMemo(() => createShirtTexture(profile.number, false, home && !goalkeeper), [profile.number, home, goalkeeper])

  useEffect(() => {
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    if (frontTexture) frontTexture.anisotropy = anisotropy
    if (backTexture) backTexture.anisotropy = anisotropy
    return () => { frontTexture?.dispose(); backTexture?.dispose() }
  }, [frontTexture, backTexture, gl])

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
  const hairDetailRef = useRef<THREE.Group>(null)
  const faceDetailRef = useRef<THREE.Group>(null)
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
  const jerseyFrontRef = useRef<THREE.Mesh>(null)
  const jerseyBackRef = useRef<THREE.Mesh>(null)
  const skinMaterials = useRef<THREE.MeshPhysicalMaterial[]>([])
  const kitMaterials = useRef<THREE.MeshPhysicalMaterial[]>([])
  // blinkTimer is managed by useRealisticPlayerAnimation.

  const animationRefs: PlayerAnimationRefs = {
    root: rootRef,
    highLod: highLodRef,
    lowLod: lowLodRef,
    torso: torsoRef,
    pelvis: pelvisRef,
    head: headRef,
    eyes: eyesRef,
    leftLid: leftLidRef,
    rightLid: rightLidRef,
    mouth: mouthRef,
    hair: hairRef,
    faceDetail: faceDetailRef,
    hairDetail: hairDetailRef,
    leftArm: leftArmRef,
    rightArm: rightArmRef,
    leftForearm: leftForearmRef,
    rightForearm: rightForearmRef,
    leftLeg: leftLegRef,
    rightLeg: rightLegRef,
    leftCalf: leftCalfRef,
    rightCalf: rightCalfRef,
    leftFoot: leftFootRef,
    rightFoot: rightFootRef,
    leftHandDetail: leftHandDetailRef,
    rightHandDetail: rightHandDetailRef,
    leftBootDetail: leftBootDetailRef,
    rightBootDetail: rightBootDetailRef,
    jerseyFront: jerseyFrontRef,
    jerseyBack: jerseyBackRef,
  }

  useRealisticPlayerAnimation({
    profile,
    runtime,
    motion,
    quality,
    controlled,
    presentationPhase,
    celebrationTeam,
    camera,
    refs: animationRefs,
    skinMaterials,
    kitMaterials,
  })

  const torsoWidth = body.shoulderWidth * 0.78
  const torsoDepth = THREE.MathUtils.lerp(0.22, 0.29, body.muscle)
  return <group ref={rootRef}>
    <group ref={highLodRef}>
      <group ref={pelvisRef} position={[0, -0.02, 0]}>
        <mesh position={[0, -body.torsoLength * 0.34, 0]} castShadow scale={[body.hipWidth / 0.35, 0.75, 0.92]}>
          <capsuleGeometry args={[0.23, 0.17, 11, 19]} />
          <PlayerPbr color={shorts} refs={kitMaterials} />
        </mesh>
      </group>
      <group ref={torsoRef} position={[0, 0.08, 0]}>
        <mesh position={[0, body.torsoLength * 0.1, 0]} castShadow scale={[torsoWidth / 0.37, body.torsoLength / 0.58, torsoDepth / 0.25]}>
          <capsuleGeometry args={[0.267, 0.33, 13, 22]} />
          <PlayerPbr color={jersey} refs={kitMaterials} />
        </mesh>
        <mesh position={[0, body.torsoLength * 0.24, 0.222]} scale={[body.shoulderWidth / 0.46, 1, 1]}>
          <boxGeometry args={[0.45, 0.135, 0.018]} />
          <meshStandardMaterial color={trim} roughness={0.72} />
        </mesh>
        <mesh position={[0, body.torsoLength * 0.15, 0.231]} rotation={[0, 0, -0.12]} scale={[body.shoulderWidth / 0.46, 1, 1]}>
          <boxGeometry args={[0.48, 0.045, 0.016]} />
          <meshStandardMaterial color={accent} roughness={0.72} />
        </mesh>
        <mesh ref={jerseyFrontRef} position={[0, body.torsoLength * 0.06, 0.244]}>
          <planeGeometry args={[body.shoulderWidth * 0.9, body.torsoLength * 0.83]} />
          <meshBasicMaterial map={frontTexture ?? undefined} transparent alphaTest={0.03} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh ref={jerseyBackRef} position={[0, body.torsoLength * 0.06, -0.244]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[body.shoulderWidth * 0.82, body.torsoLength * 0.72]} />
          <meshBasicMaterial map={backTexture ?? undefined} transparent alphaTest={0.03} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, body.torsoLength * 0.56, 0]}>
          <cylinderGeometry args={[body.neckThickness * 0.79, body.neckThickness, body.neckLength, 18]} />
          <PlayerPbr color={profile.face.skinTone} skin refs={skinMaterials} />
        </mesh>
      </group>
      <RealisticPlayerFace profile={profile} headRef={headRef} eyesRef={eyesRef} leftLidRef={leftLidRef} rightLidRef={rightLidRef} mouthRef={mouthRef} jawRef={jawRef} leftBrowRef={leftBrowRef} rightBrowRef={rightBrowRef} hairRef={hairRef} hairDetailRef={hairDetailRef} faceDetailRef={faceDetailRef} skinMaterials={skinMaterials} />
      <RealisticArm side={-1} profile={profile} jersey={jersey} upperRef={leftArmRef} lowerRef={leftForearmRef} detailRef={leftHandDetailRef} skinMaterials={skinMaterials} kitMaterials={kitMaterials} />
      <RealisticArm side={1} profile={profile} jersey={jersey} upperRef={rightArmRef} lowerRef={rightForearmRef} detailRef={rightHandDetailRef} skinMaterials={skinMaterials} kitMaterials={kitMaterials} />
      <RealisticLeg side={-1} profile={profile} shorts={shorts} socks={socks} upperRef={leftLegRef} lowerRef={leftCalfRef} footRef={leftFootRef} detailRef={leftBootDetailRef} skinMaterials={skinMaterials} kitMaterials={kitMaterials} />
      <RealisticLeg side={1} profile={profile} shorts={shorts} socks={socks} upperRef={rightLegRef} lowerRef={rightCalfRef} footRef={rightFootRef} detailRef={rightBootDetailRef} skinMaterials={skinMaterials} kitMaterials={kitMaterials} />
    </group>
    <group ref={lowLodRef} visible={false}>
      <mesh position={[0, 0.17, 0]} scale={[body.shoulderWidth / 0.45, body.torsoLength / 0.58, 0.9]} castShadow>
        <capsuleGeometry args={[0.25, 0.36, 6, 10]} />
        <meshStandardMaterial color={jersey} roughness={0.7} />
      </mesh>
      <mesh position={[0, body.torsoLength * 0.75, 0]}>
        <sphereGeometry args={[0.2, 10, 8]} />
        <meshStandardMaterial color={profile.face.skinTone} roughness={0.58} />
      </mesh>
      {[-1, 1].map((side) => <mesh key={side} position={[side * body.hipWidth * 0.22, -0.55, 0]}>
        <capsuleGeometry args={[0.09, body.upperLegLength + body.lowerLegLength - 0.18, 4, 7]} />
        <meshStandardMaterial color={socks} roughness={0.7} />
      </mesh>)}
    </group>
    {controlled && <mesh position={[0, body.height * 0.72, 0]} rotation={[0, 0, Math.PI]}>
      <coneGeometry args={[0.17, 0.3, 4]} />
      <meshStandardMaterial color="#f5d03b" emissive="#d99d12" emissiveIntensity={0.82} />
    </mesh>}
  </group>
}
