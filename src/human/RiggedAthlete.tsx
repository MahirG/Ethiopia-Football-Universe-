import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import type { PresentationPhase, QualityLevel, TeamSide } from '../game/types'
import type { PlayerProfile, PlayerRuntimeState, VisualMotionState } from './types'
import { createRiggedAthlete } from './riggedAthleteFactory'
import { responseAlpha, sampleAthletePose } from './athleteMotion'

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
    const queue = cleanupQueue.current
    const pending = queue.get(rig)
    if (pending) {
      pending.cancelled = true
      queue.delete(rig)
    }
    return () => {
      const disposal = { cancelled: false }
      queue.set(rig, disposal)
      queueMicrotask(() => {
        if (disposal.cancelled) return
        rig.dispose()
        queue.delete(rig)
      })
    }
  }, [rig])

  useFrame((_, delta) => {
    // Only pose the actual visible field-tier skinned mesh.
    if (!rig.mesh.parent?.visible) return
    const { bones } = rig
    const visual = motion.current
    const speed = runtime.velocity.length()
    const celebrating = celebrationTeam === profile.team && presentationPhase !== 'idle'
    const pose = sampleAthletePose({
      speed,
      gaitPhase: visual.gaitPhase,
      strideLength: visual.strideLength,
      lean: visual.lean,
      braking: visual.braking,
      slip: visual.slip,
      plantBias: visual.plantBias,
      kick: visual.kick,
      tackle: visual.tackle,
      jump: visual.jump,
      goalkeeperDive: visual.goalkeeperDive,
      stumble: visual.stumble,
      fatigue: runtime.physical.fatigue,
      armSwing: profile.movement.armSwing,
      preferredFoot: profile.preferredFoot,
      celebrating,
    })
    const smooth = (current: number, target: number, rate: number) =>
      THREE.MathUtils.lerp(current, target, responseAlpha(rate, delta))

    // The spine and limbs blend instead of snapping across idle, jog, sprint,
    // kicking, keeper dives and celebrations. Existing physics remains authoritative.
    bones.spine.rotation.x = smooth(bones.spine.rotation.x, pose.torsoPitch, 8)
    bones.spine.rotation.z = smooth(bones.spine.rotation.z, pose.torsoRoll, 9)
    bones.head.rotation.x = smooth(bones.head.rotation.x, pose.headPitch, 5)
    const heading = Math.atan2(runtime.scanTarget.z - runtime.position.z, runtime.scanTarget.x - runtime.position.x)
    const offset = Math.atan2(Math.sin(heading - runtime.facing), Math.cos(heading - runtime.facing))
    bones.head.rotation.y = smooth(
      bones.head.rotation.y, THREE.MathUtils.clamp(offset, -pose.headYawLimit, pose.headYawLimit), 5,
    )
    bones.thighL.rotation.x = smooth(bones.thighL.rotation.x, pose.leftThigh, 13)
    bones.thighR.rotation.x = smooth(bones.thighR.rotation.x, pose.rightThigh, 13)
    bones.shinL.rotation.x = smooth(bones.shinL.rotation.x, pose.leftShin, 15)
    bones.shinR.rotation.x = smooth(bones.shinR.rotation.x, pose.rightShin, 15)
    bones.footL.rotation.x = smooth(bones.footL.rotation.x, pose.leftFoot, 17)
    bones.footR.rotation.x = smooth(bones.footR.rotation.x, pose.rightFoot, 17)
    bones.upperArmL.rotation.x = smooth(bones.upperArmL.rotation.x, pose.leftArm, 10)
    bones.upperArmR.rotation.x = smooth(bones.upperArmR.rotation.x, pose.rightArm, 10)
    bones.upperArmL.rotation.z = smooth(bones.upperArmL.rotation.z, pose.leftArmSpread, 8)
    bones.upperArmR.rotation.z = smooth(bones.upperArmR.rotation.z, pose.rightArmSpread, 8)
    bones.lowerArmL.rotation.x = smooth(bones.lowerArmL.rotation.x, pose.leftElbow, 12)
    bones.lowerArmR.rotation.x = smooth(bones.lowerArmR.rotation.x, pose.rightElbow, 12)
  })

  return <primitive object={rig.mesh} dispose={null} />
}
