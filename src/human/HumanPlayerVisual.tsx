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
  const fieldLodRef = useRef<THREE.Group>(null)
  const fieldLeftArmRef = useRef<THREE.Group>(null)
  const fieldRightArmRef = useRef<THREE.Group>(null)
  const fieldLeftLegRef = useRef<THREE.Group>(null)
  const fieldRightLegRef = useRef<THREE.Group>(null)
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
    fieldLod: fieldLodRef,
    fieldLeftArm: fieldLeftArmRef,
    fieldRightArm: fieldRightArmRef,
    fieldLeftLeg: fieldLeftLegRef,
    fieldRightLeg: fieldRightLegRef,
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
        {/* A separate neck trim, seam piping and jersey panels improve the silhouette in close-up. */}
        <mesh position={[0, body.torsoLength * 0.53, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[body.neckThickness * 1.04, 0.018, 7, 18]} />
          <meshStandardMaterial color={trim} roughness={0.84} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * body.shoulderWidth * 0.38, body.torsoLength * 0.35, 0.084]} rotation={[0, 0, side * 0.2]}>
              <capsuleGeometry args={[0.011, 0.12, 3, 7]} />
              <meshStandardMaterial color={trim} roughness={0.92} />
            </mesh>
            <mesh position={[side * torsoWidth * 0.57, body.torsoLength * 0.06, 0]} scale={[0.5, 1, 0.56]}>
              <capsuleGeometry args={[0.028, body.torsoLength * 0.32, 4, 9]} />
              <meshStandardMaterial color={accent} roughness={0.9} />
            </mesh>
          </group>
        ))}
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
    {/* Intermediate broadcast rig: articulated legs and arms preserve believable
        movement at lower draw cost than 22 fully detailed facial models. */}
    <group ref={fieldLodRef} visible={false}>
      <mesh position={[0, 0.10, 0]} scale={[body.shoulderWidth / 0.45, body.torsoLength / 0.58, torsoDepth / 0.25]} castShadow>
        <capsuleGeometry args={[0.245, 0.33, 7, 11]} />
        <meshStandardMaterial color={jersey} roughness={0.82} />
      </mesh>
      <mesh position={[0, -body.torsoLength * 0.34, 0]} scale={[body.hipWidth / 0.35, 0.8, 1]}>
        <capsuleGeometry args={[0.218, 0.12, 6, 10]} />
        <meshStandardMaterial color={shorts} roughness={0.8} />
      </mesh>
      <mesh position={[0, body.torsoLength * 0.69 + body.neckLength, 0]} scale={[profile.face.faceWidth, 1, 0.93]} castShadow>
        <sphereGeometry args={[0.187, 13, 11]} />
        <meshStandardMaterial color={profile.face.skinTone} roughness={0.61} />
      </mesh>
      <mesh position={[0, body.torsoLength * 0.81 + body.neckLength, -0.014]} scale={[1, 0.65, 0.94]}>
        <sphereGeometry args={[0.191, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.54]} />
        <meshStandardMaterial color={profile.face.hairTone} roughness={1} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <group ref={side === -1 ? fieldLeftArmRef : fieldRightArmRef} position={[side * body.shoulderWidth * 0.56, body.torsoLength * 0.41, 0]}>
            <mesh position={[0, -body.upperArmLength * 0.25, 0]} castShadow>
              <capsuleGeometry args={[0.078, body.upperArmLength * 0.32, 5, 9]} />
              <meshStandardMaterial color={jersey} roughness={0.84} />
            </mesh>
            <mesh position={[0, -body.upperArmLength * 0.85, 0]} castShadow>
              <capsuleGeometry args={[0.058, body.lowerArmLength * 0.72, 5, 9]} />
              <meshStandardMaterial color={profile.face.skinTone} roughness={0.65} />
            </mesh>
          </group>
          <group ref={side === -1 ? fieldLeftLegRef : fieldRightLegRef} position={[side * body.hipWidth * 0.40, -body.torsoLength * 0.40, 0]}>
            <mesh position={[0, -body.upperLegLength * 0.37, 0]} castShadow>
              <capsuleGeometry args={[0.106, body.upperLegLength * 0.50, 5, 10]} />
              <meshStandardMaterial color={shorts} roughness={0.83} />
            </mesh>
            <mesh position={[0, -body.upperLegLength * 0.82, 0]} castShadow>
              <capsuleGeometry args={[0.077, body.lowerLegLength * 0.30, 5, 9]} />
              <meshStandardMaterial color={profile.face.skinTone} roughness={0.68} />
            </mesh>
            <mesh position={[0, -body.upperLegLength - body.lowerLegLength * 0.39, 0]} castShadow>
              <capsuleGeometry args={[0.072, body.lowerLegLength * 0.64, 5, 9]} />
              <meshStandardMaterial color={socks} roughness={0.82} />
            </mesh>
            <mesh position={[0, -body.upperLegLength - body.lowerLegLength * 0.87, body.footLength * 0.27]} castShadow>
              <boxGeometry args={[0.16, 0.12, body.footLength]} />
              <meshStandardMaterial color="#181c1b" roughness={0.46} />
            </mesh>
          </group>
        </group>
      ))}
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
