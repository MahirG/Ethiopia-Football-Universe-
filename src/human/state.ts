import * as THREE from 'three'
import type { EmotionalState, InjuryKind, PhysicalState, PlayerProfile, Weather } from './types'

export function createEmotionalState(profile: PlayerProfile): EmotionalState {
  return {
    confidence: profile.personality.confidence,
    frustration: 0.08,
    focus: 0.72 + profile.personality.composure * 0.2,
    aggression: profile.personality.aggression * 0.7,
    joy: 0.08,
    pain: 0,
    pressure: 0.2,
    lastMajorEvent: 'kickoff',
  }
}

export function createPhysicalState(): PhysicalState {
  return {
    fatigue: 0,
    shortTermLoad: 0,
    sweat: 0,
    wetness: 0,
    dirt: 0,
    balance: 1,
    traction: 1,
    injury: 'none',
    injurySeverity: 0,
    breathing: 0.08,
    recovery: 1,
  }
}

export function updatePhysicalState(
  state: PhysicalState,
  profile: PlayerProfile,
  speed: number,
  acceleration: number,
  delta: number,
  weather: Weather,
  weatherIntensity: number,
  matchProgress: number,
  altitudeMeters = 2400,
) {
  const speedLoad = THREE.MathUtils.clamp(speed / 9.5, 0, 1)
  const accelLoad = THREE.MathUtils.clamp(acceleration / 8, 0, 1)
  const altitudeLoad = THREE.MathUtils.clamp((altitudeMeters - 1200) / 3200, 0, 0.45)
  const heatLoad = weather === 'clear' ? 0.08 : 0
  const rainCooling = weather === 'rain' ? weatherIntensity * 0.05 : 0
  const conditioning = 0.58 + profile.ability.stamina * 0.62
  const work = (speedLoad * speedLoad * 0.022 + accelLoad * 0.014 + altitudeLoad * 0.008 + heatLoad * 0.006) / conditioning
  const recovery = speedLoad < 0.24 ? (0.013 + profile.ability.stamina * 0.014 + rainCooling) : 0
  state.shortTermLoad = THREE.MathUtils.damp(state.shortTermLoad, Math.max(speedLoad, accelLoad), 2.8, delta)
  state.fatigue = THREE.MathUtils.clamp(state.fatigue + (work - recovery) * delta + matchProgress * 0.00012, 0, 1)
  state.sweat = THREE.MathUtils.clamp(state.sweat + delta * (0.005 + state.shortTermLoad * 0.018 + heatLoad * 0.02), 0, 1)
  state.wetness = THREE.MathUtils.damp(state.wetness, weather === 'rain' ? weatherIntensity : state.sweat * 0.38, 0.8, delta)
  state.dirt = THREE.MathUtils.clamp(state.dirt + delta * (speedLoad > 0.45 ? 0.0008 : 0.00015) * (weather === 'rain' ? 2.2 : 1), 0, 1)
  state.breathing = THREE.MathUtils.damp(state.breathing, THREE.MathUtils.clamp(0.08 + state.shortTermLoad * 0.72 + state.fatigue * 0.42, 0.08, 1), 2.4, delta)
  state.recovery = THREE.MathUtils.clamp(1 - state.fatigue * 0.65 - state.injurySeverity * 0.45, 0.2, 1)
  state.traction = weather === 'rain' ? THREE.MathUtils.lerp(0.88, 0.64, weatherIntensity) : weather === 'wind' ? 0.96 : 1
  state.balance = THREE.MathUtils.damp(state.balance, Math.max(0.22, 1 - state.fatigue * 0.32 - state.injurySeverity * 0.45), 2.6, delta)
}

export function updateEmotion(
  emotion: EmotionalState,
  profile: PlayerProfile,
  delta: number,
  pressure: number,
  winning: boolean,
  losing: boolean,
) {
  emotion.pressure = THREE.MathUtils.damp(emotion.pressure, pressure, 1.4, delta)
  const control = profile.personality.emotionalControl
  emotion.frustration = THREE.MathUtils.clamp(
    emotion.frustration + delta * ((losing ? 0.004 : -0.003) + pressure * (1 - control) * 0.003),
    0,
    1,
  )
  emotion.confidence = THREE.MathUtils.clamp(
    emotion.confidence + delta * ((winning ? 0.002 : losing ? -0.002 : 0) - pressure * 0.0008),
    0.15,
    1,
  )
  emotion.focus = THREE.MathUtils.damp(emotion.focus, THREE.MathUtils.clamp(0.58 + profile.personality.composure * 0.34 - emotion.frustration * 0.2, 0.25, 1), 0.8, delta)
  emotion.aggression = THREE.MathUtils.damp(emotion.aggression, THREE.MathUtils.clamp(profile.personality.aggression * 0.65 + emotion.frustration * 0.3, 0.08, 1), 0.9, delta)
  emotion.joy = Math.max(0, emotion.joy - delta * 0.08)
  emotion.pain = Math.max(0, emotion.pain - delta * 0.035)
}

export function registerMajorEvent(emotion: EmotionalState, event: string, positive: boolean, intensity = 0.5) {
  emotion.lastMajorEvent = event
  if (positive) {
    emotion.confidence = THREE.MathUtils.clamp(emotion.confidence + intensity * 0.18, 0, 1)
    emotion.joy = THREE.MathUtils.clamp(emotion.joy + intensity * 0.8, 0, 1)
    emotion.frustration *= 0.72
  } else {
    emotion.confidence = THREE.MathUtils.clamp(emotion.confidence - intensity * 0.12, 0, 1)
    emotion.frustration = THREE.MathUtils.clamp(emotion.frustration + intensity * 0.28, 0, 1)
  }
}

export function evaluateInjury(
  state: PhysicalState,
  profile: PlayerProfile,
  impactForce: number,
  jointRisk: number,
  seed: number,
): InjuryKind {
  const previous = state.injury === 'none' ? 0 : state.injurySeverity * 0.3
  const vulnerability = state.fatigue * 0.3 + previous + (1 - profile.ability.balance) * 0.12
  const threshold = 0.8 - vulnerability
  const risk = impactForce * 0.58 + jointRisk * 0.42
  const random = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1
  if (risk < threshold || random > THREE.MathUtils.clamp(risk - threshold + 0.14, 0, 0.75)) return 'none'
  const kinds: InjuryKind[] = ['bruise', 'ankle', 'hamstring', 'knee', 'shoulder', 'head']
  const index = Math.min(kinds.length - 1, Math.floor((jointRisk * 0.7 + random * 0.3) * kinds.length))
  state.injury = kinds[index]
  state.injurySeverity = THREE.MathUtils.clamp((risk - threshold) * 0.8 + 0.12, 0.1, 0.85)
  return state.injury
}
