import type { CoreStatistics, MatchEvent, TeamSide, TeamStatistics, Vec3Like } from './types'

function teamStats(): TeamStatistics {
  return { shots: 0, shotsOnTarget: 0, xg: 0, passes: 0, completedPasses: 0, progressivePasses: 0, crosses: 0, tackles: 0, interceptions: 0, blocks: 0, saves: 0, fouls: 0, yellowCards: 0, redCards: 0, offsides: 0, corners: 0, recoveries: 0, pressingActions: 0, duels: 0, aerialDuels: 0 }
}

export function createStatistics(): CoreStatistics {
  return { home: teamStats(), away: teamStats(), possessionSeconds: { home: 0, away: 0, contested: 0 }, ballInPlaySeconds: 0, stoppageSeconds: 0 }
}

function target(stats: CoreStatistics, team: TeamSide) { return team === 'home' ? stats.home : stats.away }

export function calculateExpectedGoals(position: Vec3Like, bodyPart: 'foot' | 'head' | 'other', pressure: number, goalkeeperOffset: number, assistType: 'open-play' | 'cross' | 'through-ball' | 'set-piece' | 'penalty') {
  if (assistType === 'penalty') return 0.76
  const goalX = position.x >= 0 ? 52.5 : -52.5
  const distance = Math.hypot(goalX - position.x, position.z)
  const angle = Math.atan2(7.32, Math.max(0.8, distance))
  const body = bodyPart === 'foot' ? 1 : bodyPart === 'head' ? 0.72 : 0.5
  const assist = assistType === 'through-ball' ? 1.12 : assistType === 'cross' ? 0.82 : assistType === 'set-piece' ? 0.76 : 1
  const value = (1 / (1 + Math.exp((distance - 15.5) / 4.2))) * (0.48 + angle * 0.85) * body * assist * (1 - pressure * 0.46) * (1 + goalkeeperOffset * 0.16)
  return Math.max(0.005, Math.min(0.95, value))
}

export class MatchStatisticsRecorder {
  readonly statistics = createStatistics()
  private readonly highlights: MatchEvent[] = []
  private readonly replayFrames: Array<{ time: number; ball: Vec3Like; players: Array<{ id: string; position: Vec3Like }> }> = []

  tick(delta: number, possession: TeamSide | null, contested: boolean, inPlay: boolean) {
    if (inPlay) this.statistics.ballInPlaySeconds += delta
    else this.statistics.stoppageSeconds += delta
    if (contested) this.statistics.possessionSeconds.contested += delta
    else if (possession) this.statistics.possessionSeconds[possession] += delta
  }

  recordAction(team: TeamSide, action: 'shot' | 'shot-on-target' | 'pass' | 'completed-pass' | 'progressive-pass' | 'cross' | 'tackle' | 'interception' | 'block' | 'save' | 'foul' | 'yellow' | 'red' | 'offside' | 'corner' | 'recovery' | 'press' | 'duel' | 'aerial-duel', value = 1) {
    const stats = target(this.statistics, team)
    const map: Record<typeof action, keyof TeamStatistics> = {
      shot: 'shots', 'shot-on-target': 'shotsOnTarget', pass: 'passes', 'completed-pass': 'completedPasses', 'progressive-pass': 'progressivePasses', cross: 'crosses', tackle: 'tackles', interception: 'interceptions', block: 'blocks', save: 'saves', foul: 'fouls', yellow: 'yellowCards', red: 'redCards', offside: 'offsides', corner: 'corners', recovery: 'recoveries', press: 'pressingActions', duel: 'duels', 'aerial-duel': 'aerialDuels',
    }
    stats[map[action]] += value
  }

  recordShot(team: TeamSide, xg: number, onTarget: boolean) {
    const stats = target(this.statistics, team)
    stats.shots += 1
    stats.xg += xg
    if (onTarget) stats.shotsOnTarget += 1
  }

  captureFrame(time: number, ball: Vec3Like, players: Array<{ id: string; position: Vec3Like }>) {
    this.replayFrames.push({ time, ball: { ...ball }, players: players.map((player) => ({ id: player.id, position: { ...player.position } })) })
    if (this.replayFrames.length > 900) this.replayFrames.shift()
  }

  considerHighlight(event: MatchEvent, importance: number) {
    if (importance < 0.5) return
    this.highlights.push(event)
    this.highlights.sort((a, b) => Number((b.data.importance ?? 0)) - Number((a.data.importance ?? 0)))
    if (this.highlights.length > 32) this.highlights.length = 32
  }

  getHighlights() { return [...this.highlights] }
  getReplayFrames() { return [...this.replayFrames] }
}
