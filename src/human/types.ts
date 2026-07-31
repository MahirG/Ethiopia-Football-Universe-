import type * as THREE from 'three'
import type { TeamSide, Weather } from '../game/types'
export type { TeamSide, Weather }

export type PlayerRole = 'goalkeeper' | 'fullback' | 'centre-back' | 'midfielder' | 'winger' | 'striker'
export type PreferredFoot = 'left' | 'right'
export type HumanAction =
  | 'hold'
  | 'support'
  | 'press'
  | 'mark'
  | 'recover'
  | 'dribble'
  | 'pass'
  | 'shoot'
  | 'clear'
  | 'tackle'
  | 'intercept'
  | 'goalkeeper-set'
  | 'goalkeeper-dive'
  | 'goalkeeper-claim'


export type FootballTechnique =
  | 'close-dribble'
  | 'sprint-dribble'
  | 'protective-touch'
  | 'short-pass'
  | 'driven-pass'
  | 'through-ball'
  | 'lofted-pass'
  | 'cross'
  | 'backheel'
  | 'power-shot'
  | 'placed-shot'
  | 'finesse-shot'
  | 'chip-shot'
  | 'volley'
  | 'half-volley'
  | 'header'
  | 'clearance'
  | 'poke-tackle'
  | 'slide-tackle'
  | 'keeper-catch'
  | 'keeper-parry'
  | 'keeper-throw'

export interface TechniqueDefinition {
  id: FootballTechnique
  power: number
  lift: number
  spin: number
  error: number
  preparation: number
  recovery: number
  preferredContact: 'inside' | 'outside' | 'instep' | 'toe' | 'sole' | 'head' | 'glove'
}

export type InjuryKind = 'none' | 'bruise' | 'ankle' | 'hamstring' | 'knee' | 'shoulder' | 'head'

export interface BodyProfile {
  height: number
  mass: number
  shoulderWidth: number
  hipWidth: number
  torsoLength: number
  upperLegLength: number
  lowerLegLength: number
  upperArmLength: number
  lowerArmLength: number
  neckLength: number
  neckThickness: number
  handScale: number
  footLength: number
  muscle: number
  bodyFat: number
  asymmetry: number
  age: number
}

export interface FaceProfile {
  skinTone: string
  undertone: string
  hairTone: string
  eyeTone: string
  faceWidth: number
  jawWidth: number
  cheekHeight: number
  noseLength: number
  noseWidth: number
  lipFullness: number
  foreheadHeight: number
  earScale: number
  eyeSpacing: number
  eyeScale: number
  hairStyle: 'fade' | 'short-curl' | 'coiled' | 'braids' | 'afro' | 'shaved'
  beardStyle: 'none' | 'stubble' | 'short' | 'goatee'
  scar: number
  freckles: number
}

export interface PersonalityProfile {
  aggression: number
  composure: number
  confidence: number
  leadership: number
  selflessness: number
  creativity: number
  discipline: number
  bravery: number
  patience: number
  sportsmanship: number
  emotionalControl: number
  riskTolerance: number
  workRate: number
  loyalty: number
}

export interface AbilityProfile {
  acceleration: number
  sprintSpeed: number
  agility: number
  balance: number
  strength: number
  stamina: number
  reactions: number
  vision: number
  firstTouch: number
  passing: number
  shooting: number
  dribbling: number
  tackling: number
  heading: number
  weakFoot: number
  goalkeeper: number
}

export interface MovementSignature {
  strideScale: number
  cadenceScale: number
  armSwing: number
  torsoLean: number
  scanFrequency: number
  touchRhythm: number
  celebrationStyle: number
  posture: number
}

export interface PlayerProfile {
  id: string
  number: number
  role: PlayerRole
  team: TeamSide
  preferredFoot: PreferredFoot
  body: BodyProfile
  face: FaceProfile
  personality: PersonalityProfile
  ability: AbilityProfile
  movement: MovementSignature
}


export interface PlayerRelationship {
  fromId: string
  toId: string
  trust: number
  chemistry: number
  respect: number
  rivalry: number
  mentorship: number
  frustration: number
}

export interface FoulAssessment {
  foul: boolean
  severity: number
  card: 'none' | 'yellow' | 'red'
  reason: 'fair-contact' | 'late' | 'reckless' | 'denying-opportunity' | 'dangerous'
}

export interface EmotionalState {
  confidence: number
  frustration: number
  focus: number
  aggression: number
  joy: number
  pain: number
  pressure: number
  lastMajorEvent: string
}

export interface PhysicalState {
  fatigue: number
  shortTermLoad: number
  sweat: number
  wetness: number
  dirt: number
  balance: number
  traction: number
  injury: InjuryKind
  injurySeverity: number
  breathing: number
  recovery: number
}

export interface PlayerRuntimeState {
  id: string
  team: TeamSide
  index: number
  role: PlayerRole
  position: THREE.Vector3
  velocity: THREE.Vector3
  facing: number
  desiredFacing: number
  action: HumanAction
  actionStartedAt: number
  hasBallIntent: boolean
  onBall: boolean
  offsideRisk: number
  nearestOpponentDistance: number
  nearestTeammateDistance: number
  scanTarget: THREE.Vector3
  emotion: EmotionalState
  physical: PhysicalState
}

export interface MatchWorldState {
  players: PlayerRuntimeState[]
  ballPosition: THREE.Vector3
  ballVelocity: THREE.Vector3
  matchProgress: number
  weather: Weather
  weatherIntensity: number
  scoreHome: number
  scoreAway: number
  eventPulse: number
}

export interface Perception {
  distanceToBall: number
  angleToBall: number
  nearestOpponentDistance: number
  nearestTeammateDistance: number
  pressure: number
  forwardSpace: number
  passingLaneQuality: number
  shootingLaneQuality: number
  defensiveDanger: number
  offsideRisk: number
  ballApproaching: boolean
  ballHeight: number
  possessionTeam: TeamSide | null
  teammates: PlayerRuntimeState[]
  opponents: PlayerRuntimeState[]
}

export interface DecisionResult {
  action: HumanAction
  target: THREE.Vector3
  utility: number
  receiverId?: string
}

export interface LocomotionInput {
  desiredVelocity: THREE.Vector3
  currentVelocity: THREE.Vector3
  facing: number
  profile: PlayerProfile
  physical: PhysicalState
  weather: Weather
  weatherIntensity: number
  delta: number
}

export interface LocomotionOutput {
  velocity: THREE.Vector3
  facing: number
  turnRate: number
  gaitPhaseRate: number
  strideLength: number
  braking: number
  slip: number
  lean: number
  plantBias: number
}

export interface BallContactRequest {
  action: Extract<HumanAction, 'dribble' | 'pass' | 'shoot' | 'clear' | 'tackle' | 'intercept' | 'goalkeeper-claim'>
  player: PlayerProfile
  runtime: PlayerRuntimeState
  ballPosition: THREE.Vector3
  ballVelocity: THREE.Vector3
  target: THREE.Vector3
  pressure: number
  weather: Weather
  weatherIntensity: number
  matchProgress: number
  contactSide: PreferredFoot
  seed: number
  technique?: FootballTechnique
}

export interface BallContactResult {
  impulse: THREE.Vector3
  torque: THREE.Vector3
  quality: number
  errorRadians: number
  contactPoint: THREE.Vector3
  soundForce: number
  heavyTouch: boolean
}


export interface VisualMotionState {
  gaitPhase: number
  gaitRate: number
  strideLength: number
  lean: number
  braking: number
  slip: number
  plantBias: number
  kick: number
  tackle: number
  stumble: number
  goalkeeperDive: number
  jump: number
}

export interface HumanTelemetry {
  averageFatigue: number
  averagePressure: number
  activeDecisions: Record<HumanAction, number>
  footSlipEvents: number
  ballContacts: number
  mistakes: number
  goalkeeperReactionMs: number
  maxPlayerSpeed: number
}

export interface NetworkPlayerSnapshot {
  id: string
  sequence: number
  timestamp: number
  position: [number, number, number]
  velocity: [number, number, number]
  facing: number
  action: HumanAction
  actionTime: number
  fatigue: number
  balance: number
}
