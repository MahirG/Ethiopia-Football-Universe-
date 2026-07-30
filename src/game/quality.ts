import type { QualityLevel } from './types'

export interface QualityPreset {
  dpr: [number, number]
  grassBlades: number
  crowdPerLongStand: number
  crowdPerShortStand: number
  shadowMapSize: number
  rainDrops: number
  surfaceMarks: number
  antialias: boolean
  softShadows: boolean
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  performance: {
    dpr: [0.75, 1.1],
    grassBlades: 0,
    crowdPerLongStand: 260,
    crowdPerShortStand: 150,
    shadowMapSize: 1024,
    rainDrops: 650,
    surfaceMarks: 18,
    antialias: false,
    softShadows: false,
  },
  balanced: {
    dpr: [1, 1.55],
    grassBlades: 4200,
    crowdPerLongStand: 560,
    crowdPerShortStand: 310,
    shadowMapSize: 1536,
    rainDrops: 1250,
    surfaceMarks: 32,
    antialias: true,
    softShadows: false,
  },
  ultra: {
    dpr: [1, 2],
    grassBlades: 8200,
    crowdPerLongStand: 860,
    crowdPerShortStand: 480,
    shadowMapSize: 2048,
    rainDrops: 2200,
    surfaceMarks: 48,
    antialias: true,
    softShadows: true,
  },
}
