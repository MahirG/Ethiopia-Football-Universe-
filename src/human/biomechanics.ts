import * as THREE from 'three'
import type { LocomotionInput, LocomotionOutput } from './types'

function shortestAngle(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

export function solveLocomotion(input: LocomotionInput): LocomotionOutput {
  const { desiredVelocity, currentVelocity, profile, physical, weather, weatherIntensity, delta } = input
  const desiredSpeed = desiredVelocity.length()
  const currentSpeed = currentVelocity.length()
  const desiredDirection = desiredSpeed > 0.04 ? Math.atan2(desiredVelocity.z, desiredVelocity.x) : input.facing
  const turnDifference = shortestAngle(input.facing, desiredDirection)
  const fatiguePenalty = 1 - physical.fatigue * 0.22 - physical.injurySeverity * 0.24
  const maxSpeed = (4.1 + profile.ability.sprintSpeed * 5.6) * fatiguePenalty
  const targetSpeed = Math.min(desiredSpeed, maxSpeed)
  const traction = physical.traction * (weather === 'rain' ? THREE.MathUtils.lerp(0.98, 0.82, weatherIntensity) : 1)
  const maxTurnRate = THREE.MathUtils.lerp(2.4, 5.9, profile.ability.agility) * traction * (0.75 + profile.ability.balance * 0.25)
  const speedTurnPenalty = THREE.MathUtils.lerp(1, 0.48, THREE.MathUtils.clamp(currentSpeed / Math.max(0.1, maxSpeed), 0, 1))
  const permittedTurn = maxTurnRate * speedTurnPenalty * delta
  const facing = input.facing + THREE.MathUtils.clamp(turnDifference, -permittedTurn, permittedTurn)

  const braking = desiredSpeed < currentSpeed || Math.abs(turnDifference) > Math.PI * 0.42 ? 1 : 0
  const accelerationRate = THREE.MathUtils.lerp(4.2, 10.2, profile.ability.acceleration) * traction * fatiguePenalty
  const decelerationRate = THREE.MathUtils.lerp(5.4, 11.8, profile.ability.agility) * traction
  const rate = braking ? decelerationRate : accelerationRate
  const nextSpeed = THREE.MathUtils.damp(currentSpeed, targetSpeed, rate, delta)
  const direction = new THREE.Vector3(Math.cos(facing), 0, Math.sin(facing))
  const lateralIntent = desiredSpeed > 0.05 ? desiredVelocity.clone().normalize().sub(direction).multiplyScalar(nextSpeed * 0.35) : new THREE.Vector3()
  const velocity = direction.multiplyScalar(nextSpeed).add(lateralIntent)

  const gripDemand = Math.abs(turnDifference) * (currentSpeed / Math.max(1, maxSpeed))
  const slipThreshold = THREE.MathUtils.lerp(1.2, 2.2, profile.ability.balance) * traction
  const slip = THREE.MathUtils.clamp((gripDemand - slipThreshold) / 1.8, 0, 0.36)
  if (slip > 0) velocity.lerp(currentVelocity, slip * 0.68)

  const strideLength = THREE.MathUtils.clamp(
    (0.72 + profile.body.upperLegLength + profile.body.lowerLegLength) * profile.movement.strideScale * (0.74 + nextSpeed / Math.max(1, maxSpeed) * 0.44),
    0.58,
    1.65,
  )
  const gaitPhaseRate = nextSpeed < 0.3 ? 0 : (nextSpeed / Math.max(0.5, strideLength)) * Math.PI * 2 * profile.movement.cadenceScale
  const lean = THREE.MathUtils.clamp((nextSpeed / maxSpeed) * 0.18 + braking * -0.08, -0.12, 0.22) * profile.movement.torsoLean
  const plantBias = THREE.MathUtils.clamp(0.45 + braking * 0.24 + Math.abs(turnDifference) * 0.14, 0.42, 0.88)

  return { velocity, facing, turnRate: permittedTurn / Math.max(delta, 0.0001), gaitPhaseRate, strideLength, braking, slip, lean, plantBias }
}

export function footPlantOffset(
  phase: number,
  side: -1 | 1,
  strideLength: number,
  speed: number,
  plantBias: number,
) {
  const shifted = phase + (side === 1 ? Math.PI : 0)
  const swing = Math.sin(shifted)
  const grounded = Math.cos(shifted) < plantBias
  const forward = swing * strideLength * 0.34
  const height = grounded ? 0 : Math.max(0, Math.sin(shifted - Math.PI * 0.08)) * THREE.MathUtils.clamp(speed / 8, 0.02, 0.17)
  return { forward, height, grounded }
}

export function correctiveBalanceTorque(relativeVelocity: THREE.Vector3, profileBalance: number, physicalBalance: number) {
  const severity = THREE.MathUtils.clamp(relativeVelocity.length() / 8, 0, 1)
  return new THREE.Vector3(
    -relativeVelocity.z,
    0,
    relativeVelocity.x,
  ).multiplyScalar(severity * (0.22 + profileBalance * 0.28) * physicalBalance)
}
