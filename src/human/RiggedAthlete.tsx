import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import type { PresentationPhase, QualityLevel, TeamSide } from '../game/types'
import type { PlayerProfile, PlayerRuntimeState, VisualMotionState } from './types'
import { createRiggedAthlete } from './riggedAthleteFactory'

interface Props {
  profile: PlayerProfile
  runtime: PlayerRuntimeState
  motion: MutableRefObject<VisualMotionState>
  quality: QualityLevel
  jersey: string
  shorts: string
  socks: string
  trim: string
  frontNumber: THREE.Texture | null
  backNumber: THREE.Texture | null
  presentationPhase: PresentationPhase
  celebrationTeam: TeamSide | null
}

/**
 * Real GPU-skinned athlete in the broadcast-distance tier.
 * Existing match physics and player positions remain authoritative.
 */
export function RiggedAthlete({
  profile, runtime, motion, quality, jersey, shorts, socks, trim,
  frontNumber, backNumber, presentationPhase, celebrationTeam,
}: Props) {
  const rig = useMemo(
    () => createRiggedAthlete(profile, { jersey, shorts, socks, trim }, quality, frontNumber, backNumber),
    [profile, quality, jersey, shorts, socks, trim, frontNumber, backNumber],
  )
  // React StrictMode can replay effect cleanup without disposing the mounted
  // scene. Cancel a pending disposal if the exact rig is attached again.
  const cleanupQueue = useRef(new Map<typeof rig, { cancelled: boolean }>())
  useEffect(() => {
    const pending = cleanupQueue.current.get(rig)
    if (pending) {
      pending.cancelled = true
      cleanupQueue.current.delete(rig)
    }
    return () => {
      const disposal = { cancelled: false }
      cleanupQueue.current.set(rig, disposal)
      queueMicrotask(() => {
        if (disposal.cancelled) return
        rig.dispose()
        cleanupQueue.current.delete(rig)
      })
    }
  }, [rig])

  useFrame((_, delta) => {
    // No animation work for a distant/hidden LOD.
    if (!rig.mesh.parent?.visible) return
    const { bones } = rig
    const visual = motion.current
    const speed = runtime.velocity.length()
    const gait = visual.gaitPhase
    const stride = Math.min(1, speed / 5.7)
    const left = Math.sin(gait)
    const right = Math.sin(gait + Math.PI)
    const lift = visual.jump * 0.20
    const kick = visual.kick * 0.95
    const dive = visual.goalkeeperDive

    bones.spine.rotation.x = THREE.MathUtils.damp(
      bones.spine.rotation.x, visual.lean + runtime.physical.fatigue * 0.06, 7, delta,
    )
    bones.spine.rotation.z = THREE.MathUtils.damp(
      bones.spine.rotation.z, Math.sin(gait) * stride * 0.035 - visual.stumble * 0.18, 7, delta,
    )
    bones.head.rotation.x = THREE.MathUtils.damp(bones.head.rotation.x, speed > 4 ? -0.05 : 0, 5, delta)
    const heading = Math.atan2(runtime.scanTarget.z - runtime.position.z, runtime.scanTarget.x - runtime.position.x)
    const offset = Math.atan2(Math.sin(heading - runtime.facing), Math.cos(heading - runtime.facing))
    bones.head.rotation.y = THREE.MathUtils.damp(
      bones.head.rotation.y, THREE.MathUtils.clamp(offset, -0.48, 0.48), 5, delta,
    )

    const leftKick = profile.preferredFoot === 'left' ? kick : 0
    const rightKick = profile.preferredFoot === 'right' ? kick : 0
    bones.thighL.rotation.x = left * stride * 0.54 + leftKick + lift
    bones.thighR.rotation.x = right * stride * 0.54 + rightKick + lift
    bones.shinL.rotation.x = Math.max(0, -left) * stride * 0.62 - leftKick * 0.45
    bones.shinR.rotation.x = Math.max(0, -right) * stride * 0.62 - rightKick * 0.45
    bones.footL.rotation.x = -bones.shinL.rotation.x * 0.28
    bones.footR.rotation.x = -bones.shinR.rotation.x * 0.28

    const armSwing = Math.min(0.5, speed * 0.065) * profile.movement.armSwing
    const celebrates = celebrationTeam === profile.team && presentationPhase !== 'idle'
    const leftArm = celebrates ? -2.0 : -left * armSwing - dive * 1.2
    const rightArm = celebrates ? -2.0 : -right * armSwing - dive * 1.2
    bones.upperArmL.rotation.x = THREE.MathUtils.damp(bones.upperArmL.rotation.x, leftArm, 9, delta)
    bones.upperArmR.rotation.x = THREE.MathUtils.damp(bones.upperArmR.rotation.x, rightArm, 9, delta)
    bones.upperArmL.rotation.z = THREE.MathUtils.damp(bones.upperArmL.rotation.z, -0.13 - dive * 0.36, 8, delta)
    bones.upperArmR.rotation.z = THREE.MathUtils.damp(bones.upperArmR.rotation.z, 0.13 + dive * 0.36, 8, delta)
    bones.lowerArmL.rotation.x = Math.max(0.12, Math.abs(left) * stride * 0.32)
    bones.lowerArmR.rotation.x = Math.max(0.12, Math.abs(right) * stride * 0.32)
  })

  return <primitive object={rig.mesh} dispose={null} />
}
