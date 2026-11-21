/**
 * EFU Phase 3 - frame-rate-independent pose intent for the original 13-bone rig.
 * Visual-only: never mutates ball physics, match state or input controls.
 */
export interface AthleteMotionInput {
  speed: number
  gaitPhase: number
  strideLength: number
  lean: number
  braking: number
  slip: number
  plantBias: number
  kick: number
  tackle: number
  jump: number
  goalkeeperDive: number
  stumble: number
  fatigue: number
  armSwing: number
  preferredFoot: 'left' | 'right'
  celebrating: boolean
}

export interface AthletePose {
  torsoPitch: number
  torsoRoll: number
  headPitch: number
  headYawLimit: number
  leftThigh: number
  rightThigh: number
  leftShin: number
  rightShin: number
  leftFoot: number
  rightFoot: number
  leftArm: number
  rightArm: number
  leftArmSpread: number
  rightArmSpread: number
  leftElbow: number
  rightElbow: number
}

/** Sanitizes raw game values so a temporary invalid velocity cannot yield NaN transforms. */
function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}
function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value))
}

/** Exponential response is equivalent at 30, 60, and 120 FPS for the same elapsed time. */
export function responseAlpha(rate: number, delta: number) {
  return 1 - Math.exp(-Math.max(0, finite(rate)) * clamp(finite(delta), 0, 0.12))
}

/**
 * The grounded leg gets less swing while the airborne leg flexes.
 * This is an animation approximation; exact foot IK requires terrain and ball contact data.
 */
export function sampleAthletePose(input: AthleteMotionInput): AthletePose {
  const speed = clamp(finite(input.speed), 0, 13)
  const gait = finite(input.gaitPhase)
  const sprint = clamp(speed / 8, 0, 1)
  const moving = clamp((speed - 0.10) / 0.75, 0, 1)
  const swingL = Math.sin(gait)
  const swingR = Math.sin(gait + Math.PI)
  const stride = clamp(finite(input.strideLength, 1) / 1.25, 0.65, 1.5)
  const gaitAmount = moving * (0.28 + sprint * 0.43) * stride
  const plantBias = clamp(finite(input.plantBias, 0.5), 0.35, 0.9)
  const isGroundedL = Math.cos(gait) < plantBias
  const isGroundedR = Math.cos(gait + Math.PI) < plantBias
  const jump = clamp(finite(input.jump), 0, 1)
  const kick = clamp(finite(input.kick), 0, 1.5)
  const tackle = clamp(finite(input.tackle), 0, 1)
  const dive = clamp(finite(input.goalkeeperDive), 0, 1)
  const leftKick = input.preferredFoot === 'left' ? kick : 0
  const rightKick = input.preferredFoot === 'right' ? kick : 0
  const braking = clamp(finite(input.braking), 0, 1)
  const stumble = clamp(finite(input.stumble), 0, 1)
  const fatigued = clamp(finite(input.fatigue), 0, 1)
  const armAmount = Math.min(0.65, speed * 0.075) * clamp(finite(input.armSwing, 1), 0.4, 1.5)
  const swingFactorL = isGroundedL ? 0.79 : 1.09
  const swingFactorR = isGroundedR ? 0.79 : 1.09
  const leftThigh = swingL * gaitAmount * swingFactorL + leftKick * 1.14 + jump * 0.31 - tackle * 0.22
  const rightThigh = swingR * gaitAmount * swingFactorR + rightKick * 1.14 + jump * 0.31 - tackle * 0.22
  const leftShin = Math.max(0, -swingL) * gaitAmount * 0.8 - leftKick * 0.48 + jump * 0.17
  const rightShin = Math.max(0, -swingR) * gaitAmount * 0.8 - rightKick * 0.48 + jump * 0.17
  const celebrating = input.celebrating
  return {
    torsoPitch: clamp(finite(input.lean) + fatigued * 0.06 - braking * 0.07 - dive * 0.28, -0.45, 0.45),
    torsoRoll: clamp(swingL * gaitAmount * 0.07 - finite(input.slip) * 0.17 + stumble * 0.22, -0.4, 0.4),
    headPitch: sprint > 0.5 ? -0.045 : 0.025,
    headYawLimit: 0.47,
    leftThigh, rightThigh, leftShin, rightShin,
    leftFoot: isGroundedL ? -leftThigh * 0.15 : -leftShin * 0.35 - 0.10,
    rightFoot: isGroundedR ? -rightThigh * 0.15 : -rightShin * 0.35 - 0.10,
    leftArm: celebrating ? -2.1 : -swingL * armAmount - dive * 1.25,
    rightArm: celebrating ? -2.1 : -swingR * armAmount - dive * 1.25,
    leftArmSpread: -0.14 - dive * 0.4,
    rightArmSpread: 0.14 + dive * 0.4,
    leftElbow: 0.11 + Math.abs(swingL) * moving * 0.35,
    rightElbow: 0.11 + Math.abs(swingR) * moving * 0.35,
  }
}
