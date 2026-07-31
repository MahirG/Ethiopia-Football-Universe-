import { useCallback, useEffect, useMemo, useState } from 'react'
import { LIVE_EVENTS, LIVE_SEASON, ONLINE_MODES, createLocalLeaderboard, divisionForRating } from './catalog'
import { createCloudEnvelope, createOnlineGateway } from './gateway'
import type {
  GatewayStatus, LeaderboardEntry, MatchmakingTicket, OnlineIdentity, OnlineModeId,
  OnlinePlatformSnapshot, OnlineRoom, QueueSnapshot,
} from './types'

const EMPTY_QUEUE: QueueSnapshot = {
  state: 'idle',
  ticket: null,
  elapsedSeconds: 0,
  estimatedSeconds: 12,
  candidates: 0,
  expandedSkillWindow: 75,
  expandedPingMs: 90,
  message: 'Choose a mode to begin matchmaking.',
}

function uniqueId(prefix: string): string {
  const value = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${value}`
}

function deviceId(): string {
  const key = 'efu-online-device-id'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const created = uniqueId('device')
  localStorage.setItem(key, created)
  return created
}

function localSavePayload(): Record<string, unknown> {
  const keys = [
    'efu-career', 'efu-match-history', 'efu-language', 'efu-theme', 'efu-reduced-motion',
    'efu-world-selection', 'efu-audio-settings', 'efu-human-settings',
  ]
  return Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]))
}

export function useOnlinePlatform() {
  const gateway = useMemo(() => createOnlineGateway(), [])
  const [identity, setIdentity] = useState<OnlineIdentity | null>(null)
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>('offline')
  const [queue, setQueue] = useState<QueueSnapshot>(EMPTY_QUEUE)
  const [room, setRoom] = useState<OnlineRoom | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [cloudRevision, setCloudRevision] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const boot = async () => {
      setGatewayStatus('syncing')
      try {
        const loaded = await gateway.loadIdentity()
        const board = await gateway.leaderboard(loaded)
        const cloud = await gateway.loadCloudSave<Record<string, unknown>>()
        if (!alive) return
        setIdentity(loaded)
        setLeaderboard(board)
        setCloudRevision(cloud?.revision ?? 0)
        setLastSyncAt(cloud?.updatedAt ?? null)
        setGatewayStatus(gateway.mode === 'cloud' ? 'ready' : 'offline')
      } catch (caught) {
        if (!alive) return
        setError(caught instanceof Error ? caught.message : 'online-bootstrap-failed')
        setGatewayStatus('error')
      }
    }
    void boot()
    return () => { alive = false }
  }, [gateway])

  useEffect(() => {
    if (queue.state !== 'searching') return
    const timer = window.setInterval(() => {
      setQueue((current) => {
        const elapsedSeconds = current.elapsedSeconds + 1
        const expandedSkillWindow = Math.min(350, 75 + elapsedSeconds * 12)
        const expandedPingMs = Math.min(current.ticket?.latencyCeilingMs ?? 180, 90 + elapsedSeconds * 4)
        const candidates = Math.min(42, Math.floor(elapsedSeconds * 1.8))
        if (elapsedSeconds >= current.estimatedSeconds) {
          return {
            ...current,
            state: 'found',
            elapsedSeconds,
            candidates: Math.max(2, candidates),
            expandedSkillWindow,
            expandedPingMs,
            message: 'Opponent found. Confirm the ready check.',
          }
        }
        return {
          ...current,
          elapsedSeconds,
          candidates,
          expandedSkillWindow,
          expandedPingMs,
          message: `Searching across ${candidates + 1} compatible players…`,
        }
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [queue.state])

  const updateIdentity = useCallback(async (patch: Partial<OnlineIdentity>) => {
    if (!identity) return
    const next = { ...identity, ...patch }
    next.division = divisionForRating(next.rating).id
    setIdentity(next)
    try {
      await gateway.saveIdentity(next)
      setLeaderboard(await gateway.leaderboard(next))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'identity-save-failed')
    }
  }, [gateway, identity])

  const startQueue = useCallback(async (mode: OnlineModeId) => {
    if (!identity) return
    const config = ONLINE_MODES.find((item) => item.id === mode)
    if (!config) return
    if (identity.fairPlay < 40) {
      setError('Matchmaking is suspended because the fair-play score is below 40.')
      return
    }
    const ticket: MatchmakingTicket = {
      id: uniqueId('ticket'),
      playerId: identity.id,
      mode,
      region: identity.region,
      rating: identity.rating,
      fairPlay: identity.fairPlay,
      createdAt: new Date().toISOString(),
      latencyCeilingMs: config.maxPingMs,
      skillWindow: 75,
      partySize: 1,
    }
    setError(null)
    setQueue({
      state: 'searching', ticket, elapsedSeconds: 0,
      estimatedSeconds: mode === 'club-5v5' ? 18 : mode === 'co-op-2v2' ? 15 : 10,
      candidates: 0, expandedSkillWindow: 75, expandedPingMs: 90,
      message: `Searching for ${config.name}…`,
    })
    try {
      await gateway.enqueue(ticket)
    } catch (caught) {
      setQueue(EMPTY_QUEUE)
      setError(caught instanceof Error ? caught.message : 'matchmaking-failed')
    }
  }, [gateway, identity])

  const cancelQueue = useCallback(async () => {
    if (queue.ticket) await gateway.cancelQueue(queue.ticket.id)
    setQueue(EMPTY_QUEUE)
  }, [gateway, queue.ticket])

  const acceptMatch = useCallback(async () => {
    if (!identity || !queue.ticket) return
    setQueue((current) => ({ ...current, state: 'connecting', message: 'Allocating an authoritative match session…' }))
    const createdRoom = await gateway.createRoom(identity, queue.ticket.mode)
    const opponentRating = Math.max(600, identity.rating + Math.round((Math.random() - 0.5) * queue.expandedSkillWindow))
    createdRoom.participants.push({
      playerId: `matched-${Date.now()}`,
      displayName: 'Matched Walia',
      team: 'away',
      ready: true,
      connected: true,
      latencyMs: Math.round(Math.min(queue.expandedPingMs, 45 + Math.random() * 55)),
      rating: opponentRating,
      fairPlay: 92,
    })
    createdRoom.state = 'ready-check'
    setRoom(createdRoom)
    setQueue((current) => ({ ...current, state: 'ready-check', message: 'Session allocated. Ready check active.' }))
  }, [gateway, identity, queue.expandedPingMs, queue.expandedSkillWindow, queue.ticket])

  const toggleReady = useCallback(() => {
    if (!identity) return
    setRoom((current) => {
      if (!current) return current
      const participants = current.participants.map((participant) => participant.playerId === identity.id ? { ...participant, ready: !participant.ready } : participant)
      return { ...current, participants, state: participants.every((participant) => participant.ready) ? 'playing' : 'ready-check' }
    })
  }, [identity])

  const createPrivateRoom = useCallback(async (mode: OnlineModeId) => {
    if (!identity) return
    setRoom(await gateway.createRoom(identity, mode))
    setQueue(EMPTY_QUEUE)
  }, [gateway, identity])

  const joinPrivateRoom = useCallback(async (code: string) => {
    if (!identity || code.trim().length < 4) return
    try {
      setRoom(await gateway.joinRoom(identity, code.trim().toUpperCase()))
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'room-join-failed')
    }
  }, [gateway, identity])

  const syncCloud = useCallback(async () => {
    if (!identity) return
    setGatewayStatus('syncing')
    const envelope = createCloudEnvelope(identity.id, cloudRevision + 1, deviceId(), localSavePayload())
    try {
      const saved = await gateway.pushCloudSave(envelope)
      setCloudRevision(saved.revision)
      setLastSyncAt(saved.updatedAt)
      setGatewayStatus(gateway.mode === 'cloud' ? 'ready' : 'offline')
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'cloud-save-conflict') setGatewayStatus('conflict')
      else setGatewayStatus('error')
      setError(caught instanceof Error ? caught.message : 'cloud-sync-failed')
    }
  }, [cloudRevision, gateway, identity])

  const snapshot: OnlinePlatformSnapshot | null = identity ? {
    identity,
    gatewayMode: gateway.mode,
    gatewayStatus,
    queue,
    room,
    reconnect: null,
    lastSyncAt,
  } : null

  return {
    snapshot,
    leaderboard: identity ? leaderboard : createLocalLeaderboard({
      id: 'loading', displayName: 'Loading', createdAt: '', region: 'auto', rating: 1000,
      division: 'silver', placementMatchesRemaining: 5, fairPlay: 100, wins: 0, draws: 0, losses: 0, guest: true,
    }),
    liveSeason: LIVE_SEASON,
    liveEvents: LIVE_EVENTS,
    modes: ONLINE_MODES,
    error,
    updateIdentity,
    startQueue,
    cancelQueue,
    acceptMatch,
    toggleReady,
    createPrivateRoom,
    joinPrivateRoom,
    syncCloud,
  }
}
