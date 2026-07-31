export type OnlineModeId = 'ranked-1v1' | 'friendly-1v1' | 'co-op-2v2' | 'club-5v5' | 'tournament' | 'community-cup'
export type OnlineRegionId = 'auto' | 'addis' | 'east-africa' | 'africa' | 'middle-east' | 'europe'
export type DivisionId = 'walia' | 'premier' | 'championship' | 'gold' | 'silver' | 'bronze' | 'grassroots'
export type QueueState = 'idle' | 'searching' | 'found' | 'ready-check' | 'connecting' | 'cancelled'
export type GatewayMode = 'local' | 'cloud'
export type GatewayStatus = 'offline' | 'ready' | 'syncing' | 'conflict' | 'error'
export type FairPlayBand = 'excellent' | 'good' | 'restricted' | 'suspended'

export interface OnlineModeConfig {
  id: OnlineModeId
  name: string
  teamSize: number
  ranked: boolean
  crossPlay: boolean
  maxPingMs: number
  reconnectSeconds: number
  description: string
}

export interface ServiceRegion {
  id: OnlineRegionId
  name: string
  location: string
  latencyTargetMs: number
  enabled: boolean
}

export interface RankedDivision {
  id: DivisionId
  name: string
  minimumRating: number
  promotionWins: number
  color: string
}

export interface OnlineIdentity {
  id: string
  displayName: string
  createdAt: string
  region: OnlineRegionId
  rating: number
  division: DivisionId
  placementMatchesRemaining: number
  fairPlay: number
  wins: number
  draws: number
  losses: number
  guest: boolean
}

export interface MatchmakingTicket {
  id: string
  playerId: string
  mode: OnlineModeId
  region: OnlineRegionId
  rating: number
  fairPlay: number
  createdAt: string
  latencyCeilingMs: number
  skillWindow: number
  partySize: number
}

export interface QueueSnapshot {
  state: QueueState
  ticket: MatchmakingTicket | null
  elapsedSeconds: number
  estimatedSeconds: number
  candidates: number
  expandedSkillWindow: number
  expandedPingMs: number
  message: string
}

export interface MatchParticipant {
  playerId: string
  displayName: string
  team: 'home' | 'away'
  ready: boolean
  connected: boolean
  latencyMs: number
  rating: number
  fairPlay: number
}

export interface OnlineRoom {
  id: string
  code: string
  mode: OnlineModeId
  hostId: string
  createdAt: string
  expiresAt: string
  participants: MatchParticipant[]
  state: 'lobby' | 'ready-check' | 'playing' | 'completed' | 'abandoned'
  authorityRegion: OnlineRegionId
}

export interface CloudSaveEnvelope<T = unknown> {
  playerId: string
  revision: number
  updatedAt: string
  checksum: string
  deviceId: string
  payload: T
}

export interface LeaderboardEntry {
  rank: number
  playerId: string
  displayName: string
  rating: number
  division: DivisionId
  wins: number
  losses: number
  fairPlay: number
  region: OnlineRegionId
}

export interface LiveSeason {
  id: string
  name: string
  startsAt: string
  endsAt: string
  placementMatches: number
  ratingFloor: number
  ratingCeiling: number
  decayAfterInactiveDays: number
  payToWin: boolean
}

export interface LiveCompetitionEvent {
  id: string
  name: string
  mode: OnlineModeId
  startsAt: string
  endsAt: string
  minimumFairPlay: number
  minimumMatches: number
}

export interface IntegrityInput {
  sequence: number
  matchTimeMs: number
  action: string
  x: number
  z: number
  magnitude: number
  clientTimeMs: number
}

export interface IntegrityRecord extends IntegrityInput {
  playerId: string
  matchId: string
  previousHash: string
  hash: string
}

export interface IntegrityVerdict {
  accepted: boolean
  reasons: string[]
  riskScore: number
  correctionRequired: boolean
}

export interface ReconnectState {
  matchId: string
  disconnectedAt: string
  expiresAt: string
  lastAcknowledgedSequence: number
  snapshotRevision: number
  resumable: boolean
}

export interface OnlinePlatformSnapshot {
  identity: OnlineIdentity
  gatewayMode: GatewayMode
  gatewayStatus: GatewayStatus
  queue: QueueSnapshot
  room: OnlineRoom | null
  reconnect: ReconnectState | null
  lastSyncAt: string | null
}
