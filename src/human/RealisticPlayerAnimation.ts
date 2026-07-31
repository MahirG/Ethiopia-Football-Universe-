import { useFrame } from '@react-three/fiber'
import { useRef, type MutableRefObject, type RefObject } from 'react'
import * as THREE from 'three'
import { footPlantOffset } from './biomechanics'
import type { PlayerProfile, PlayerRuntimeState, VisualMotionState } from './types'
import type { PresentationPhase, QualityLevel, TeamSide } from '../game/types'

export interface PlayerAnimationRefs {
  root: RefObject<THREE.Group | null>
  highLod: RefObject<THREE.Group | null>
  lowLod: RefObject<THREE.Group | null>
  torso: RefObject<THREE.Group | null>
  pelvis: RefObject<THREE.Group | null>
  head: RefObject<THREE.Group | null>
  eyes: RefObject<THREE.Group | null>
  leftLid: RefObject<THREE.Mesh | null>
  rightLid: RefObject<THREE.Mesh | null>
  mouth: RefObject<THREE.Mesh | null>
  hair: RefObject<THREE.Group | null>
  faceDetail: RefObject<THREE.Group | null>
  hairDetail: RefObject<THREE.Group | null>
  leftArm: RefObject<THREE.Group | null>
  rightArm: RefObject<THREE.Group | null>
  leftForearm: RefObject<THREE.Group | null>
  rightForearm: RefObject<THREE.Group | null>
  leftLeg: RefObject<THREE.Group | null>
  rightLeg: RefObject<THREE.Group | null>
  leftCalf: RefObject<THREE.Group | null>
  rightCalf: RefObject<THREE.Group | null>
  leftFoot: RefObject<THREE.Group | null>
  rightFoot: RefObject<THREE.Group | null>
  leftHandDetail: RefObject<THREE.Group | null>
  rightHandDetail: RefObject<THREE.Group | null>
  leftBootDetail: RefObject<THREE.Group | null>
  rightBootDetail: RefObject<THREE.Group | null>
  jerseyFront: RefObject<THREE.Mesh | null>
  jerseyBack: RefObject<THREE.Mesh | null>
}

interface Options {
  profile: PlayerProfile
  runtime: PlayerRuntimeState
  motion: MutableRefObject<VisualMotionState>
  quality: QualityLevel
  controlled: boolean
  presentationPhase: PresentationPhase
  celebrationTeam: TeamSide | null
  camera: THREE.Camera
  refs: PlayerAnimationRefs
  skinMaterials: MutableRefObject<THREE.MeshPhysicalMaterial[]>
  kitMaterials: MutableRefObject<THREE.MeshPhysicalMaterial[]>
}

export function useRealisticPlayerAnimation(options: Options) {
  const { profile, runtime, motion, quality, controlled, presentationPhase, celebrationTeam, camera, refs, skinMaterials, kitMaterials } = options
  const blinkTimer = useRef(1.5 + profile.number * 0.07)
  const blinkPhase = useRef(0)
  const lastScan = useRef(0)
  const scanTarget = useRef(new THREE.Vector3())
  const worldPosition = useRef(new THREE.Vector3())

  useFrame((state, delta) => {
    const root = refs.root.current
    if (!root) return
    const visual = motion.current
    const speed = runtime.velocity.length()
    visual.gaitPhase += visual.gaitRate * delta
    root.rotation.y = -runtime.facing + Math.PI / 2
    root.rotation.z = THREE.MathUtils.damp(root.rotation.z, -visual.slip * 0.22 + visual.stumble * 0.3, 6, delta)
    root.position.y = Math.abs(Math.sin(visual.gaitPhase * 2)) * Math.min(0.034, speed * 0.004) - visual.goalkeeperDive * 0.24 + visual.jump * 0.25

    const leftPlant = footPlantOffset(visual.gaitPhase, -1, visual.strideLength, speed, visual.plantBias)
    const rightPlant = footPlantOffset(visual.gaitPhase, 1, visual.strideLength, speed, visual.plantBias)
    const leftSwing = THREE.MathUtils.clamp(leftPlant.forward / Math.max(0.4, visual.strideLength * 0.34), -1, 1)
    const rightSwing = THREE.MathUtils.clamp(rightPlant.forward / Math.max(0.4, visual.strideLength * 0.34), -1, 1)

    if (refs.pelvis.current) refs.pelvis.current.rotation.y = Math.sin(visual.gaitPhase) * Math.min(0.18, speed * 0.018)
    if (refs.torso.current) {
      refs.torso.current.rotation.x = visual.lean + runtime.physical.fatigue * 0.08
      refs.torso.current.rotation.y = -Math.sin(visual.gaitPhase) * Math.min(0.15, speed * 0.015)
      refs.torso.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * (2.2 + runtime.physical.breathing * 2.8)) * (0.008 + runtime.physical.breathing * 0.018)
    }
    if (refs.leftLeg.current) refs.leftLeg.current.rotation.x = leftSwing * 0.78 + (profile.preferredFoot === 'left' ? visual.kick * 1.15 : 0)
    if (refs.rightLeg.current) refs.rightLeg.current.rotation.x = rightSwing * 0.78 + (profile.preferredFoot === 'right' ? visual.kick * 1.15 : 0)
    if (refs.leftCalf.current) refs.leftCalf.current.rotation.x = Math.max(0, -leftSwing) * 0.84 - (profile.preferredFoot === 'left' ? visual.kick * 0.65 : 0)
    if (refs.rightCalf.current) refs.rightCalf.current.rotation.x = Math.max(0, -rightSwing) * 0.84 - (profile.preferredFoot === 'right' ? visual.kick * 0.65 : 0)
    if (refs.leftFoot.current) refs.leftFoot.current.rotation.x = leftPlant.grounded ? -leftSwing * 0.12 : -0.18 + leftPlant.height * 0.9
    if (refs.rightFoot.current) refs.rightFoot.current.rotation.x = rightPlant.grounded ? -rightSwing * 0.12 : -0.18 + rightPlant.height * 0.9

    const armSwing = Math.min(0.9, speed * 0.09) * profile.movement.armSwing
    if (refs.leftArm.current) refs.leftArm.current.rotation.x = -Math.sin(visual.gaitPhase) * armSwing - visual.goalkeeperDive
    if (refs.rightArm.current) refs.rightArm.current.rotation.x = Math.sin(visual.gaitPhase) * armSwing - visual.goalkeeperDive
    if (refs.leftForearm.current) refs.leftForearm.current.rotation.x = 0.16 + Math.max(0, Math.sin(visual.gaitPhase)) * 0.34
    if (refs.rightForearm.current) refs.rightForearm.current.rotation.x = 0.16 + Math.max(0, -Math.sin(visual.gaitPhase)) * 0.34
    if (celebrationTeam === runtime.team && presentationPhase !== 'idle') {
      if (refs.leftArm.current) refs.leftArm.current.rotation.x = -2.3
      if (refs.rightArm.current) refs.rightArm.current.rotation.x = profile.movement.celebrationStyle === 3 ? -0.6 : -2.3
    }

    blinkTimer.current -= delta
    if (blinkTimer.current <= 0 && blinkPhase.current === 0) blinkPhase.current = 0.001
    if (blinkPhase.current > 0) {
      blinkPhase.current += delta * 13
      const closure = Math.sin(Math.min(Math.PI, blinkPhase.current))
      if (refs.leftLid.current) refs.leftLid.current.scale.y = 0.18 + closure
      if (refs.rightLid.current) refs.rightLid.current.scale.y = 0.18 + closure
      if (blinkPhase.current >= Math.PI) {
        blinkPhase.current = 0
        blinkTimer.current = THREE.MathUtils.lerp(1.7, 5.4, Math.abs(Math.sin(profile.number * 8.73 + state.clock.elapsedTime)))
      }
    }

    if (state.clock.elapsedTime - lastScan.current > 1.3) {
      lastScan.current = state.clock.elapsedTime
      const side = Math.sin(profile.number + state.clock.elapsedTime) > 0 ? 4 : -4
      scanTarget.current.copy(runtime.position).add(new THREE.Vector3(Math.cos(runtime.facing) * 5, 1.2, Math.sin(runtime.facing) * 5 + side))
      runtime.scanTarget.copy(scanTarget.current)
    }
    if (refs.head.current) {
      const target = Math.atan2(runtime.scanTarget.z - runtime.position.z, runtime.scanTarget.x - runtime.position.x)
      const offset = Math.atan2(Math.sin(target - runtime.facing), Math.cos(target - runtime.facing))
      refs.head.current.rotation.y = THREE.MathUtils.damp(refs.head.current.rotation.y, THREE.MathUtils.clamp(offset, -0.72, 0.72), 6.5, delta)
    }
    if (refs.eyes.current) refs.eyes.current.rotation.y = refs.head.current ? refs.head.current.rotation.y * 0.32 : 0
    if (refs.mouth.current) refs.mouth.current.scale.y = THREE.MathUtils.damp(refs.mouth.current.scale.y, Math.max(0.12, runtime.physical.breathing * 0.55 + runtime.emotion.joy * 0.3), 5, delta)

    const wetness = Math.max(runtime.physical.sweat, runtime.physical.wetness)
    for (const material of skinMaterials.current) {
      material.roughness = THREE.MathUtils.damp(material.roughness, THREE.MathUtils.lerp(0.56, 0.28, wetness), 1.5, delta)
      material.clearcoat = THREE.MathUtils.damp(material.clearcoat, THREE.MathUtils.lerp(0.04, 0.5, wetness), 1.5, delta)
    }
    for (const material of kitMaterials.current) material.roughness = THREE.MathUtils.damp(material.roughness, THREE.MathUtils.lerp(0.68, 0.42, runtime.physical.wetness), 1.2, delta)
    if (refs.hair.current) refs.hair.current.scale.y = THREE.MathUtils.damp(refs.hair.current.scale.y, 1 - runtime.physical.wetness * 0.17, 1.1, delta)
    if (refs.jerseyFront.current) refs.jerseyFront.current.rotation.x = THREE.MathUtils.damp(refs.jerseyFront.current.rotation.x, -speed * 0.005, 5, delta)
    if (refs.jerseyBack.current) refs.jerseyBack.current.rotation.x = THREE.MathUtils.damp(refs.jerseyBack.current.rotation.x, speed * 0.007, 5, delta)

    root.getWorldPosition(worldPosition.current)
    const distance = camera.position.distanceTo(worldPosition.current)
    const highDetail = controlled || distance < (quality === 'ultra' ? 62 : quality === 'balanced' ? 36 : 17)
    if (refs.highLod.current) refs.highLod.current.visible = highDetail
    if (refs.lowLod.current) refs.lowLod.current.visible = !highDetail
    const closeDetail = highDetail && distance < (quality === 'ultra' ? 28 : 17)
    if (refs.faceDetail.current) refs.faceDetail.current.visible = closeDetail
    if (refs.hairDetail.current) refs.hairDetail.current.visible = highDetail && distance < 40
    if (refs.leftHandDetail.current) refs.leftHandDetail.current.visible = closeDetail
    if (refs.rightHandDetail.current) refs.rightHandDetail.current.visible = closeDetail
    if (refs.leftBootDetail.current) refs.leftBootDetail.current.visible = highDetail
    if (refs.rightBootDetail.current) refs.rightBootDetail.current.visible = highDetail

    visual.kick = THREE.MathUtils.damp(visual.kick, 0, 8, delta)
    visual.tackle = THREE.MathUtils.damp(visual.tackle, 0, 7, delta)
    visual.stumble = THREE.MathUtils.damp(visual.stumble, 0, 5, delta)
    visual.goalkeeperDive = THREE.MathUtils.damp(visual.goalkeeperDive, 0, 3.6, delta)
    visual.jump = THREE.MathUtils.damp(visual.jump, 0, 5.4, delta)
  })
}
