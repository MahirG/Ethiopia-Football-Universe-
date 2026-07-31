import { createGuestIdentity, createLocalLeaderboard, divisionForRating } from './catalog'
import { fnv1a32 } from './integrity'
import type {
  CloudSaveEnvelope, GatewayMode, LeaderboardEntry, MatchmakingTicket,
  OnlineIdentity, OnlineModeId, OnlineRegionId, OnlineRoom,
} from './types'

const IDENTITY_KEY = 'efu-online-identity'
const CLOUD_SAVE_KEY = 'efu-online-cloud-save'
const ROOM_KEY = 'efu-online-room'
const ACCESS_TOKEN_KEY = 'efu-supabase-access-token'

export interface OnlineGateway {
  readonly mode: GatewayMode
  loadIdentity(): Promise<OnlineIdentity>
  saveIdentity(identity: OnlineIdentity): Promise<OnlineIdentity>
  loadCloudSave<T>(): Promise<CloudSaveEnvelope<T> | null>
  pushCloudSave<T>(envelope: CloudSaveEnvelope<T>): Promise<CloudSaveEnvelope<T>>
  leaderboard(identity: OnlineIdentity): Promise<LeaderboardEntry[]>
  enqueue(ticket: MatchmakingTicket): Promise<MatchmakingTicket>
  cancelQueue(ticketId: string): Promise<void>
  createRoom(identity: OnlineIdentity, mode: OnlineModeId): Promise<OnlineRoom>
  joinRoom(identity: OnlineIdentity, code: string): Promise<OnlineRoom>
  heartbeat(roomId: string, playerId: string): Promise<void>
}

function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

function writeLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function uniqueId(prefix: string): string {
  const value = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${value}`
}

function roomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function localRoom(identity: OnlineIdentity, mode: OnlineModeId): OnlineRoom {
  const now = Date.now()
  return {
    id: uniqueId('room'),
    code: roomCode(),
    mode,
    hostId: identity.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 30 * 60_000).toISOString(),
    state: 'lobby',
    authorityRegion: identity.region,
    participants: [{
      playerId: identity.id,
      displayName: identity.displayName,
      team: 'home',
      ready: false,
      connected: true,
      latencyMs: identity.region === 'auto' ? 72 : 48,
      rating: identity.rating,
      fairPlay: identity.fairPlay,
    }],
  }
}

export class LocalOnlineGateway implements OnlineGateway {
  readonly mode = 'local' as const

  async loadIdentity(): Promise<OnlineIdentity> {
    const existing = readLocal<OnlineIdentity>(IDENTITY_KEY)
    if (existing) return { ...existing, division: divisionForRating(existing.rating).id }
    const created = createGuestIdentity()
    writeLocal(IDENTITY_KEY, created)
    return created
  }

  async saveIdentity(identity: OnlineIdentity): Promise<OnlineIdentity> {
    const normalized = { ...identity, division: divisionForRating(identity.rating).id }
    writeLocal(IDENTITY_KEY, normalized)
    return normalized
  }

  async loadCloudSave<T>(): Promise<CloudSaveEnvelope<T> | null> {
    return readLocal<CloudSaveEnvelope<T>>(CLOUD_SAVE_KEY)
  }

  async pushCloudSave<T>(envelope: CloudSaveEnvelope<T>): Promise<CloudSaveEnvelope<T>> {
    const current = readLocal<CloudSaveEnvelope<T>>(CLOUD_SAVE_KEY)
    if (current && current.revision > envelope.revision) throw new Error('cloud-save-conflict')
    writeLocal(CLOUD_SAVE_KEY, envelope)
    return envelope
  }

  async leaderboard(identity: OnlineIdentity): Promise<LeaderboardEntry[]> {
    return createLocalLeaderboard(identity)
  }

  async enqueue(ticket: MatchmakingTicket): Promise<MatchmakingTicket> {
    writeLocal('efu-online-ticket', ticket)
    return ticket
  }

  async cancelQueue(ticketId: string): Promise<void> {
    const current = readLocal<MatchmakingTicket>('efu-online-ticket')
    if (current?.id === ticketId) localStorage.removeItem('efu-online-ticket')
  }

  async createRoom(identity: OnlineIdentity, mode: OnlineModeId): Promise<OnlineRoom> {
    const room = localRoom(identity, mode)
    writeLocal(ROOM_KEY, room)
    return room
  }

  async joinRoom(identity: OnlineIdentity, code: string): Promise<OnlineRoom> {
    const room = readLocal<OnlineRoom>(ROOM_KEY)
    if (!room || room.code !== code.toUpperCase()) throw new Error('room-not-found')
    if (!room.participants.some((participant) => participant.playerId === identity.id)) {
      room.participants.push({
        playerId: identity.id,
        displayName: identity.displayName,
        team: room.participants.length % 2 === 0 ? 'home' : 'away',
        ready: false,
        connected: true,
        latencyMs: 68,
        rating: identity.rating,
        fairPlay: identity.fairPlay,
      })
    }
    writeLocal(ROOM_KEY, room)
    return room
  }

  async heartbeat(roomId: string, playerId: string): Promise<void> {
    const room = readLocal<OnlineRoom>(ROOM_KEY)
    if (!room || room.id !== roomId) return
    room.participants = room.participants.map((participant) => participant.playerId === playerId ? { ...participant, connected: true } : participant)
    writeLocal(ROOM_KEY, room)
  }
}

interface SupabaseConfig {
  url: string
  publishableKey: string
  accessToken: string
}

export class SupabaseOnlineGateway implements OnlineGateway {
  readonly mode = 'cloud' as const
  private readonly fallback = new LocalOnlineGateway()

  constructor(private readonly config: SupabaseConfig) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('apikey', this.config.publishableKey)
    headers.set('Authorization', `Bearer ${this.config.accessToken}`)
    headers.set('Content-Type', 'application/json')
    headers.set('Prefer', 'resolution=merge-duplicates,return=representation')
    const response = await fetch(`${this.config.url}/rest/v1/${path}`, { ...init, headers })
    if (!response.ok) throw new Error(`online-gateway-${response.status}`)
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  async loadIdentity(): Promise<OnlineIdentity> {
    return this.fallback.loadIdentity()
  }

  async saveIdentity(identity: OnlineIdentity): Promise<OnlineIdentity> {
    const saved = await this.fallback.saveIdentity(identity)
    try {
      await this.request('efu_profiles?on_conflict=id', { method: 'POST', body: JSON.stringify({
        id: saved.id,
        display_name: saved.displayName,
        region: saved.region,
        rating: saved.rating,
        division: saved.division,
        fair_play: saved.fairPlay,
        guest: saved.guest,
      }) })
    } catch {
      return saved
    }
    return saved
  }

  async loadCloudSave<T>(): Promise<CloudSaveEnvelope<T> | null> {
    const identity = await this.loadIdentity()
    try {
      const rows = await this.request<Array<{ revision: number; updated_at: string; checksum: string; device_id: string; payload: T }>>(`efu_cloud_saves?player_id=eq.${encodeURIComponent(identity.id)}&limit=1`)
      const row = rows[0]
      return row ? { playerId: identity.id, revision: row.revision, updatedAt: row.updated_at, checksum: row.checksum, deviceId: row.device_id, payload: row.payload } : null
    } catch {
      return this.fallback.loadCloudSave<T>()
    }
  }

  async pushCloudSave<T>(envelope: CloudSaveEnvelope<T>): Promise<CloudSaveEnvelope<T>> {
    try {
      await this.request('efu_cloud_saves?on_conflict=player_id', { method: 'POST', body: JSON.stringify({
        player_id: envelope.playerId,
        revision: envelope.revision,
        updated_at: envelope.updatedAt,
        checksum: envelope.checksum,
        device_id: envelope.deviceId,
        payload: envelope.payload,
      }) })
      return envelope
    } catch {
      return this.fallback.pushCloudSave(envelope)
    }
  }

  async leaderboard(identity: OnlineIdentity): Promise<LeaderboardEntry[]> {
    try {
      const rows = await this.request<Array<{ player_id: string; display_name: string; rating: number; division: LeaderboardEntry['division']; wins: number; losses: number; fair_play: number; region: OnlineRegionId }>>('efu_ranked_leaderboard?select=*&order=rating.desc&limit=50')
      return rows.map((row, index) => ({ rank: index + 1, playerId: row.player_id, displayName: row.display_name, rating: row.rating, division: row.division, wins: row.wins, losses: row.losses, fairPlay: row.fair_play, region: row.region }))
    } catch {
      return this.fallback.leaderboard(identity)
    }
  }

  async enqueue(ticket: MatchmakingTicket): Promise<MatchmakingTicket> {
    try {
      await this.request('efu_matchmaking_tickets', { method: 'POST', body: JSON.stringify({
        id: ticket.id, player_id: ticket.playerId, mode: ticket.mode, region: ticket.region,
        rating: ticket.rating, fair_play: ticket.fairPlay, latency_ceiling_ms: ticket.latencyCeilingMs,
        skill_window: ticket.skillWindow, party_size: ticket.partySize, created_at: ticket.createdAt,
      }) })
      return ticket
    } catch {
      return this.fallback.enqueue(ticket)
    }
  }

  async cancelQueue(ticketId: string): Promise<void> {
    try {
      await this.request(`efu_matchmaking_tickets?id=eq.${encodeURIComponent(ticketId)}`, { method: 'DELETE' })
    } catch {
      await this.fallback.cancelQueue(ticketId)
    }
  }

  async createRoom(identity: OnlineIdentity, mode: OnlineModeId): Promise<OnlineRoom> {
    return this.fallback.createRoom(identity, mode)
  }

  async joinRoom(identity: OnlineIdentity, code: string): Promise<OnlineRoom> {
    return this.fallback.joinRoom(identity, code)
  }

  async heartbeat(roomId: string, playerId: string): Promise<void> {
    try {
      await this.request('rpc/efu_room_heartbeat', { method: 'POST', body: JSON.stringify({ p_room_id: roomId, p_player_id: playerId }) })
    } catch {
      await this.fallback.heartbeat(roomId, playerId)
    }
  }
}

export function createOnlineGateway(): OnlineGateway {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY) ?? undefined
  return url && publishableKey && accessToken
    ? new SupabaseOnlineGateway({ url: url.replace(/\/$/, ''), publishableKey, accessToken })
    : new LocalOnlineGateway()
}

export function createCloudEnvelope<T>(playerId: string, revision: number, deviceId: string, payload: T): CloudSaveEnvelope<T> {
  const updatedAt = new Date().toISOString()
  const checksum = fnv1a32(JSON.stringify({ playerId, revision, updatedAt, deviceId, payload }))
  return { playerId, revision, updatedAt, checksum, deviceId, payload }
}
