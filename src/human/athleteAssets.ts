import type { PlayerProfile } from './types'

/**
 * Phase 1 asset contract for upcoming professionally rigged characters.
 * No licensed or photorealistic glTF files are bundled in this changeset.
 *
 * Each supplied rig must be cleared for use, pass geometric budget checks,
 * include LODs, and have animation retargeting verified before enabling it.
 */
export interface AthleteAssetSpec {
  id: string
  glb: string
  author: string
  rights: string
  rig: 'efu-humanoid-v1'
  animations: readonly string[]
  textureSize: 512 | 1024 | 2048
  triangleBudget: number
}

export const REQUIRED_ATHLETE_CLIPS = [
  'idle', 'jog', 'sprint', 'plant', 'pass', 'shoot', 'tackle',
  'jump', 'keeper-dive', 'celebrate',
] as const

/** Intentionally empty until actual original / licensed, rigged assets exist. */
export const APPROVED_ATHLETE_ASSETS: Readonly<Record<string, AthleteAssetSpec>> = {}

export function athleteArchetype(profile: PlayerProfile) {
  if (profile.role === 'goalkeeper') return 'keeper'
  if (profile.role === 'centre-back') return 'power'
  if (profile.role === 'winger' || profile.role === 'fullback') return 'agile'
  if (profile.role === 'striker') return 'forward'
  return 'balanced'
}

/** Used to select compatible assets once they have been approved. */
export function approvedAthleteAsset(profile: PlayerProfile): AthleteAssetSpec | null {
  const key = athleteArchetype(profile)
  return APPROVED_ATHLETE_ASSETS[key] ?? null
}
