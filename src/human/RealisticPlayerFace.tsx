import type { RefObject } from 'react'
import * as THREE from 'three'
import { PlayerPbr, type PlayerMaterialRefs } from './RealisticPlayerParts'
import type { PlayerProfile } from './types'

interface Props {
  profile: PlayerProfile
  headRef: RefObject<THREE.Group | null>
  eyesRef: RefObject<THREE.Group | null>
  leftLidRef: RefObject<THREE.Mesh | null>
  rightLidRef: RefObject<THREE.Mesh | null>
  mouthRef: RefObject<THREE.Mesh | null>
  jawRef: RefObject<THREE.Group | null>
  leftBrowRef: RefObject<THREE.Mesh | null>
  rightBrowRef: RefObject<THREE.Mesh | null>
  hairRef: RefObject<THREE.Group | null>
  hairDetailRef: RefObject<THREE.Group | null>
  faceDetailRef: RefObject<THREE.Group | null>
  skinMaterials: PlayerMaterialRefs
}

export function RealisticPlayerFace({ profile, headRef, eyesRef, leftLidRef, rightLidRef, mouthRef, jawRef, leftBrowRef, rightBrowRef, hairRef, hairDetailRef, faceDetailRef, skinMaterials }: Props) {
  const face = profile.face
  const eyeX = 0.073 * face.eyeSpacing
  const curls = face.hairStyle === 'afro' ? 22 : face.hairStyle === 'coiled' ? 17 : face.hairStyle === 'braids' ? 15 : 9
  const curlRadius = face.hairStyle === 'afro' ? 0.064 : 0.04

  return <group ref={headRef} position={[0, profile.body.torsoLength * 0.66 + profile.body.neckLength + 0.15, 0]}>
    <mesh scale={[face.faceWidth, 1 + (face.foreheadHeight - 1) * 0.13, 0.91]} castShadow>
      <sphereGeometry args={[0.202, 30, 24]} />
      <PlayerPbr color={face.skinTone} skin refs={skinMaterials} />
    </mesh>
    <group ref={jawRef} position={[0, -0.118, 0.006]}>
      <mesh scale={[face.jawWidth, 0.68, 0.82]} castShadow>
        <sphereGeometry args={[0.178, 24, 18]} />
        <PlayerPbr color={face.skinTone} skin refs={skinMaterials} />
      </mesh>
    </group>
    <mesh position={[0, 0.004, 0.19]} rotation={[Math.PI / 2, 0, 0]} scale={[face.noseWidth, face.noseLength, 0.9]} castShadow>
      <coneGeometry args={[0.041, 0.126, 16]} />
      <PlayerPbr color={face.skinTone} skin refs={skinMaterials} />
    </mesh>
    <group ref={eyesRef}>
      {[-eyeX, eyeX].map((x, index) => <group key={x} position={[x, 0.055, 0.18]} scale={[face.eyeScale, 1, 1]}>
        <mesh scale={[1.12, 0.58, 0.52]}>
          <sphereGeometry args={[0.031, 16, 12]} />
          <meshPhysicalMaterial color="#f4eee5" roughness={0.24} clearcoat={0.64} />
        </mesh>
        <mesh position={[0, 0, 0.024]}>
          <sphereGeometry args={[0.014, 12, 10]} />
          <meshPhysicalMaterial color={face.eyeTone} roughness={0.22} clearcoat={0.72} />
        </mesh>
        <mesh position={[0, 0, 0.034]}>
          <sphereGeometry args={[0.006, 8, 8]} />
          <meshBasicMaterial color="#070706" />
        </mesh>
        <mesh ref={index === 0 ? leftLidRef : rightLidRef} position={[0, 0.013, 0.034]} scale={[1.2, 0.18, 0.55]}>
          <sphereGeometry args={[0.032, 12, 8]} />
          <PlayerPbr color={face.skinTone} skin refs={skinMaterials} />
        </mesh>
      </group>)}
    </group>
    <mesh ref={leftBrowRef} position={[-eyeX, 0.11, 0.192]} rotation={[0, 0, -0.09]} scale={[1.2, 0.32, 0.44]}>
      <capsuleGeometry args={[0.013, 0.06, 4, 8]} />
      <meshStandardMaterial color={face.hairTone} roughness={0.94} />
    </mesh>
    <mesh ref={rightBrowRef} position={[eyeX, 0.11, 0.192]} rotation={[0, 0, 0.09]} scale={[1.2, 0.32, 0.44]}>
      <capsuleGeometry args={[0.013, 0.06, 4, 8]} />
      <meshStandardMaterial color={face.hairTone} roughness={0.94} />
    </mesh>
    <mesh ref={mouthRef} position={[0, -0.087, 0.188]} scale={[face.lipFullness, 0.42, 0.5]}>
      <sphereGeometry args={[0.061, 15, 10]} />
      <meshPhysicalMaterial color="#572c27" roughness={0.56} clearcoat={0.14} />
    </mesh>
    {[-1, 1].map((side) => <mesh key={side} position={[side * 0.202, 0.004, 0]} scale={[face.earScale, 1, 0.7]}>
      <sphereGeometry args={[0.043, 12, 9]} />
      <PlayerPbr color={face.skinTone} skin refs={skinMaterials} />
    </mesh>)}
    <group ref={hairRef}>
      <mesh position={[0, 0.13, -0.012]} scale={[1.02, face.hairStyle === 'afro' ? 0.78 : 0.61, 0.96]} castShadow>
        <sphereGeometry args={[0.216, 18, 13, 0, Math.PI * 2, 0, Math.PI * 0.63]} />
        <meshStandardMaterial color={face.hairTone} roughness={0.98} />
      </mesh>
      <group ref={hairDetailRef}>
        {Array.from({ length: curls }, (_, index) => {
          const angle = index / curls * Math.PI * 2
          const ring = index % 3
          return <mesh key={index} position={[
            Math.cos(angle) * (0.085 + ring * 0.034),
            0.14 + index % 4 * 0.025,
            Math.sin(angle) * (0.07 + ring * 0.024),
          ]} scale={[1, face.hairStyle === 'braids' ? 1.6 : 1, 1]}>
            <sphereGeometry args={[curlRadius, 8, 7]} />
            <meshStandardMaterial color={face.hairTone} roughness={0.99} />
          </mesh>
        })}
      </group>
    </group>
    {face.beardStyle !== 'none' && <mesh position={[0, -0.14, 0.105]} scale={[face.jawWidth, face.beardStyle === 'goatee' ? 0.42 : 0.64, 0.84]}>
      <sphereGeometry args={[0.18, 16, 11, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55]} />
      <meshStandardMaterial color={face.hairTone} roughness={0.97} transparent opacity={face.beardStyle === 'stubble' ? 0.32 : 0.72} />
    </mesh>}
    <group ref={faceDetailRef}>
      {face.scar > 0 && <mesh position={[0.11, 0, 0.198]} rotation={[0, 0, -0.36]}>
        <boxGeometry args={[0.011, 0.07, 0.005]} />
        <meshBasicMaterial color="#6d332c" transparent opacity={0.45} />
      </mesh>}
    </group>
  </group>
}
