import type { QualityLevel } from '../game/types'

/** The rendering tier is visual-only; physics and AI must remain unchanged. */
export type AthleteLod = 'hero' | 'field' | 'distance'

export interface AthleteLodBudget {
  /** Detailed animated face, hair, limbs and kit. */
  heroDistance: number
  /** Articulated, lower-polygon silhouette visible from broadcast cameras. */
  fieldDistance: number
  /** Prevents thrashing when the broadcast camera oscillates near a threshold. */
  hysteresis: number
  /** Distance at which close-up features are worth rendering. */
  faceDistance: number
  /** Limits expensive face animation updates on lower-end devices. */
  faceUpdateFrames: number
}

export const ATHLETE_LOD_BUDGETS: Record<QualityLevel, AthleteLodBudget> = {
  performance: { heroDistance: 16, fieldDistance: 54, hysteresis: 3, faceDistance: 9, faceUpdateFrames: 4 },
  balanced: { heroDistance: 32, fieldDistance: 93, hysteresis: 5, faceDistance: 18, faceUpdateFrames: 2 },
  ultra: { heroDistance: 62, fieldDistance: 144, hysteresis: 7, faceDistance: 33, faceUpdateFrames: 1 },
}

/** Pure selection; callers retain the last tier to enable hysteresis. */
export function selectAthleteLod(
  distance: number,
  quality: QualityLevel,
  selected: boolean,
  previous: AthleteLod = 'distance',
): AthleteLod {
  if (selected) return 'hero'
  if (!Number.isFinite(distance) || distance < 0) return 'distance'
  const { heroDistance, fieldDistance, hysteresis } = ATHLETE_LOD_BUDGETS[quality]
  const enterHero = previous === 'hero' ? heroDistance + hysteresis : heroDistance - hysteresis
  if (distance <= enterHero) return 'hero'
  const enterField = previous === 'distance' ? fieldDistance - hysteresis : fieldDistance + hysteresis
  return distance <= enterField ? 'field' : 'distance'
}
