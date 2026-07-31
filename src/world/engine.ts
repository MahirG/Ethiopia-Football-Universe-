import { getBall, getCompetition, getSurface, getTrophy, getVenue } from './catalog'
import type {
  AttendanceBreakdown,
  CeremonyState,
  CrowdState,
  MatchDayPhase,
  MatchWorldState,
  PitchCondition,
  StaffState,
  WorldMatchContext,
  WorldTelemetry,
} from './types'

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const seeded = (seed: number) => {
  const value = Math.sin(seed * 91.193 + 17.731) * 43758.5453
  return value - Math.floor(value)
}

const importanceWeight = {
  friendly: 0.54,
  regular: 0.75,
  derby: 1.08,
  relegation: 1.03,
  'title-decider': 1.14,
  final: 1.22,
} as const

export function resolveMatchDayPhase(context: WorldMatchContext): MatchDayPhase {
  if (context.presentationPhase === 'intro') return context.matchMinute <= 0 ? 'entrance' : 'tunnel'
  if (context.presentationPhase === 'halftime') return 'halftime'
  if (context.presentationPhase === 'fulltime') return context.selection.ceremonyEnabled && ['final', 'title-decider'].includes(context.selection.importance) ? 'ceremony' : 'fulltime'
  if (context.matchMinute <= 0) return context.selection.exteriorSequence ? 'arrival' : 'warmup'
  if (context.matchMinute > 90) return 'extra-time'
  return 'live'
}

export function calculateAttendance(context: WorldMatchContext): AttendanceBreakdown {
  const competition = getCompetition(context.selection.competitionId)
  const venue = getVenue(context.selection.venueId)
  const importance = importanceWeight[context.selection.importance]
  const weatherPenalty = context.weather === 'rain' ? 0.12 * context.weatherIntensity : context.weather === 'overcast' ? 0.03 : 0
  const accessibility = 0.62 + context.dayTimeAccessibility * 0.18 + venue.accessibility * 0.2
  const form = 0.84 + ((context.homeForm - 0.5) * 0.18)
  const popularity = 0.48 + context.homePopularity * 0.34 + context.awayPopularity * 0.18
  const affordability = clamp(1.08 - context.ticketPriceIndex * 0.23 + context.economicIndex * 0.12, 0.58, 1.1)
  const securityRestriction = clamp(0.98 - Math.max(0, context.rivalry - venue.securityCapacity) * 0.18, 0.72, 1)
  const expectedRatio = clamp(
    competition.crowdMultiplier * importance * accessibility * form * popularity * affordability * securityRestriction - weatherPenalty,
    venue.archetype === 'community-ground' || venue.archetype === 'rural-field' ? 0.16 : 0.22,
    1,
  )
  const override = context.selection.attendanceOverride
  const total = override === null ? Math.round(venue.capacity * expectedRatio) : Math.round(clamp(override, 0, venue.capacity))
  const away = Math.round(total * venue.awayAllocation * (0.75 + context.awayPopularity * 0.35))
  const vip = Math.round(total * venue.vipShare)
  const families = Math.round(total * venue.familyShare)
  const organized = Math.round(total * clamp(0.11 + context.rivalry * 0.08 + competition.prestige * 0.05, 0.08, 0.26))
  const media = Math.round(Math.min(venue.mediaCapacity * 850, 80 + competition.mediaMultiplier * 420 * importance))
  const neutral = Math.max(0, Math.round(total * (context.selection.importance === 'final' ? 0.18 : 0.035)))
  const home = Math.max(0, total - away - neutral - vip)
  const lateArrivals = Math.round(total * clamp(0.018 + (1 - context.dayTimeAccessibility) * 0.045, 0.01, 0.08))
  const earlyLeavers = context.matchMinute < 70
    ? 0
    : Math.round(total * clamp(Math.abs(context.scoreHome - context.scoreAway) * 0.035 + Math.max(0, context.matchMinute - 82) * 0.0022, 0, 0.24))
  return {
    total,
    capacityRatio: venue.capacity === 0 ? 0 : total / venue.capacity,
    home,
    away,
    neutral,
    organized,
    families,
    vip,
    media,
    closedSeats: Math.max(0, venue.capacity - total),
    lateArrivals,
    earlyLeavers,
  }
}

export function calculatePitch(context: WorldMatchContext): PitchCondition {
  const venue = getVenue(context.selection.venueId)
  const surface = getSurface(venue.surfaceId)
  const rain = context.weather === 'rain' ? context.weatherIntensity : 0
  const heat = context.weather === 'clear' && context.timeOfDay === 'afternoon' ? 0.12 : 0
  const maintenance = clamp((context.selection.maintenanceQuality + venue.maintenanceBudget) / 2)
  const recentLoad = clamp(context.recentMatches / 8)
  const wear = clamp(context.selection.surfaceWear + recentLoad * 0.28 + context.slides * 0.0035 + context.matchMinute / 90 * 0.08)
  const moisture = clamp(surface.moisture + rain * (1 - surface.drainage) * 0.74 - heat)
  const waterlogging = clamp(Math.max(0, moisture - 0.62) * surface.waterloggingRisk * 2.2)
  const mud = clamp(surface.mudPotential * moisture * (0.38 + wear * 0.9))
  const hardness = clamp(surface.hardness + heat * 0.32 - moisture * 0.22)
  const grip = clamp(surface.grip * (1 - waterlogging * 0.45 - mud * 0.32) * (0.88 + maintenance * 0.12))
  const rollingResistance = surface.rollingResistance * (1 + mud * 0.32 + surface.grassLengthMm / 220) * (1 - rain * 0.12)
  const bounce = surface.bounce * (0.88 + hardness * 0.2) * (1 - waterlogging * 0.2)
  return {
    moisture,
    hardness,
    grip,
    rollingResistance,
    bounce,
    mud,
    waterlogging,
    lineWear: clamp(wear * (1 - surface.lineDurability) + rain * 0.2),
    divots: clamp(wear * (0.36 + (1 - maintenance) * 0.5)),
    goalmouthWear: clamp(wear * 1.25 + recentLoad * 0.18),
    cornerWear: clamp(wear * 0.72),
    maintenanceQuality: maintenance,
    temperatureC: context.weather === 'rain' ? 16 + (1 - context.weatherIntensity) * 5 : context.timeOfDay === 'night' ? 14 : context.timeOfDay === 'golden' ? 20 : 24,
  }
}

export function calculateCrowd(context: WorldMatchContext, attendance: AttendanceBreakdown): CrowdState {
  const competition = getCompetition(context.selection.competitionId)
  const scoreDifference = context.scoreHome - context.scoreAway
  const late = clamp((context.matchMinute - 65) / 25)
  const closeness = 1 - clamp(Math.abs(scoreDifference) / 4)
  const tension = clamp(0.18 + late * 0.48 * closeness + context.rivalry * 0.18 + competition.prestige * 0.13)
  const homeEnergy = clamp(attendance.capacityRatio * competition.crowdMultiplier * (0.48 + (scoreDifference > 0 ? 0.3 : scoreDifference < 0 ? -0.15 : 0)) + context.eventPulse * 0.24)
  const awayEnergy = clamp((attendance.away / Math.max(1, attendance.total)) * 3.8 + (scoreDifference < 0 ? 0.42 : 0.08) + context.eventPulse * 0.16)
  const mood = clamp(0.5 + scoreDifference * 0.13 + context.homeForm * 0.08 - late * Math.max(0, -scoreDifference) * 0.1)
  const hostility = clamp(context.rivalry * 0.62 + (context.lastEvent?.includes('card') || context.lastEvent?.includes('var') ? 0.22 : 0))
  const anticipation = clamp(tension + (context.lastEvent?.includes('shot') ? 0.25 : 0))
  const leavingRatio = context.matchMinute < 72 ? 0 : clamp(attendance.earlyLeavers / Math.max(1, attendance.total))
  let choreography: CrowdState['choreography'] = 'none'
  if (context.selection.crowdChoreography && context.presentationPhase === 'intro') {
    choreography = context.selection.importance === 'final'
      ? 'championship'
      : context.selection.importance === 'derby'
        ? 'mosaic'
        : competition.prestige > 0.82
          ? 'flags'
          : 'scarves'
  }
  return {
    mood,
    tension,
    hostility,
    anticipation,
    homeEnergy,
    awayEnergy,
    neutralInterest: clamp(0.35 + competition.prestige * 0.4 + closeness * 0.2),
    organizedChant: clamp(attendance.organized / Math.max(1, attendance.total) * 4.2 + context.rivalry * 0.22),
    familyActivity: clamp(attendance.families / Math.max(1, attendance.total) * 3.2),
    vipActivity: clamp(attendance.vip / Math.max(1, attendance.total) * 8 + competition.prestige * 0.14),
    leavingRatio,
    choreography,
    memory: [context.lastEvent ?? 'match-building', scoreDifference > 0 ? 'home-leading' : scoreDifference < 0 ? 'away-leading' : 'level-score', late > 0.5 ? 'late-tension' : 'normal-tempo'],
  }
}

export function calculateStaff(context: WorldMatchContext, attendance: AttendanceBreakdown): StaffState {
  const competition = getCompetition(context.selection.competitionId)
  const venue = getVenue(context.selection.venueId)
  const importance = importanceWeight[context.selection.importance]
  const scale = attendance.total / 1000
  return {
    stewards: Math.max(4, Math.round(scale * (1.5 + context.rivalry * 0.8))),
    police: Math.max(0, Math.round(scale * 0.34 * competition.securityMultiplier * importance)),
    paramedics: Math.max(2, Math.round(scale * 0.1 + 2)),
    groundskeepers: venue.archetype === 'community-ground' || venue.archetype === 'rural-field' ? 3 : Math.max(6, Math.round(venue.capacity / 6500)),
    ballAssistants: venue.archetype === 'street-court' ? 2 : 8,
    cameraOperators: Math.max(2, Math.round(4 + competition.mediaMultiplier * importance * 10 * venue.mediaCapacity)),
    photographers: Math.max(1, Math.round(3 + competition.mediaMultiplier * importance * 18)),
    journalists: Math.max(2, Math.round(12 + competition.mediaMultiplier * importance * 85)),
    vendors: Math.max(1, Math.round(scale * 0.62 * venue.exteriorDensity)),
    teamStaff: 28,
    substitutes: competition.substitutions > 7 ? 18 : 14,
    officials: competition.prestige > 0.8 ? 8 : 5,
    activity: context.presentationPhase === 'intro' || context.presentationPhase === 'fulltime' ? 0.9 : context.presentationPhase === 'halftime' ? 0.78 : 0.48,
  }
}

export function calculateCeremony(context: WorldMatchContext): CeremonyState {
  const competition = getCompetition(context.selection.competitionId)
  const enabled = context.selection.ceremonyEnabled && !context.selection.simplifiedPresentation
  if (!enabled) return { active: false, tier: 'none', stage: 'none', trophyVisible: false, medalStageVisible: false, pyrotechnics: 0, confetti: 0, skippable: true }
  let stage: CeremonyState['stage'] = 'none'
  if (context.presentationPhase === 'intro') stage = context.selection.importance === 'final' ? 'anthem' : 'entrance'
  if (context.presentationPhase === 'fulltime' && ['final', 'title-decider'].includes(context.selection.importance)) stage = 'trophy'
  const active = stage !== 'none'
  return {
    active,
    tier: competition.ceremonyTier,
    stage,
    trophyVisible: stage === 'trophy' || (stage === 'entrance' && context.selection.importance === 'final'),
    medalStageVisible: stage === 'trophy' && competition.ceremonyTier === 'final',
    pyrotechnics: context.selection.reducedPyro ? 0 : stage === 'trophy' ? 0.72 : stage === 'anthem' ? 0.26 : 0,
    confetti: stage === 'trophy' ? 0.9 : 0,
    skippable: true,
  }
}

export function createMatchWorld(context: WorldMatchContext): MatchWorldState {
  const competition = getCompetition(context.selection.competitionId)
  const venue = getVenue(context.selection.venueId)
  const surface = getSurface(venue.surfaceId)
  const selectedBall = getBall(context.selection.ballId || competition.officialBallId)
  const ball = context.selection.highContrastBall ? { ...selectedBall, baseColor: '#f6e739', accentColor: '#131820', highVisibility: true } : selectedBall
  const trophy = getTrophy(competition.trophyId)
  const attendance = calculateAttendance(context)
  const pitch = calculatePitch(context)
  const crowd = calculateCrowd(context, attendance)
  const staff = calculateStaff(context, attendance)
  const ceremony = calculateCeremony(context)
  const phase = resolveMatchDayPhase(context)
  const telemetry: WorldTelemetry = {
    attendance: attendance.total,
    capacityRatio: attendance.capacityRatio,
    crowdEnergy: (crowd.homeEnergy + crowd.awayEnergy + crowd.organizedChant) / 3,
    pitchGrip: pitch.grip,
    ballRollMultiplier: 1 / pitch.rollingResistance,
    ballBounceMultiplier: pitch.bounce,
    windExposure: venue.openness * (context.weather === 'wind' ? context.weatherIntensity : 0.12),
    securityLevel: clamp(competition.securityMultiplier * importanceWeight[context.selection.importance] * venue.securityCapacity),
    mediaLevel: clamp(competition.mediaMultiplier * importanceWeight[context.selection.importance] * venue.mediaCapacity),
    staffActive: staff.activity,
    ceremonyIntensity: ceremony.active ? (competition.prestige + importanceWeight[context.selection.importance]) / 2 : 0,
    venueComplexity: clamp((venue.tiers / 3) * 0.3 + venue.roofCoverage * 0.25 + venue.screenCount * 0.08 + venue.exteriorDensity * 0.25),
  }
  return {
    selection: context.selection,
    competition,
    venue,
    surface,
    ball,
    trophy,
    phase,
    attendance,
    pitch,
    crowd,
    staff,
    ceremony,
    telemetry,
    weather: context.weather,
    weatherIntensity: context.weatherIntensity,
    timeOfDay: context.timeOfDay,
    matchMinute: context.matchMinute,
    scoreHome: context.scoreHome,
    scoreAway: context.scoreAway,
    presentationPhase: context.presentationPhase,
    quality: context.quality,
    homePopularity: context.homePopularity,
    awayPopularity: context.awayPopularity,
  }
}

export function crowdSectionVisibility(world: MatchWorldState, group: 'home' | 'away' | 'neutral' | 'vip') {
  const total = Math.max(1, world.attendance.total)
  if (group === 'away') return world.attendance.away / total
  if (group === 'neutral') return world.attendance.neutral / total
  if (group === 'vip') return world.attendance.vip / total
  return world.attendance.home / total
}

export function worldEventLabel(world: MatchWorldState, team?: 'home' | 'away') {
  if (world.ceremony.stage === 'trophy') return `${world.trophy.name} presentation`
  if (world.ceremony.stage === 'anthem') return `${world.competition.name} anthem ceremony`
  if (world.phase === 'halftime') return 'Ground staff repairing divots · substitutes warming up'
  if (world.phase === 'arrival') return `${world.venue.name} match-day arrival`
  if (world.phase === 'warmup') return 'Goalkeeper drills · passing circles · shooting warm-up'
  if (team) return team === 'home' ? 'Home supporter surge' : 'Away-section celebration'
  return `${world.competition.shortName} · ${world.venue.city}`
}

export function deterministicSeatEmpty(index: number, world: MatchWorldState) {
  return seeded(index + world.venue.capacity * 0.001) > world.attendance.capacityRatio
}
