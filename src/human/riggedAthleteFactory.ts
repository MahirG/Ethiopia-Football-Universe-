import * as THREE from 'three'
import type { QualityLevel } from '../game/types'
import type { PlayerProfile } from './types'

/**
 * Original low-poly skinned athlete authored in code. No third-party likenesses.
 *
 * The mesh deforms using actual Three.js bones/skinIndex attributes. It is a
 * working animation rig, not a photorealistic replacement for future GLB assets.
 * It is intended for broadcast-distance play on mobile.
 */
export type AthleteBoneName =
  | 'hips' | 'spine' | 'head'
  | 'upperArmL' | 'lowerArmL' | 'upperArmR' | 'lowerArmR'
  | 'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR'

export interface AthletePalette {
  jersey: string
  shorts: string
  socks: string
  trim: string
  boots?: string
}

export interface RiggedAthleteModel {
  mesh: THREE.SkinnedMesh<THREE.BufferGeometry, THREE.Material[]>
  bones: Record<AthleteBoneName, THREE.Bone>
  triangleCount: number
  dispose: () => void
}

interface Segment {
  bone: AthleteBoneName
  material: number
  center: [number, number, number]
  radii: [number, number, number]
  kind?: 'sphere' | 'front-number' | 'back-number'
  segments?: number
}

/**
 * One skinned BufferGeometry with material groups. Identical uniforms and
 * material slots are reused by every body segment; skin poses are independent.
 */
export function createRiggedAthlete(
  profile: PlayerProfile,
  palette: AthletePalette,
  quality: QualityLevel,
  frontNumber: THREE.Texture | null = null,
  backNumber: THREE.Texture | null = null,
): RiggedAthleteModel {
  const body = profile.body
  const face = profile.face
  const detail = quality === 'performance' ? 8 : quality === 'balanced' ? 11 : 14

  const bones = {} as Record<AthleteBoneName, THREE.Bone>
  const boneList: THREE.Bone[] = []
  function bone(name: AthleteBoneName, parent: THREE.Bone | null, x: number, y: number, z: number) {
    const part = new THREE.Bone()
    part.name = name
    part.position.set(x, y, z)
    if (parent) parent.add(part)
    bones[name] = part
    boneList.push(part)
    return part
  }
  const hips = bone('hips', null, 0, 0, 0)
  const spine = bone('spine', hips, 0, 0.06, 0)
  bone('head', spine, 0, body.torsoLength * 0.68 + body.neckLength + 0.10, 0)
  const shoulderY = body.torsoLength * 0.47
  const armX = body.shoulderWidth * 0.57
  const leftUpperArm = bone('upperArmL', spine, -armX, shoulderY, 0)
  bone('lowerArmL', leftUpperArm, 0, -body.upperArmLength, 0)
  const rightUpperArm = bone('upperArmR', spine, armX, shoulderY, 0)
  bone('lowerArmR', rightUpperArm, 0, -body.upperArmLength, 0)
  const leftThigh = bone('thighL', hips, -body.hipWidth * 0.44, -body.torsoLength * 0.42, 0)
  const leftShin = bone('shinL', leftThigh, 0, -body.upperLegLength, 0)
  bone('footL', leftShin, 0, -body.lowerLegLength, 0)
  const rightThigh = bone('thighR', hips, body.hipWidth * 0.44, -body.torsoLength * 0.42, 0)
  const rightShin = bone('shinR', rightThigh, 0, -body.upperLegLength, 0)
  bone('footR', rightShin, 0, -body.lowerLegLength, 0)

  // Geometry vertices are authored in neutral bind-pose coordinates. Skeleton
  // inverse matrices therefore cancel exactly at rest, then deform correctly.
  hips.updateMatrixWorld(true)
  const bindPositions = new Map<AthleteBoneName, THREE.Vector3>()
  for (const name of Object.keys(bones) as AthleteBoneName[]) {
    bindPositions.set(name, bones[name].getWorldPosition(new THREE.Vector3()))
  }

  const byMaterial = new Map<number, Segment[]>()
  function ellipsoid(material: number, part: AthleteBoneName, center: Segment['center'], radii: Segment['radii'], segments = detail) {
    const previous = byMaterial.get(material) ?? []
    previous.push({ material, bone: part, center, radii, segments })
    byMaterial.set(material, previous)
  }

  const shoulder = body.shoulderWidth
  const hip = body.hipWidth
  const thighWidth = THREE.MathUtils.lerp(0.095, 0.135, body.muscle)
  const armWidth = THREE.MathUtils.lerp(0.062, 0.092, body.muscle)
  // Tapered overlapping ellipsoids avoid the faceted capsule-to-box silhouette.
  ellipsoid(0, 'spine', [0, 0.10, 0], [shoulder * 0.57, body.torsoLength * 0.49, 0.19])
  ellipsoid(0, 'spine', [0, 0.30, 0], [shoulder * 0.62, 0.15, 0.195])
  ellipsoid(1, 'hips', [0, -body.torsoLength * 0.36, 0], [hip * 0.65, 0.18, 0.16])
  ellipsoid(6, 'spine', [0, body.torsoLength * 0.55, 0], [body.neckThickness * 1.05, 0.027, 0.113])
  // Close-up faces remain handled by the existing high-detail renderer.
  ellipsoid(2, 'head', [0, 0, 0], [0.20 * face.faceWidth, 0.235, 0.19])
  ellipsoid(2, 'head', [0, -0.125, 0.018], [0.165 * face.jawWidth, 0.105, 0.165])
  ellipsoid(2, 'head', [0, -0.035, 0.172], [0.039 * face.noseWidth, 0.07 * face.noseLength, 0.045])
  for (const side of [-1, 1] as const) {
    ellipsoid(2, 'head', [side * 0.198, -0.035, 0], [0.032 * face.earScale, 0.058, 0.032])
    ellipsoid(7, 'head', [side * 0.074 * face.eyeSpacing, 0.047, 0.174], [0.025, 0.013, 0.011], 8)
  }
  const hairHeight = face.hairStyle === 'afro' ? 0.125 : face.hairStyle === 'shaved' ? 0.022 : 0.065
  ellipsoid(5, 'head', [0, 0.18 + hairHeight * 0.28, -0.011], [0.194 * face.faceWidth, hairHeight + 0.029, 0.182])
  if (face.hairStyle === 'afro' || face.hairStyle === 'coiled') {
    for (let index = 0; index < 7; index += 1) {
      const angle = index / 7 * Math.PI * 2
      ellipsoid(5, 'head', [Math.cos(angle) * 0.125, 0.218 + index % 3 * 0.025, Math.sin(angle) * 0.122],
        [0.055, 0.052, 0.055], 7)
    }
  }

  for (const side of [-1, 1] as const) {
    const upperArm = side < 0 ? 'upperArmL' : 'upperArmR'
    const lowerArm = side < 0 ? 'lowerArmL' : 'lowerArmR'
    const thigh = side < 0 ? 'thighL' : 'thighR'
    const shin = side < 0 ? 'shinL' : 'shinR'
    const foot = side < 0 ? 'footL' : 'footR'
    ellipsoid(0, upperArm, [0, -body.upperArmLength * 0.28, 0], [armWidth * 1.19, body.upperArmLength * 0.39, armWidth * 1.18])
    ellipsoid(2, upperArm, [0, -body.upperArmLength * 0.73, 0], [armWidth * 0.91, body.upperArmLength * 0.27, armWidth * 0.94])
    ellipsoid(2, lowerArm, [0, -body.lowerArmLength * 0.39, 0], [armWidth * 0.76, body.lowerArmLength * 0.48, armWidth * 0.78])
    ellipsoid(2, lowerArm, [0, -body.lowerArmLength * 0.96, 0], [armWidth * 0.80, 0.078 * body.handScale, armWidth * 0.55])
    ellipsoid(1, thigh, [0, -body.upperLegLength * 0.23, 0], [thighWidth * 1.17, body.upperLegLength * 0.29, thighWidth])
    ellipsoid(2, thigh, [0, -body.upperLegLength * 0.66, 0], [thighWidth, body.upperLegLength * 0.32, thighWidth * 0.87])
    ellipsoid(2, shin, [0, -body.lowerLegLength * 0.23, 0], [thighWidth * 0.71, body.lowerLegLength * 0.3, thighWidth * 0.7])
    ellipsoid(3, shin, [0, -body.lowerLegLength * 0.68, 0], [thighWidth * 0.66, body.lowerLegLength * 0.35, thighWidth * 0.67])
    ellipsoid(4, foot, [0, -0.04, body.footLength * 0.27], [0.104, 0.084, body.footLength * 0.61])
    ellipsoid(6, foot, [0, 0.017, body.footLength * 0.56], [0.061, 0.008, body.footLength * 0.22], 7)
  }

  // Jersey number planes use the already-generated per-player textures; ownership
  // stays with the caller (do not dispose them with the skinned mesh materials).
  if (frontNumber) {
    const group = byMaterial.get(8) ?? []
    group.push({ material: 8, bone: 'spine', center: [0, 0.105, 0.19], radii: [0.245, 0.315, 0], kind: 'front-number' })
    byMaterial.set(8, group)
  }
  if (backNumber) {
    const group = byMaterial.get(9) ?? []
    group.push({ material: 9, bone: 'spine', center: [0, 0.105, -0.19], radii: [0.23, 0.31, 0], kind: 'back-number' })
    byMaterial.set(9, group)
  }

  const geometry = new THREE.BufferGeometry()
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const boneIndices: number[] = []
  const weights: number[] = []
  const indices: number[] = []
  let nextVertex = 0
  for (const [material, segments] of [...byMaterial.entries()].sort((a, b) => a[0] - b[0])) {
    const startIndex = indices.length
    for (const segment of segments) {
      const piece = segment.kind === 'front-number' || segment.kind === 'back-number'
        ? new THREE.PlaneGeometry(segment.radii[0], segment.radii[1])
        : new THREE.SphereGeometry(1, segment.segments ?? detail, Math.max(6, Math.floor((segment.segments ?? detail) * 0.77)))
      if (segment.kind === 'back-number') piece.rotateY(Math.PI)
      if (!segment.kind || segment.kind === 'sphere') piece.scale(...segment.radii)
      const joint = bindPositions.get(segment.bone)!
      piece.translate(
        segment.center[0] + joint.x,
        segment.center[1] + joint.y,
        segment.center[2] + joint.z,
      )
      const p = piece.getAttribute('position')
      const n = piece.getAttribute('normal')
      const uv = piece.getAttribute('uv')
      const boneIndex = boneList.indexOf(bones[segment.bone])
      for (let i = 0; i < p.count; i += 1) {
        positions.push(p.getX(i), p.getY(i), p.getZ(i))
        normals.push(n.getX(i), n.getY(i), n.getZ(i))
        uvs.push(uv.getX(i), uv.getY(i))
        boneIndices.push(boneIndex, 0, 0, 0)
        weights.push(1, 0, 0, 0)
      }
      const idx = piece.getIndex()
      if (idx) for (let i = 0; i < idx.count; i += 1) indices.push(idx.getX(i) + nextVertex)
      nextVertex += p.count
      piece.dispose()
    }
    geometry.addGroup(startIndex, indices.length - startIndex, material)
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(boneIndices, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()

  const materials: THREE.Material[] = [
    new THREE.MeshStandardMaterial({ color: palette.jersey, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: palette.shorts, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: face.skinTone, roughness: 0.60 }),
    new THREE.MeshStandardMaterial({ color: palette.socks, roughness: 0.82 }),
    new THREE.MeshStandardMaterial({ color: palette.boots ?? '#161b1c', roughness: 0.46 }),
    new THREE.MeshStandardMaterial({ color: face.hairTone, roughness: 0.98 }),
    new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.79 }),
    new THREE.MeshStandardMaterial({ color: face.eyeTone, roughness: 0.73 }),
    new THREE.MeshBasicMaterial({ map: frontNumber ?? undefined, transparent: true, alphaTest: 0.08, depthWrite: false, toneMapped: false }),
    new THREE.MeshBasicMaterial({ map: backNumber ?? undefined, transparent: true, alphaTest: 0.08, depthWrite: false, toneMapped: false }),
  ]
  const mesh = new THREE.SkinnedMesh(geometry, materials)
  mesh.name = 'EFU_' + profile.id + '_SkinnedAthlete'
  mesh.castShadow = true
  mesh.add(hips)
  mesh.updateMatrixWorld(true)
  const skeleton = new THREE.Skeleton(boneList)
  mesh.bind(skeleton)
  mesh.normalizeSkinWeights()

  return {
    mesh,
    bones,
    triangleCount: geometry.index ? geometry.index.count / 3 : 0,
    dispose: () => {
      geometry.dispose()
      for (const material of materials) material.dispose()
      skeleton.dispose()
    },
  }
}
