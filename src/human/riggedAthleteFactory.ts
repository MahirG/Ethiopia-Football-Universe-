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
  kind?: 'sphere' | 'taper' | 'front-number' | 'back-number'
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
  // A tapered, continuously surfaced joint segment reads as an athletic limb,
  // rather than the detached overlapping spheres of the old placeholder.
  function taper(material: number, part: AthleteBoneName, center: Segment['center'], radii: Segment['radii']) {
    const previous = byMaterial.get(material) ?? []
    previous.push({ material, bone: part, center, radii, segments: detail, kind: 'taper' })
    byMaterial.set(material, previous)
  }

  const shoulder = body.shoulderWidth
  const hip = body.hipWidth
  const thighWidth = THREE.MathUtils.lerp(0.095, 0.135, body.muscle)
  const armWidth = THREE.MathUtils.lerp(0.062, 0.092, body.muscle)
  // Footballer silhouette: broad shoulders, narrower waist and natural hip
  // transition. The torso is no longer a round barrel with a sphere on top.
  taper(0, 'spine', [0, 0.095, 0], [shoulder * 0.58, body.torsoLength * 0.94, 0.187])
  ellipsoid(0, 'spine', [0, 0.24, 0], [shoulder * 0.55, 0.145, 0.17])
  taper(1, 'hips', [0, -body.torsoLength * 0.35, 0], [hip * 0.63, 0.245, 0.157])
  ellipsoid(6, 'spine', [0, body.torsoLength * 0.555, 0], [body.neckThickness * 0.96, 0.024, 0.107])
  // Athletic adult proportions (~one eighth of full height for the head).
  // A narrower jaw / skull replaces the huge doll-like head silhouette.
  ellipsoid(2, 'head', [0, 0.008, 0], [0.174 * face.faceWidth, 0.196, 0.157])
  ellipsoid(2, 'head', [0, -0.106, 0.015], [0.143 * face.jawWidth, 0.089, 0.138])
  ellipsoid(2, 'head', [0, -0.026, 0.146], [0.035 * face.noseWidth, 0.055 * face.noseLength, 0.037])
  for (const side of [-1, 1] as const) {
    ellipsoid(2, 'head', [side * 0.173, -0.035, 0], [0.021 * face.earScale, 0.048, 0.025])
    ellipsoid(7, 'head', [side * 0.065 * face.eyeSpacing, 0.040, 0.149], [0.021, 0.010, 0.009], 8)
    // Eyebrows and upper cheek planes preserve expressions in normal field views.
    if (quality !== 'performance') {
      ellipsoid(5, 'head', [side * 0.065 * face.eyeSpacing, 0.075, 0.147],
        [0.033, 0.008, 0.007], 8)
      ellipsoid(2, 'head', [side * 0.055, -0.050, 0.119],
        [0.050, 0.022 * face.cheekHeight, 0.020], 8)
    }
  }
  if (quality !== 'performance') {
    ellipsoid(10, 'head', [0, -0.112, 0.139], [0.041 * face.lipFullness, 0.007, 0.008], 8)
    if (face.beardStyle !== 'none') {
      ellipsoid(5, 'head', [0, -0.151, 0.115],
        [0.074 * face.jawWidth, face.beardStyle === 'goatee' ? 0.028 : 0.042, 0.024], 9)
    }
  }
  const hairHeight = face.hairStyle === 'afro' ? 0.095 : face.hairStyle === 'shaved' ? 0.012 : 0.046
  ellipsoid(5, 'head', [0, 0.148 + hairHeight * 0.23, -0.006], [0.171 * face.faceWidth, hairHeight + 0.026, 0.154])
  if (face.hairStyle === 'afro' || face.hairStyle === 'coiled' || face.hairStyle === 'short-curl') {
    for (let index = 0; index < (quality === 'ultra' ? 10 : 6); index += 1) {
      const angle = index / (quality === 'ultra' ? 10 : 6) * Math.PI * 2
      ellipsoid(5, 'head', [Math.cos(angle) * 0.111, 0.187 + index % 3 * 0.018, Math.sin(angle) * 0.109],
        [0.036, 0.034, 0.039], 8)
    }
  } else if (face.hairStyle === 'braids' && quality !== 'performance') {
    for (let index = 0; index < 6; index += 1) {
      const x = (index - 2.5) * 0.055
      ellipsoid(5, 'head', [x * 0.78, 0.182, -0.02], [0.016, 0.020, 0.116], 8)
    }
  }

  for (const side of [-1, 1] as const) {
    const upperArm = side < 0 ? 'upperArmL' : 'upperArmR'
    const lowerArm = side < 0 ? 'lowerArmL' : 'lowerArmR'
    const thigh = side < 0 ? 'thighL' : 'thighR'
    const shin = side < 0 ? 'shinL' : 'shinR'
    const foot = side < 0 ? 'footL' : 'footR'
    // Sculpted clothing-to-skin transitions: tapered upper arms, elongated
    // forearms and full-length football socks instead of ball-shaped joints.
    taper(0, upperArm, [0, -body.upperArmLength * 0.26, 0],
      [armWidth * 1.17, body.upperArmLength * 0.54, armWidth * 1.13])
    taper(2, upperArm, [0, -body.upperArmLength * 0.77, 0],
      [armWidth * 0.88, body.upperArmLength * 0.38, armWidth * 0.87])
    taper(2, lowerArm, [0, -body.lowerArmLength * 0.47, 0],
      [armWidth * 0.83, body.lowerArmLength * 0.91, armWidth * 0.81])
    ellipsoid(2, lowerArm, [0, -body.lowerArmLength * 0.96, 0],
      [armWidth * 0.62, 0.068 * body.handScale, armWidth * 0.48])
    taper(1, thigh, [0, -body.upperLegLength * 0.22, 0],
      [thighWidth * 1.14, body.upperLegLength * 0.47, thighWidth * 1.03])
    taper(2, thigh, [0, -body.upperLegLength * 0.69, 0],
      [thighWidth * 0.94, body.upperLegLength * 0.51, thighWidth * 0.90])
    ellipsoid(2, shin, [0, -body.lowerLegLength * 0.08, 0],
      [thighWidth * 0.74, 0.085, thighWidth * 0.74])
    taper(3, shin, [0, -body.lowerLegLength * 0.57, 0],
      [thighWidth * 0.77, body.lowerLegLength * 0.77, thighWidth * 0.75])
    ellipsoid(4, foot, [0, -0.045, body.footLength * 0.30],
      [0.091, 0.074, body.footLength * 0.61])
    ellipsoid(6, foot, [0, 0.014, body.footLength * 0.55],
      [0.052, 0.005, body.footLength * 0.21], 8)
    // A restrained kit identity: sleeve cuffs, short piping, sock bands, boots.
    ellipsoid(6, upperArm, [0, -body.upperArmLength * 0.51, 0],
      [armWidth * 1.10, 0.018, armWidth * 1.11], 8)
    ellipsoid(6, thigh, [side * 0.021, -body.upperLegLength * 0.19, thighWidth * 0.88],
      [0.014, body.upperLegLength * 0.17, 0.014], 7)
    ellipsoid(6, shin, [0, -body.lowerLegLength * 0.56, 0],
      [thighWidth * 0.67, 0.018, thighWidth * 0.69], 8)
    if (quality !== 'performance') {
      for (let index = 0; index < 3; index += 1) {
        ellipsoid(6, foot, [0, 0.055, body.footLength * (0.25 + index * 0.14)],
          [0.055, 0.005, 0.008], 7)
      }
    }
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
  // Joint-transition weights reduce separation between rigid limb segments.
  // Bind transforms remain neutral, preserving the exact original skeleton.
  function jointBlend(part: AthleteBoneName, localY: number): [AthleteBoneName | null, number] {
    const width = 0.145
    if (part === 'upperArmL' || part === 'upperArmR') {
      const next = part === 'upperArmL' ? 'lowerArmL' : 'lowerArmR'
      const influence = THREE.MathUtils.clamp((-localY - (body.upperArmLength - width)) / width, 0, 1) * 0.52
      return [next, influence]
    }
    if (part === 'lowerArmL' || part === 'lowerArmR') {
      const parent = part === 'lowerArmL' ? 'upperArmL' : 'upperArmR'
      return [parent, THREE.MathUtils.clamp((localY + width) / width, 0, 1) * 0.52]
    }
    if (part === 'thighL' || part === 'thighR') {
      const next = part === 'thighL' ? 'shinL' : 'shinR'
      return [next, THREE.MathUtils.clamp((-localY - (body.upperLegLength - width)) / width, 0, 1) * 0.52]
    }
    if (part === 'shinL' || part === 'shinR') {
      const parent = part === 'shinL' ? 'thighL' : 'thighR'
      return [parent, THREE.MathUtils.clamp((localY + width) / width, 0, 1) * 0.52]
    }
    return [null, 0]
  }

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
        : segment.kind === 'taper'
          ? new THREE.CylinderGeometry(1, 0.75, 1, Math.max(9, segment.segments ?? detail), 3)
          : new THREE.SphereGeometry(1, segment.segments ?? detail, Math.max(6, Math.floor((segment.segments ?? detail) * 0.77)))
      if (segment.kind === 'back-number') piece.rotateY(Math.PI)
      if (segment.kind !== 'front-number' && segment.kind !== 'back-number') piece.scale(...segment.radii)
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
        const [secondary, blend] = jointBlend(segment.bone, p.getY(i) - joint.y)
        const secondaryIndex = secondary ? boneList.indexOf(bones[secondary]) : 0
        boneIndices.push(boneIndex, secondaryIndex, 0, 0)
        weights.push(1 - blend, blend, 0, 0)
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
    new THREE.MeshStandardMaterial({ color: '#633d36', roughness: 0.82 }), // lips
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
