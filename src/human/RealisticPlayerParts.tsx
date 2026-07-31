/* eslint-disable react-refresh/only-export-components */
import type { MutableRefObject, RefObject } from 'react'
import * as THREE from 'three'
import type { PlayerProfile } from './types'

export type PlayerMaterialRefs = MutableRefObject<THREE.MeshPhysicalMaterial[]>

export function PlayerPbr({ color, refs, skin = false }: { color: string; refs: PlayerMaterialRefs; skin?: boolean }) {
  return <meshPhysicalMaterial
    ref={(material) => { if (material && !refs.current.includes(material)) refs.current.push(material) }}
    color={color}
    roughness={skin ? 0.54 : 0.68}
    clearcoat={skin ? 0.05 : 0.02}
    clearcoatRoughness={0.52}
    sheen={skin ? 0.08 : 0.3}
    sheenRoughness={0.78}
  />
}

export function createShirtTexture(number: number, front: boolean, ethiopiaHome: boolean) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) return null

  if (front && ethiopiaHome) {
    context.fillStyle = '#efcf31'
    context.fillRect(0, 68, 512, 182)
    context.save()
    context.translate(256, 170)
    context.rotate(-0.13)
    context.fillStyle = '#c91f2e'
    context.fillRect(-300, 45, 600, 45)
    context.restore()
    context.fillStyle = '#8f171e'
    context.font = '900 60px Arial'
    context.textAlign = 'center'
    context.fillText('ETHIOPIA', 290, 162)
    context.beginPath()
    context.arc(72, 150, 37, 0, Math.PI * 2)
    context.fillStyle = '#efcf31'
    context.fill()
    context.lineWidth = 9
    context.strokeStyle = '#16834c'
    context.stroke()
    context.beginPath()
    context.arc(72, 150, 18, 0, Math.PI * 2)
    context.lineWidth = 7
    context.strokeStyle = '#c91f2e'
    context.stroke()
  }

  context.font = `900 ${front ? 145 : 250}px Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineWidth = 16
  context.strokeStyle = ethiopiaHome ? '#174f30' : '#1c211e'
  context.fillStyle = ethiopiaHome ? '#f3d43b' : '#f7f3ea'
  context.strokeText(String(number), 256, front ? 370 : 276)
  context.fillText(String(number), 256, front ? 370 : 276)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  return texture
}

interface ArmProps {
  side: -1 | 1
  profile: PlayerProfile
  jersey: string
  upperRef: RefObject<THREE.Group | null>
  lowerRef: RefObject<THREE.Group | null>
  detailRef: RefObject<THREE.Group | null>
  skinMaterials: PlayerMaterialRefs
  kitMaterials: PlayerMaterialRefs
}

export function RealisticArm({ side, profile, jersey, upperRef, lowerRef, detailRef, skinMaterials, kitMaterials }: ArmProps) {
  const body = profile.body
  const radius = THREE.MathUtils.lerp(0.068, 0.095, body.muscle)
  const skin = profile.face.skinTone
  return <group ref={upperRef} position={[side * body.shoulderWidth * 0.56, body.torsoLength * 0.43, 0]} rotation={[0.08, 0, -side * 0.08]}>
    <mesh position={[0, -0.04, 0]} scale={[1.15, 1, 1.06]} castShadow>
      <sphereGeometry args={[radius * 1.2, 18, 14]} />
      <PlayerPbr color={jersey} refs={kitMaterials} />
    </mesh>
    <mesh position={[0, -body.upperArmLength * 0.3, 0]} castShadow>
      <cylinderGeometry args={[radius * 0.88, radius * 1.04, body.upperArmLength * 0.55, 18, 3]} />
      <PlayerPbr color={jersey} refs={kitMaterials} />
    </mesh>
    <mesh position={[0, -body.upperArmLength * 0.73, 0]} castShadow>
      <cylinderGeometry args={[radius * 0.69, radius * 0.86, body.upperArmLength * 0.33, 18, 3]} />
      <PlayerPbr color={skin} skin refs={skinMaterials} />
    </mesh>
    <mesh position={[0, -body.upperArmLength, 0]} scale={[1, 0.8, 0.92]} castShadow>
      <sphereGeometry args={[radius * 0.79, 16, 13]} />
      <PlayerPbr color={skin} skin refs={skinMaterials} />
    </mesh>
    <group ref={lowerRef} position={[0, -body.upperArmLength, 0]} rotation={[0.16, 0, 0]}>
      <mesh position={[0, -body.lowerArmLength * 0.46, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.48, radius * 0.7, body.lowerArmLength * 0.88, 18, 4]} />
        <PlayerPbr color={skin} skin refs={skinMaterials} />
      </mesh>
      <group position={[0, -body.lowerArmLength - 0.05, 0.01]} scale={body.handScale}>
        <mesh scale={[0.68, 1.04, 0.44]} castShadow>
          <sphereGeometry args={[0.08, 16, 13]} />
          <PlayerPbr color={skin} skin refs={skinMaterials} />
        </mesh>
        <group ref={detailRef} position={[0, -0.065, 0]}>
          {[-0.039, -0.013, 0.013, 0.039].map((x, index) => <mesh key={x} position={[x, -0.026 - index * 0.003, 0]}>
            <capsuleGeometry args={[0.009, 0.052 - index * 0.003, 5, 8]} />
            <PlayerPbr color={skin} skin refs={skinMaterials} />
          </mesh>)}
        </group>
      </group>
    </group>
  </group>
}

interface LegProps {
  side: -1 | 1
  profile: PlayerProfile
  shorts: string
  socks: string
  upperRef: RefObject<THREE.Group | null>
  lowerRef: RefObject<THREE.Group | null>
  footRef: RefObject<THREE.Group | null>
  detailRef: RefObject<THREE.Group | null>
  skinMaterials: PlayerMaterialRefs
  kitMaterials: PlayerMaterialRefs
}

export function RealisticLeg({ side, profile, shorts, socks, upperRef, lowerRef, footRef, detailRef, skinMaterials, kitMaterials }: LegProps) {
  const body = profile.body
  const skin = profile.face.skinTone
  const thigh = THREE.MathUtils.lerp(0.092, 0.128, body.muscle)
  const calf = thigh * 0.8
  return <group ref={upperRef} position={[side * body.hipWidth * 0.42, -body.torsoLength * 0.39, 0]}>
    <mesh position={[0, -body.upperLegLength * 0.18, 0]} castShadow>
      <cylinderGeometry args={[thigh, thigh * 1.14, body.upperLegLength * 0.34, 18, 3]} />
      <PlayerPbr color={shorts} refs={kitMaterials} />
    </mesh>
    <mesh position={[0, -body.upperLegLength * 0.57, 0]} castShadow>
      <cylinderGeometry args={[thigh * 0.73, thigh, body.upperLegLength * 0.47, 18, 4]} />
      <PlayerPbr color={skin} skin refs={skinMaterials} />
    </mesh>
    <mesh position={[0, -body.upperLegLength, 0.006]} scale={[1, 0.78, 0.94]} castShadow>
      <sphereGeometry args={[thigh * 0.73, 16, 13]} />
      <PlayerPbr color={skin} skin refs={skinMaterials} />
    </mesh>
    <group ref={lowerRef} position={[0, -body.upperLegLength, 0]}>
      <mesh position={[0, -body.lowerLegLength * 0.27, 0]} castShadow>
        <cylinderGeometry args={[calf, calf * 0.68, body.lowerLegLength * 0.5, 18, 4]} />
        <PlayerPbr color={skin} skin refs={skinMaterials} />
      </mesh>
      <mesh position={[0, -body.lowerLegLength * 0.72, 0]} castShadow>
        <cylinderGeometry args={[calf * 0.56, calf * 0.79, body.lowerLegLength * 0.46, 18, 4]} />
        <PlayerPbr color={socks} refs={kitMaterials} />
      </mesh>
      <mesh position={[0, -body.lowerLegLength * 0.53, 0.058]} scale={[0.66, 1.3, 0.22]}>
        <boxGeometry args={[0.13, 0.2, 0.02]} />
        <meshStandardMaterial color="#eee9dc" roughness={0.75} />
      </mesh>
      <group ref={footRef} position={[0, -body.lowerLegLength - 0.02, body.footLength * 0.3]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.92, body.footLength / 0.275, 0.64]} castShadow>
          <capsuleGeometry args={[0.088, 0.19, 8, 16]} />
          <meshPhysicalMaterial color="#101417" roughness={0.34} clearcoat={0.3} />
        </mesh>
        <mesh position={[0, 0.012, 0.105]} scale={[0.74, 0.2, 1]}>
          <boxGeometry args={[0.17, 0.02, 0.2]} />
          <meshStandardMaterial color={side < 0 ? '#dce6e6' : '#d4b83e'} roughness={0.42} />
        </mesh>
        <group ref={detailRef}>{[-0.055, -0.018, 0.018, 0.055].map((x) => <mesh key={x} position={[x, -0.047, 0.06]}>
          <cylinderGeometry args={[0.009, 0.011, 0.021, 7]} />
          <meshStandardMaterial color="#8e9898" roughness={0.6} />
        </mesh>)}</group>
      </group>
    </group>
  </group>
}
