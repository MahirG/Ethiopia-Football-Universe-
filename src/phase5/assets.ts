import { EXTERNAL_ASSET_SLOTS } from './catalog'
import type { AssetPipelineReport, AssetTier, ExternalAssetSlot } from './types'

const TIER_LODS: Record<AssetTier, ExternalAssetSlot['lod'][]> = {
  procedural: [],
  'production-ready': ['gameplay', 'broadcast'],
  cinematic: ['gameplay', 'broadcast', 'cinematic'],
}

export function requiredAssetSlots(tier: AssetTier) {
  const lods = TIER_LODS[tier]
  if (!lods.length) return []
  return EXTERNAL_ASSET_SLOTS.filter((slot) => lods.includes(slot.lod))
}

export function buildAssetPipelineReport(
  tier: AssetTier,
  availablePaths: Iterable<string> = [],
): AssetPipelineReport {
  const available = new Set(availablePaths)
  const required = requiredAssetSlots(tier)
  if (!required.length) {
    return {
      requestedTier: tier,
      readySlots: 0,
      totalSlots: 0,
      readiness: 1,
      missing: [],
      unlicensed: [],
      fallbacks: ['procedural-human-player', 'procedural-biomechanics', 'procedural-kit-material', 'procedural-stadium-material', 'procedural-ball-material'],
    }
  }

  const ready = required.filter((slot) => available.has(slot.path) && slot.licensed)
  const missing = required.filter((slot) => !available.has(slot.path)).map((slot) => slot.id)
  const unlicensed = required.filter((slot) => available.has(slot.path) && !slot.licensed).map((slot) => slot.id)
  const fallbacks = [...new Set(required.filter((slot) => !ready.includes(slot)).map((slot) => slot.fallback))]

  return {
    requestedTier: tier,
    readySlots: ready.length,
    totalSlots: required.length,
    readiness: required.length ? ready.length / required.length : 1,
    missing,
    unlicensed,
    fallbacks,
  }
}

export function assetTierLabel(tier: AssetTier, report: AssetPipelineReport) {
  if (tier === 'procedural') return 'Original procedural runtime'
  if (report.readiness >= 1) return tier === 'cinematic' ? 'Cinematic assets ready' : 'Production assets ready'
  return `${tier === 'cinematic' ? 'Cinematic' : 'Production'} pipeline · ${report.readySlots}/${report.totalSlots} licensed slots ready`
}

export function validateExternalAssetSlot(slot: ExternalAssetSlot) {
  const errors: string[] = []
  if (!slot.path.startsWith('/assets/')) errors.push(`${slot.id}: path must live below /assets/`)
  if (slot.maxBytes <= 0) errors.push(`${slot.id}: maxBytes must be positive`)
  if (slot.licensed && !slot.path) errors.push(`${slot.id}: licensed asset must have a path`)
  if (slot.kind === 'player-model' && (!slot.requiredBones || slot.requiredBones.length < 6)) errors.push(`${slot.id}: player models require a football skeleton contract`)
  if (slot.kind === 'mocap' && (!slot.requiredAnimations || slot.requiredAnimations.length < 4)) errors.push(`${slot.id}: mocap packs require mapped football clips`)
  return errors
}
