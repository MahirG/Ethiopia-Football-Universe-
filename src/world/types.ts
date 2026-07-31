import type { PresentationPhase, QualityLevel, TeamSide, TimeOfDay, Weather } from '../game/types'

export type CompetitionFormat =
  | 'round-robin'
  | 'single-elimination'
  | 'double-elimination'
  | 'two-leg-knockout'
  | 'groups-knockout'
  | 'swiss'
  | 'mini-league'
  | 'split-league'
  | 'promotion-playoff'
  | 'best-of-series'

export type VenueArchetype =
  | 'national-bowl'
  | 'modern-arena'
  | 'historic-ground'
  | 'athletics-stadium'
  | 'compact-urban'
  | 'community-ground'
  | 'rural-field'
  | 'university-ground'
  | 'training-centre'
  | 'street-court'
  | 'futsal-arena'

export type SurfaceType = 'natural' | 'hybrid' | 'artificial' | 'dry-grass' | 'dirt' | 'futsal'
export type RoofType = 'open' | 'partial' | 'continuous' | 'retractable' | 'indoor'
export type CeremonyTier = 'none' | 'local' | 'league' | 'continental' | 'final'
export type MatchImportance = 'friendly' | 'regular' | 'derby' | 'relegation' | 'title-decider' | 'final'
export type CrowdGroup = 'home' | 'away' | 'neutral' | 'organized' | 'families' | 'vip' | 'media'
export type MatchDayPhase =
  | 'preparation'
  | 'arrival'
  | 'warmup'
  | 'tunnel'
  | 'entrance'
  | 'live'
  | 'halftime'
  | 'extra-time'
  | 'penalties'
  | 'fulltime'
  | 'ceremony'
  | 'cleanup'

export interface CompetitionProfile {
  id: string
  name: string
  shortName: string
  region: string
  format: CompetitionFormat
  teams: number
  groupCount?: number
  legs: 1 | 2
  prestige: number
  colors: [string, string, string]
  typography: 'heritage' | 'modern' | 'broadcast' | 'community'
  trophyId: string
  officialBallId: string
  ceremonyTier: CeremonyTier
  crowdMultiplier: number
  mediaMultiplier: number
  securityMultiplier: number
  musicStyle: string
  entranceStyle: string
  broadcastStyle: string
  tiebreakers: Array<'points' | 'goal-difference' | 'goals-scored' | 'head-to-head' | 'away-goals' | 'fair-play' | 'playoff' | 'lots'>
  extraTime: boolean
  penalties: boolean
  substitutions: number
  visualIdentity: string
}

export interface VenueProfile {
  id: string
  name: string
  city: string
  region: string
  country: string
  archetype: VenueArchetype
  capacity: number
  altitudeM: number
  roof: RoofType
  tiers: number
  pitchDistanceM: number
  surfaceId: string
  architecture: string
  surrounding: string
  localLanguages: string[]
  homeSupportShare: number
  awayAllocation: number
  vipShare: number
  familyShare: number
  roofCoverage: number
  crowdProximity: number
  openness: number
  reverbSeconds: number
  paEcho: number
  floodlightQuality: number
  drainage: number
  maintenanceBudget: number
  securityCapacity: number
  mediaCapacity: number
  accessibility: number
  hasTrack: boolean
  hasRetractableRoof: boolean
  benchStyle: 'integrated' | 'dugout' | 'simple' | 'touchline'
  screenCount: number
  exteriorDensity: number
  culturalDetails: string[]
}

export interface SurfaceProfile {
  id: string
  name: string
  type: SurfaceType
  grassLengthMm: number
  bladeDensity: number
  moisture: number
  hardness: number
  drainage: number
  slope: number
  rollingResistance: number
  bounce: number
  grip: number
  mudPotential: number
  waterloggingRisk: number
  lineDurability: number
  maintenanceCost: number
}

export interface BallProfile {
  id: string
  name: string
  category: 'official' | 'final' | 'winter' | 'training' | 'futsal' | 'street' | 'vintage' | 'community'
  size: number
  massKg: number
  panelCount: number
  seamDepthMm: number
  pressureBar: number
  waterAbsorption: number
  dragCoefficient: number
  magnusCoefficient: number
  restitution: number
  rollingFriction: number
  spinRetention: number
  roughness: number
  baseColor: string
  accentColor: string
  highVisibility: boolean
}

export interface TrophyProfile {
  id: string
  name: string
  material: string
  massKg: number
  heightCm: number
  handles: boolean
  ribbons: boolean
  engraving: boolean
  ceremonyTier: CeremonyTier
}

export interface WorldSelection {
  competitionId: string
  venueId: string
  ballId: string
  importance: MatchImportance
  attendanceOverride: number | null
  surfaceWear: number
  maintenanceQuality: number
  ceremonyEnabled: boolean
  crowdChoreography: boolean
  exteriorSequence: boolean
  simplifiedPresentation: boolean
  reducedPyro: boolean
  highContrastBall: boolean
}

export interface AttendanceBreakdown {
  total: number
  capacityRatio: number
  home: number
  away: number
  neutral: number
  organized: number
  families: number
  vip: number
  media: number
  closedSeats: number
  lateArrivals: number
  earlyLeavers: number
}

export interface PitchCondition {
  moisture: number
  hardness: number
  grip: number
  rollingResistance: number
  bounce: number
  mud: number
  waterlogging: number
  lineWear: number
  divots: number
  goalmouthWear: number
  cornerWear: number
  maintenanceQuality: number
  temperatureC: number
}

export interface CrowdState {
  mood: number
  tension: number
  hostility: number
  anticipation: number
  homeEnergy: number
  awayEnergy: number
  neutralInterest: number
  organizedChant: number
  familyActivity: number
  vipActivity: number
  leavingRatio: number
  choreography: 'none' | 'scarves' | 'flags' | 'mosaic' | 'tribute' | 'championship'
  memory: string[]
}

export interface StaffState {
  stewards: number
  police: number
  paramedics: number
  groundskeepers: number
  ballAssistants: number
  cameraOperators: number
  photographers: number
  journalists: number
  vendors: number
  teamStaff: number
  substitutes: number
  officials: number
  activity: number
}

export interface CeremonyState {
  active: boolean
  tier: CeremonyTier
  stage: 'none' | 'entrance' | 'anthem' | 'tribute' | 'medals' | 'trophy' | 'fireworks'
  trophyVisible: boolean
  medalStageVisible: boolean
  pyrotechnics: number
  confetti: number
  skippable: boolean
}

export interface WorldTelemetry {
  attendance: number
  capacityRatio: number
  crowdEnergy: number
  pitchGrip: number
  ballRollMultiplier: number
  ballBounceMultiplier: number
  windExposure: number
  securityLevel: number
  mediaLevel: number
  staffActive: number
  ceremonyIntensity: number
  venueComplexity: number
}

export interface MatchWorldState {
  selection: WorldSelection
  competition: CompetitionProfile
  venue: VenueProfile
  surface: SurfaceProfile
  ball: BallProfile
  trophy: TrophyProfile
  phase: MatchDayPhase
  attendance: AttendanceBreakdown
  pitch: PitchCondition
  crowd: CrowdState
  staff: StaffState
  ceremony: CeremonyState
  telemetry: WorldTelemetry
  weather: Weather
  weatherIntensity: number
  timeOfDay: TimeOfDay
  matchMinute: number
  scoreHome: number
  scoreAway: number
  presentationPhase: PresentationPhase
  quality: QualityLevel
  homePopularity: number
  awayPopularity: number
}

export interface WorldMatchContext {
  selection: WorldSelection
  weather: Weather
  weatherIntensity: number
  timeOfDay: TimeOfDay
  matchMinute: number
  scoreHome: number
  scoreAway: number
  presentationPhase: PresentationPhase
  quality: QualityLevel
  homePopularity: number
  awayPopularity: number
  homeForm: number
  rivalry: number
  ticketPriceIndex: number
  dayTimeAccessibility: number
  economicIndex: number
  recentMatches: number
  slides: number
  eventPulse: number
  lastEvent?: string
}

export interface TournamentTeam {
  id: string
  name: string
  region?: string
  coefficient: number
  protectedGroup?: string
  seed?: number
}

export interface TournamentFixture {
  id: string
  round: number
  leg: 1 | 2
  homeId: string
  awayId: string
  neutral: boolean
}

export interface TournamentStanding {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
  fairPlay: number
  headToHeadPoints?: number
}

export interface WorldNetworkSnapshot {
  tick: number
  competitionId: string
  venueId: string
  ballId: string
  weather: Weather
  weatherIntensity: number
  matchMinute: number
  pitch: Pick<PitchCondition, 'moisture' | 'grip' | 'rollingResistance' | 'bounce' | 'lineWear' | 'divots'>
  crowd: Pick<CrowdState, 'mood' | 'tension' | 'homeEnergy' | 'awayEnergy' | 'leavingRatio'>
  ceremony: Pick<CeremonyState, 'active' | 'stage'>
  screenEvent: string
  eventId: string
  authoritative: Array<'ball' | 'clock' | 'pitch' | 'weather' | 'decisions' | 'screens' | 'ceremony'>
  localOnly: Array<'crowd-animation' | 'flags' | 'vendors' | 'ambient-traffic'>
}

export type WorldEvent =
  | 'arrival'
  | 'warmup'
  | 'entrance'
  | 'anthem'
  | 'kickoff'
  | 'goal-home'
  | 'goal-away'
  | 'save'
  | 'miss'
  | 'foul'
  | 'card'
  | 'var-review'
  | 'var-home'
  | 'var-away'
  | 'halftime'
  | 'extra-time'
  | 'penalties'
  | 'fulltime'
  | 'trophy'
  | 'cleanup'
