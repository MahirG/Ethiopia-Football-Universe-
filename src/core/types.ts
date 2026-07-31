import type { TeamSide, Weather } from '../game/types'
export type { TeamSide, Weather } from '../game/types'

export type MatchPhase =
  | 'pre-match' | 'entrance' | 'coin-toss' | 'kickoff' | 'active-play'
  | 'ball-out' | 'throw-in' | 'goal-kick' | 'corner-kick'
  | 'direct-free-kick' | 'indirect-free-kick' | 'penalty-kick' | 'dropped-ball'
  | 'goal-scored' | 'goal-review' | 'var-review' | 'injury-stoppage'
  | 'substitution-stoppage' | 'cooling-break' | 'half-time'
  | 'second-half-kickoff' | 'extra-time-break' | 'extra-time'
  | 'penalty-shootout' | 'suspended' | 'abandoned' | 'full-time'
  | 'trophy-ceremony' | 'post-match'

export type RestartType = 'none' | 'kickoff' | 'throw-in' | 'goal-kick' | 'corner' | 'direct-free-kick' | 'indirect-free-kick' | 'penalty' | 'dropped-ball'
export type PossessionState = 'controlled' | 'loose' | 'contested' | 'shielded' | 'first-touch' | 'between-players' | 'free' | 'aerial' | 'deflected' | 'goalkeeper' | 'trapped' | 'out'
export type CardKind = 'none' | 'warning' | 'yellow' | 'second-yellow' | 'red'
export type ReviewKind = 'goal' | 'penalty' | 'red-card' | 'mistaken-identity' | 'offside' | 'attacking-foul' | 'handball' | 'ball-out'
export type AssistLevel = 'full' | 'assisted' | 'semi' | 'manual'
export type InputDevice = 'gamepad' | 'keyboard' | 'keyboard-mouse' | 'touch' | 'handheld' | 'accessibility'
export type TacticalPhase = 'attack' | 'defend' | 'positive-transition' | 'negative-transition' | 'restart'
export type PressingStyle = 'high' | 'mid-block' | 'low-block' | 'man-oriented' | 'zonal' | 'counterpress' | 'selective' | 'trap' | 'emergency'

export interface Vec3Like { x: number; y: number; z: number }

export interface CorePlayerSnapshot {
  id: string
  team: TeamSide
  index: number
  role: string
  position: Vec3Like
  velocity: Vec3Like
  facing: number
  fatigue: number
  balance: number
  strength: number
  awareness: number
  discipline: number
  reaction: number
  onBall: boolean
  action: string
}

export interface BallSnapshot {
  position: Vec3Like
  velocity: Vec3Like
  angularVelocity: Vec3Like
  radius: number
  lastTouchPlayerId: string | null
  lastTouchTeam: TeamSide | null
}

export interface SurfaceSnapshot {
  grip: number
  rollingResistance: number
  restitution: number
  wetness: number
  unevenness: number
  altitudeMeters: number
  temperatureC: number
  wind: Vec3Like
}

export interface MatchConfig {
  seed: number
  regulationMinutes: number
  extraTimeMinutes: number
  acceleratedMinutesPerSecond: number
  handball: 'disabled' | 'deliberate-only' | 'standard' | 'strict'
  varEnabled: boolean
  injuries: boolean
  inputDevice: InputDevice
  passAssist: AssistLevel
  shotAssist: AssistLevel
  crossingAssist: AssistLevel
  throughBallAssist: AssistLevel
  switchAssist: AssistLevel
  ranked: boolean
}

export interface ClockState {
  phase: 'first-half' | 'half-time' | 'second-half' | 'extra-time-1' | 'extra-time-break' | 'extra-time-2' | 'shootout' | 'finished'
  elapsedMinutes: number
  displayedMinute: number
  addedTimeMinimum: number
  stoppageSeconds: number
  running: boolean
}

export interface MatchEvent<T = Record<string, unknown>> {
  id: string
  sequence: number
  type: string
  matchMinute: number
  simulationTime: number
  team?: TeamSide
  playerId?: string
  data: T
}

export interface RestartDecision {
  type: RestartType
  team: TeamSide | null
  location: Vec3Like
  reason: string
}

export interface RuleDecision {
  goal: TeamSide | null
  outOfPlay: boolean
  restart: RestartDecision | null
  offsidePlayerId: string | null
  foul: boolean
  card: CardKind
  advantage: boolean
  review: ReviewKind | null
  reason: string
}

export interface PossessionEvaluation {
  state: PossessionState
  team: TeamSide | null
  playerId: string | null
  confidence: number
  contestingPlayerIds: string[]
}

export interface TeamTacticalState {
  team: TeamSide
  phase: TacticalPhase
  width: number
  depth: number
  compactness: number
  lineHeight: number
  pressing: PressingStyle
  pressIntensity: number
  transitionUrgency: number
  restDefense: number
  overloadSide: -1 | 0 | 1
}

export interface CoreStatistics {
  home: TeamStatistics
  away: TeamStatistics
  possessionSeconds: { home: number; away: number; contested: number }
  ballInPlaySeconds: number
  stoppageSeconds: number
}

export interface TeamStatistics {
  shots: number
  shotsOnTarget: number
  xg: number
  passes: number
  completedPasses: number
  progressivePasses: number
  crosses: number
  tackles: number
  interceptions: number
  blocks: number
  saves: number
  fouls: number
  yellowCards: number
  redCards: number
  offsides: number
  corners: number
  recoveries: number
  pressingActions: number
  duels: number
  aerialDuels: number
}

export interface CoreTelemetry {
  phase: MatchPhase
  possession: PossessionEvaluation
  homeTactics: TeamTacticalState
  awayTactics: TeamTacticalState
  restart: RestartDecision | null
  addedTime: number
  offsideLineHome: number
  offsideLineAway: number
  networkCorrections: number
  rejectedInputs: number
  authoritativeSequence: number
  ballInPlay: boolean
  weather: Weather
  statistics: CoreStatistics
}

export interface CoreFrameInput {
  delta: number
  simulationTime: number
  matchMinute: number
  running: boolean
  scoreHome: number
  scoreAway: number
  weather: Weather
  weatherIntensity: number
  ball: BallSnapshot
  players: CorePlayerSnapshot[]
  surface: SurfaceSnapshot
}
