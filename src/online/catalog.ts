import type {
  DivisionId, LeaderboardEntry, LiveCompetitionEvent, LiveSeason,
  OnlineIdentity, OnlineModeConfig, OnlineRegionId, RankedDivision, ServiceRegion,
} from './types'

export const ONLINE_MODES: OnlineModeConfig[] = [
  { id: 'ranked-1v1', name: 'Ranked 1v1', teamSize: 1, ranked: true, crossPlay: true, maxPingMs: 140, reconnectSeconds: 90, description: 'Division football with server-validated results and seasonal rewards.' },
  { id: 'friendly-1v1', name: 'Friendly 1v1', teamSize: 1, ranked: false, crossPlay: true, maxPingMs: 180, reconnectSeconds: 120, description: 'Low-pressure head-to-head football with room-code support.' },
  { id: 'co-op-2v2', name: 'Co-op 2v2', teamSize: 2, ranked: true, crossPlay: true, maxPingMs: 150, reconnectSeconds: 120, description: 'Two-player partnerships with shared tactical responsibility.' },
  { id: 'club-5v5', name: 'Online Clubs 5v5', teamSize: 5, ranked: true, crossPlay: true, maxPingMs: 160, reconnectSeconds: 150, description: 'Persistent club squads, roles, captains and seasonal tables.' },
  { id: 'tournament', name: 'Live Tournament', teamSize: 1, ranked: true, crossPlay: true, maxPingMs: 150, reconnectSeconds: 90, description: 'Scheduled knockout events with eligibility and check-in windows.' },
  { id: 'community-cup', name: 'Community Cup', teamSize: 1, ranked: false, crossPlay: true, maxPingMs: 190, reconnectSeconds: 120, description: 'Moderated regional events for schools, communities and supporters.' },
]

export const SERVICE_REGIONS: ServiceRegion[] = [
  { id: 'auto', name: 'Automatic', location: 'Best available', latencyTargetMs: 90, enabled: true },
  { id: 'addis', name: 'Addis Ababa', location: 'Ethiopia', latencyTargetMs: 45, enabled: false },
  { id: 'east-africa', name: 'East Africa', location: 'Nairobi region', latencyTargetMs: 80, enabled: false },
  { id: 'africa', name: 'Africa', location: 'Regional relay', latencyTargetMs: 120, enabled: false },
  { id: 'middle-east', name: 'Middle East', location: 'Regional relay', latencyTargetMs: 135, enabled: false },
  { id: 'europe', name: 'Europe', location: 'Regional relay', latencyTargetMs: 155, enabled: false },
]

export const RANKED_DIVISIONS: RankedDivision[] = [
  { id: 'walia', name: 'Walia Elite', minimumRating: 1900, promotionWins: 0, color: '#f2c94c' },
  { id: 'premier', name: 'Premier', minimumRating: 1650, promotionWins: 4, color: '#dfe7ef' },
  { id: 'championship', name: 'Championship', minimumRating: 1450, promotionWins: 4, color: '#69c4ff' },
  { id: 'gold', name: 'Gold', minimumRating: 1250, promotionWins: 3, color: '#d6a73c' },
  { id: 'silver', name: 'Silver', minimumRating: 1050, promotionWins: 3, color: '#aeb8c5' },
  { id: 'bronze', name: 'Bronze', minimumRating: 850, promotionWins: 3, color: '#b87745' },
  { id: 'grassroots', name: 'Grassroots', minimumRating: 0, promotionWins: 2, color: '#60bd80' },
]

export const LIVE_SEASON: LiveSeason = {
  id: 'walia-season-01', name: 'Walia Season 01', startsAt: '2026-08-01T00:00:00Z',
  endsAt: '2026-09-30T23:59:59Z', placementMatches: 5, ratingFloor: 600,
  ratingCeiling: 2400, decayAfterInactiveDays: 14, payToWin: false,
}

export const LIVE_EVENTS: LiveCompetitionEvent[] = [
  { id: 'opening-weekend', name: 'Opening Weekend', mode: 'ranked-1v1', startsAt: '2026-08-01T15:00:00Z', endsAt: '2026-08-03T20:00:00Z', minimumFairPlay: 70, minimumMatches: 0 },
  { id: 'regional-community-cup', name: 'Regional Community Cup', mode: 'community-cup', startsAt: '2026-08-15T08:00:00Z', endsAt: '2026-08-16T20:00:00Z', minimumFairPlay: 80, minimumMatches: 3 },
  { id: 'addis-night-series', name: 'Addis Night Series', mode: 'tournament', startsAt: '2026-09-04T17:00:00Z', endsAt: '2026-09-06T21:00:00Z', minimumFairPlay: 85, minimumMatches: 10 },
]

export function divisionForRating(rating: number): RankedDivision {
  return RANKED_DIVISIONS.find((division) => rating >= division.minimumRating) ?? RANKED_DIVISIONS[RANKED_DIVISIONS.length - 1]
}

export function createGuestIdentity(): OnlineIdentity {
  const seed = Math.random().toString(36).slice(2, 8).toUpperCase()
  return {
    id: `guest-${crypto.randomUUID?.() ?? `${Date.now()}-${seed}`}`,
    displayName: `Walia-${seed}`,
    createdAt: new Date().toISOString(),
    region: 'auto',
    rating: 1000,
    division: 'silver',
    placementMatchesRemaining: LIVE_SEASON.placementMatches,
    fairPlay: 100,
    wins: 0,
    draws: 0,
    losses: 0,
    guest: true,
  }
}

const leaderboardNames = ['Aster-11', 'Buna-Captain', 'WaliaNorth', 'HawassaPress', 'Adama10', 'TanaKeeper', 'JimmaCreator', 'DireCounter', 'MekelleWall', 'ArsiRunner']

export function createLocalLeaderboard(identity: OnlineIdentity): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = leaderboardNames.map((displayName, index) => {
    const rating = 2025 - index * 71
    return {
      rank: index + 1,
      playerId: `local-rival-${index + 1}`,
      displayName,
      rating,
      division: divisionForRating(rating).id,
      wins: 34 - index * 2,
      losses: 7 + index,
      fairPlay: 98 - index,
      region: (['addis', 'east-africa', 'africa'] as OnlineRegionId[])[index % 3],
    }
  })
  entries.push({
    rank: entries.length + 1,
    playerId: identity.id,
    displayName: identity.displayName,
    rating: identity.rating,
    division: divisionForRating(identity.rating).id as DivisionId,
    wins: identity.wins,
    losses: identity.losses,
    fairPlay: identity.fairPlay,
    region: identity.region,
  })
  return entries.sort((a, b) => b.rating - a.rating).map((entry, index) => ({ ...entry, rank: index + 1 }))
}
