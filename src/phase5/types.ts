import type * as THREE from 'three'
import type { Difficulty, QualityLevel, TeamSide } from '../game/types'
import type { FoulAssessment, PlayerRuntimeState } from '../human/types'

export type CompetitivePlayState =
  | 'pre-match'
  | 'open-play'
  | 'advantage'
  | 'stopped'
  | 'restart-setup'
  | 'var-review'
  | 'penalty-shootout'
  | 'full-time'

export type RestartType =
  | 'kickoff'
  | 'throw-in'
  | 'corner'
  | 'goal-kick'
  | 'direct-free-kick'
  | 'indirect-free-kick'
  | 'penalty'
  | 'drop-ball'

export type TacticalPhase =
  | 'build-up'
  | 'sustained-attack'
  | 'counterattack'
  | 'high-press'
  | 'mid-block'
  | 'low-block'
  | 'rest-defense'
  | 'set-piece'

export type RefereeDecision =
  | 'play-on'
  | 'advantage'
  | 'foul'
  | 'penalty'
  | 'offside'
  | 'yellow-card'
  | 'red-card'
  | 'goal-confirmed'
  | 'goal-overturned'
  | 'var-check-complete'

export type VarReviewType = 'goal' | 'penalty' | 'red-card' | 'mistaken-identity' | 'offside'
export type VarOutcome = 'confirmed' | 'overturned' | 'changed'
export type AssetTier = 'procedural' | 'production-ready' | 'cinematic'

export interface TacticalPreset {
  id: string
  name: string
  formation: '4-3-3' | '4-2-3-1' | '4-4-2' | '5-4-1' | '3-4-3' | '3-5-2'
  mentality: 'defensive' | 'balanced' | 'positive' | 'attacking'
  lineHeight: number
  width: number
  compactness: number
  pressIntensity: number
  tempo: number
  directness: number
  risk: number
  counterPress: number
  restDefense: number
}

export interface RefereeProfile {
  id: string
  name: string
  strictness: number
  advantageBias: number
  cardThreshold: number
  penaltyThreshold: number
  varInterventionThreshold: number
  communication: number
  fitness: number
}

export interface SetPieceRoutine {
  id: string
  name: string
  restart: RestartType
  attackingTeamShape: 'short' | 'near-post' | 'far-post' | 'edge' | 'direct' | 'cross' | 'target' | 'long' | 'placed' | 'power'
  deliveryHeight: number
  power: number
  curve: number
  targetZone: [number, number]
  requiredPlayers: number
  risk: number
}

export interface CompetitiveSettings {
  homeTacticId: string
  awayTacticId: string
  homeCornerRoutineId: string
  awayCornerRoutineId: string
  homeFreeKickRoutineId: string
  awayFreeKickRoutineId: string
  refereeProfileId: string
  varEnabled: boolean
  automaticRestarts: boolean
  visibleOffsideLines: boolean
  refereeAssistance: boolean
  assetTier: AssetTier
}

export interface Phase5BallContact {
  team: TeamSide
  playerId: string
  receiverId?: string
  action: 'dribble' | 'pass' | 'shoot' | 'clear' | 'tackle' | 'intercept' | 'goalkeeper-claim'
  technique?: string
  position: [number, number, number]
  ballSpeed: number
  offsideRisk?: number
  timestamp: number
}

export interface Phase5FoulContact {
  team: TeamSide
  playerId: string
  opponentId: string
  position: [number, number, number]
  assessment: FoulAssessment
  lastDefender: boolean
  timestamp: number
}

export interface RestartState {
  id: string
  type: RestartType
  team: TeamSide
  position: [number, number, number]
  direct: boolean
  reason: string
  routineId: string
  takerId?: string
  countdown: number
  awardedAtMinute: number
}

export interface AdvantageState {
  team: TeamSide
  position: [number, number, number]
  expiresAt: number
  foulTeam: TeamSide
  reason: string
}

export interface VarReviewState {
  id: string
  type: VarReviewType
  checkingTeam: TeamSide
  provisionalDecision: RefereeDecision
  evidence: number
  startedAt: number
  resolvesAt: number
  subjectPlayerId?: string
  goalTeam?: TeamSide
  incidentPosition: [number, number, number]
}

export interface CardRecord {
  id: string
  team: TeamSide
  playerId: string
  color: 'yellow' | 'red'
  minute: number
  reason: string
  severity: number
}

export interface OffsideCandidate {
  passerId: string
  receiverId: string
  team: TeamSide
  positionAtPass: [number, number, number]
  ballXAtPass: number
  lineX: number
  createdAt: number
  confidence: number
}

export interface CompetitiveEvent {
  id: string
  sequence: number
  type:
    | 'restart-awarded'
    | 'restart-taken'
    | 'advantage-played'
    | 'advantage-recalled'
    | 'foul'
    | 'penalty-awarded'
    | 'offside'
    | 'card'
    | 'var-start'
    | 'var-decision'
    | 'goal-confirmed'
    | 'goal-overturned'
    | 'added-time'
    | 'tactical-shift'
  team?: TeamSide
  message: string
  matchMinute: number
  timestamp: number
  restart?: RestartState
  decision?: RefereeDecision
  card?: CardRecord
  review?: VarReviewState
  metadata?: Record<string, string | number | boolean | undefined>
}

export interface TeamShapeTelemetry {
  phase: TacticalPhase
  lineHeight: number
  width: number
  compactness: number
  pressIntensity: number
  averageX: number
  averageZ: number
}

export interface Phase5Telemetry {
  home: TeamShapeTelemetry
  away: TeamShapeTelemetry
  offsideLineHome: number
  offsideLineAway: number
  refereeDistanceToBall: number
  stoppageSeconds: number
  reviewCount: number
  restartCount: number
  passOffsideCandidates: number
  assetReadiness: number
}

export interface CompetitiveMatchState {
  sequence: number
  playState: CompetitivePlayState
  possession: TeamSide | null
  restart: RestartState | null
  advantage: AdvantageState | null
  varReview: VarReviewState | null
  pendingOffside: OffsideCandidate | null
  lastDecision: RefereeDecision
  lastMessage: string
  cards: CardRecord[]
  fouls: Record<TeamSide, number>
  offsides: Record<TeamSide, number>
  penalties: Record<TeamSide, number>
  restarts: Record<RestartType, number>
  addedTimeMinutes: number
  tacticalPhase: Record<TeamSide, TacticalPhase>
  eventLog: CompetitiveEvent[]
  telemetry: Phase5Telemetry
}

export interface ManualRestartRequest {
  id: number
  type: RestartType | 'var-check'
  team: TeamSide
}

export interface CompetitiveTickContext {
  now: number
  delta: number
  matchMinute: number
  difficulty: Difficulty
  quality: QualityLevel
  scoreHome: number
  scoreAway: number
  running: boolean
  ballPosition: THREE.Vector3
  ballVelocity: THREE.Vector3
  players: PlayerRuntimeState[]
}

export interface BallDirective {
  type: 'place' | 'freeze' | 'impulse'
  position?: [number, number, number]
  impulse?: [number, number, number]
  torque?: [number, number, number]
  restart?: RestartType
}

export interface CompetitiveTickResult {
  events: CompetitiveEvent[]
  directives: BallDirective[]
  changed: boolean
}

export interface Phase5NetworkSnapshot {
  sequence: number
  tick: number
  playState: CompetitivePlayState
  possession: TeamSide | null
  restart: RestartState | null
  advantage: AdvantageState | null
  varReview: VarReviewState | null
  cards: CardRecord[]
  fouls: Record<TeamSide, number>
  offsides: Record<TeamSide, number>
  addedTimeMinutes: number
  lastDecision: RefereeDecision
  eventIds: string[]
  authority: Array<'ball' | 'clock' | 'offside' | 'fouls' | 'cards' | 'var' | 'restarts' | 'score'>
}

export interface ExternalAssetSlot {
  id: string
  kind: 'player-model' | 'facial-rig' | 'mocap' | 'kit-material' | 'stadium-material' | 'ball-material'
  format: 'glb' | 'gltf' | 'fbx' | 'ktx2' | 'basis' | 'json'
  path: string
  requiredBones?: string[]
  requiredAnimations?: string[]
  maxBytes: number
  lod: 'gameplay' | 'broadcast' | 'cinematic'
  licensed: boolean
  fallback: string
}

export interface AssetPipelineReport {
  requestedTier: AssetTier
  readySlots: number
  totalSlots: number
  readiness: number
  missing: string[]
  unlicensed: string[]
  fallbacks: string[]
}
