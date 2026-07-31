export type SimulationBand = 'high' | 'medium' | 'low'

export interface SimulationBudget {
  ballHz: number
  localPlayerHz: number
  collisionHz: number
  nearbyAiHz: number
  distantAiHz: number
  crowdHz: number
  replayHz: number
}

export const SIMULATION_BUDGETS: Record<'mobile-30' | 'mobile-60' | 'desktop-60' | 'desktop-120', SimulationBudget> = {
  'mobile-30': { ballHz: 60, localPlayerHz: 60, collisionHz: 60, nearbyAiHz: 15, distantAiHz: 5, crowdHz: 4, replayHz: 30 },
  'mobile-60': { ballHz: 120, localPlayerHz: 120, collisionHz: 120, nearbyAiHz: 20, distantAiHz: 8, crowdHz: 6, replayHz: 60 },
  'desktop-60': { ballHz: 120, localPlayerHz: 120, collisionHz: 120, nearbyAiHz: 30, distantAiHz: 10, crowdHz: 8, replayHz: 60 },
  'desktop-120': { ballHz: 240, localPlayerHz: 240, collisionHz: 240, nearbyAiHz: 40, distantAiHz: 15, crowdHz: 10, replayHz: 120 },
}

export class RelevanceScheduler {
  private readonly lastUpdate = new Map<string, number>()
  shouldUpdate(id: string, now: number, band: SimulationBand, budget: SimulationBudget) {
    const hz = band === 'high' ? budget.nearbyAiHz : band === 'medium' ? budget.distantAiHz : Math.max(2, budget.distantAiHz / 2)
    const last = this.lastUpdate.get(id) ?? -Infinity
    if (now - last < 1 / hz) return false
    this.lastUpdate.set(id, now)
    return true
  }
}
