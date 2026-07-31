import * as THREE from 'three'
import type { HumanTelemetry, PlayerProfile, PlayerRuntimeState } from './types'

export interface HumanValidationSample {
  sprintAcceleration: number
  maximumSpeed: number
  turnRadius: number
  strideFrequency: number
  jumpHeight: number
  firstTouchDistance: number
  goalkeeperReactionMs: number
  footSliding: number
  ballContactError: number
}

export interface ValidationFinding {
  metric: keyof HumanValidationSample
  value: number
  min: number
  max: number
  passed: boolean
}

export const PROFESSIONAL_TARGETS: Record<keyof HumanValidationSample, [number, number]> = {
  sprintAcceleration: [4.5, 8.5],
  maximumSpeed: [7.2, 10.7],
  turnRadius: [0.55, 4.8],
  strideFrequency: [2.4, 4.8],
  jumpHeight: [0.28, 0.82],
  firstTouchDistance: [0.08, 2.8],
  goalkeeperReactionMs: [110, 420],
  footSliding: [0, 0.18],
  ballContactError: [0, 0.26],
}

export function validateSample(sample: HumanValidationSample): ValidationFinding[] {
  return (Object.keys(PROFESSIONAL_TARGETS) as Array<keyof HumanValidationSample>).map((metric) => {
    const [min, max] = PROFESSIONAL_TARGETS[metric]
    const value = sample[metric]
    return { metric, value, min, max, passed: value >= min && value <= max }
  })
}

export function estimateTurnRadius(runtime: PlayerRuntimeState, previousVelocity: THREE.Vector3, delta: number) {
  const speed = runtime.velocity.length()
  if (speed < 0.1) return 0.55
  const previousAngle = Math.atan2(previousVelocity.z, previousVelocity.x)
  const currentAngle = Math.atan2(runtime.velocity.z, runtime.velocity.x)
  const angularVelocity = Math.abs(Math.atan2(Math.sin(currentAngle - previousAngle), Math.cos(currentAngle - previousAngle))) / Math.max(delta, 0.001)
  return angularVelocity < 0.01 ? 4.8 : THREE.MathUtils.clamp(speed / angularVelocity, 0.55, 12)
}

export function profilePlausibility(profile: PlayerProfile) {
  const findings: string[] = []
  if (profile.body.height < 1.58 || profile.body.height > 2.08) findings.push('height-out-of-range')
  if (profile.body.mass < 55 || profile.body.mass > 108) findings.push('mass-out-of-range')
  if (profile.body.upperLegLength + profile.body.lowerLegLength < profile.body.height * 0.42) findings.push('leg-ratio-too-short')
  if (profile.body.shoulderWidth <= profile.body.hipWidth * 0.85) findings.push('shoulder-hip-ratio')
  if (profile.body.age < 16 || profile.body.age > 43) findings.push('age-out-of-range')
  return findings
}

export function telemetryHealth(telemetry: HumanTelemetry) {
  return {
    fatiguePlausible: telemetry.averageFatigue >= 0 && telemetry.averageFatigue <= 1,
    pressurePlausible: telemetry.averagePressure >= 0 && telemetry.averagePressure <= 1,
    speedPlausible: telemetry.maxPlayerSpeed <= 11.2,
    goalkeeperPlausible: telemetry.goalkeeperReactionMs === 0 || (telemetry.goalkeeperReactionMs >= 100 && telemetry.goalkeeperReactionMs <= 450),
    mistakeRatePlausible: telemetry.mistakes <= Math.max(12, telemetry.ballContacts * 0.45),
  }
}
