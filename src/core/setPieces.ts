import type { CorePlayerSnapshot, RestartDecision, TeamSide, Vec3Like } from './types'

export type SetPieceRoutine = 'short' | 'driven' | 'lofted' | 'near-post' | 'far-post' | 'edge-box' | 'decoy' | 'quick' | 'direct' | 'layoff' | 'under-wall' | 'in-swing' | 'out-swing'

export interface SetPieceAssignment {
  playerId: string
  target: Vec3Like
  role: 'taker' | 'primary-target' | 'secondary-target' | 'screen' | 'rebound' | 'rest-defense' | 'marker' | 'wall' | 'keeper'
}

function attackDirection(team: TeamSide) { return team === 'home' ? 1 : -1 }

export class SetPieceManager {
  selectRoutine(restart: RestartDecision, scoreDifference: number, matchMinute: number, pressure: number): SetPieceRoutine {
    if (restart.type === 'kickoff') return matchMinute > 80 && scoreDifference < 0 ? 'quick' : 'short'
    if (restart.type === 'throw-in') return pressure > 0.65 ? 'quick' : 'short'
    if (restart.type === 'corner') return pressure > 0.68 ? 'short' : Math.abs(restart.location.z) > 30 ? 'in-swing' : 'out-swing'
    if (restart.type === 'direct-free-kick') return Math.abs(restart.location.x) > 34 ? 'direct' : 'lofted'
    if (restart.type === 'indirect-free-kick') return 'layoff'
    if (restart.type === 'penalty') return 'direct'
    return 'short'
  }

  buildAssignments(restart: RestartDecision, routine: SetPieceRoutine, players: CorePlayerSnapshot[]): SetPieceAssignment[] {
    if (!restart.team) return []
    const ours = players.filter((player) => player.team === restart.team)
    const theirs = players.filter((player) => player.team !== restart.team)
    const direction = attackDirection(restart.team)
    const taker = [...ours].sort((a, b) => Math.hypot(a.position.x - restart.location.x, a.position.z - restart.location.z) - Math.hypot(b.position.x - restart.location.x, b.position.z - restart.location.z))[0]
    const assignments: SetPieceAssignment[] = []
    if (taker) assignments.push({ playerId: taker.id, target: restart.location, role: 'taker' })
    const targets = ours.filter((player) => player.id !== taker?.id && player.role !== 'goalkeeper')
    for (const [index, player] of targets.entries()) {
      const role: SetPieceAssignment['role'] = index < 2 ? 'primary-target' : index < 4 ? 'secondary-target' : index < 6 ? 'rebound' : 'rest-defense'
      const baseX = restart.type === 'corner' ? direction * (52.5 - 6 - index * 1.2) : restart.location.x + direction * (5 + index * 2)
      const baseZ = routine === 'near-post' ? Math.sign(restart.location.z || 1) * (3 + index) : routine === 'far-post' ? -Math.sign(restart.location.z || 1) * (2 + index) : (index - 4) * 2.6
      assignments.push({ playerId: player.id, target: { x: baseX, y: 0, z: Math.max(-31, Math.min(31, baseZ)) }, role })
    }
    if (restart.type === 'direct-free-kick' || restart.type === 'indirect-free-kick') {
      for (const [index, player] of theirs.filter((candidate) => candidate.role !== 'goalkeeper').slice(0, 5).entries()) {
        assignments.push({ playerId: player.id, target: { x: restart.location.x + direction * 9.15, y: 0, z: restart.location.z + (index - 2) * 0.72 }, role: 'wall' })
      }
    }
    return assignments
  }
}
