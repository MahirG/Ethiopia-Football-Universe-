import * as THREE from 'three'
import type { BallContactRequest, BallContactResult } from './types'
import { defaultTechnique, TECHNIQUES } from './techniques'

function noise(seed: number, salt: number) {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function rotatePlanar(vector: THREE.Vector3, radians: number) {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return new THREE.Vector3(vector.x * cos - vector.z * sin, vector.y, vector.x * sin + vector.z * cos)
}

export function calculateBallContact(request: BallContactRequest): BallContactResult {
  const { action, player, runtime, ballPosition, ballVelocity, target, pressure, weather, weatherIntensity, contactSide, seed } = request
  const technique = TECHNIQUES[request.technique ?? defaultTechnique(action, ballPosition.y, runtime.velocity.length() > 6.5)]
  const ability = action === 'shoot'
    ? player.ability.shooting
    : action === 'pass' || action === 'clear'
      ? player.ability.passing
      : action === 'tackle' || action === 'intercept'
        ? player.ability.tackling
        : action === 'goalkeeper-claim'
          ? player.ability.goalkeeper
          : player.ability.dribbling
  const footPenalty = contactSide === player.preferredFoot ? 1 : THREE.MathUtils.lerp(0.58, 0.92, player.ability.weakFoot)
  const balance = THREE.MathUtils.clamp(runtime.physical.balance * (1 - runtime.physical.injurySeverity * 0.28), 0.2, 1)
  const fatigue = runtime.physical.fatigue
  const confidence = runtime.emotion.confidence
  const composure = player.personality.composure
  const incomingDifficulty = THREE.MathUtils.clamp(ballVelocity.length() / 24, 0, 0.65)
  const weatherDifficulty = weather === 'rain' ? weatherIntensity * 0.18 : weather === 'wind' ? weatherIntensity * 0.08 : 0
  const contextualQuality = ability * footPenalty * (0.72 + balance * 0.28) * (1 - pressure * 0.27) * (1 - fatigue * 0.2) * (0.82 + confidence * 0.18)
  const quality = THREE.MathUtils.clamp(contextualQuality - incomingDifficulty * 0.16 - weatherDifficulty, 0.18, 0.98)

  const baseError = THREE.MathUtils.lerp(0.22, 0.012, quality)
  const emotionalError = runtime.emotion.frustration * 0.055 + runtime.emotion.pressure * (1 - composure) * 0.08
  const randomSign = noise(seed, 1) > 0.5 ? 1 : -1
  const errorRadians = (baseError + emotionalError) * technique.error * randomSign * THREE.MathUtils.lerp(0.35, 1, noise(seed, 2))

  const desired = target.clone().sub(ballPosition)
  desired.y = technique.lift > 0 ? technique.lift : action === 'shoot' ? THREE.MathUtils.clamp(desired.length() * 0.025, 0.12, 0.5) : action === 'clear' ? 0.38 : action === 'dribble' ? 0.02 : 0.08
  if (desired.lengthSq() < 0.0001) desired.set(Math.cos(runtime.facing), 0.05, Math.sin(runtime.facing))
  desired.normalize()
  const direction = rotatePlanar(desired, errorRadians)

  const actionPower = action === 'shoot'
    ? THREE.MathUtils.lerp(6.8, 10.6, player.ability.shooting)
    : action === 'clear'
      ? THREE.MathUtils.lerp(6.2, 9.2, player.ability.strength)
      : action === 'pass'
        ? THREE.MathUtils.lerp(3.7, 6.3, player.ability.passing)
        : action === 'goalkeeper-claim'
          ? 7.4
          : action === 'tackle' || action === 'intercept'
            ? THREE.MathUtils.lerp(2.8, 5.4, player.ability.tackling)
            : THREE.MathUtils.lerp(0.8, 1.8, player.ability.dribbling)
  const fatiguePower = 1 - fatigue * (action === 'shoot' || action === 'clear' ? 0.18 : 0.1)
  const momentumTransfer = runtime.velocity.dot(direction) * player.body.mass * 0.0032
  const power = Math.max(0.35, (actionPower * fatiguePower + momentumTransfer) * technique.power)
  const impulse = direction.multiplyScalar(power)
  if (action === 'dribble') impulse.y = 0.02

  const sideSpin = (contactSide === 'left' ? -1 : 1) * THREE.MathUtils.lerp(0.08, 0.42, player.ability.dribbling) * (action === 'shoot' ? 1.25 : 0.65) * technique.spin
  const topSpin = action === 'shoot' ? -THREE.MathUtils.lerp(0.05, 0.24, player.ability.shooting) : -0.04
  const torque = new THREE.Vector3(-impulse.z * 0.022, sideSpin + errorRadians * 0.8, impulse.x * 0.022 + topSpin)

  const footSide = contactSide === 'left' ? -1 : 1
  const forward = new THREE.Vector3(Math.cos(runtime.facing), 0, Math.sin(runtime.facing))
  const right = new THREE.Vector3(-forward.z, 0, forward.x)
  const contactPoint = runtime.position.clone()
  if (technique.preferredContact === 'head') {
    contactPoint.add(new THREE.Vector3(0, player.body.height * 0.46, 0)).add(forward.multiplyScalar(0.18))
  } else if (technique.preferredContact === 'glove') {
    contactPoint.add(new THREE.Vector3(0, player.body.height * 0.2, 0)).add(forward.multiplyScalar(0.42))
  } else {
    contactPoint.add(forward.multiplyScalar(player.body.footLength * 0.95)).add(right.multiplyScalar(footSide * player.body.hipWidth * 0.42))
    contactPoint.y = 0.1
  }

  const miscontrolThreshold = action === 'dribble' ? 0.58 : 0.3
  const heavyTouch = quality < miscontrolThreshold || noise(seed, 3) > 0.96 - pressure * 0.12 - fatigue * 0.08
  if (heavyTouch && action === 'dribble') impulse.multiplyScalar(THREE.MathUtils.lerp(1.35, 2.2, noise(seed, 4)))

  return {
    impulse,
    torque,
    quality,
    errorRadians,
    contactPoint,
    soundForce: THREE.MathUtils.clamp(power / 10.5, 0.1, 1),
    heavyTouch,
  }
}

export function estimateFirstTouchQuality(
  player: BallContactRequest['player'],
  runtime: BallContactRequest['runtime'],
  incomingSpeed: number,
  incomingHeight: number,
  pressure: number,
  weatherDifficulty: number,
) {
  const technique = player.ability.firstTouch * 0.52 + player.ability.balance * 0.16 + player.ability.vision * 0.12
  const context = runtime.emotion.focus * 0.1 + runtime.emotion.confidence * 0.1
  return THREE.MathUtils.clamp(
    technique + context - incomingSpeed / 38 - incomingHeight * 0.08 - pressure * 0.18 - runtime.physical.fatigue * 0.14 - weatherDifficulty,
    0.12,
    0.98,
  )
}
