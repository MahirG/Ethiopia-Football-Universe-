import type { MatchWorldState, WorldNetworkSnapshot } from './types'

export function createWorldSnapshot(world: MatchWorldState, tick: number, screenEvent: string): WorldNetworkSnapshot {
  return {
    tick,
    competitionId: world.competition.id,
    venueId: world.venue.id,
    ballId: world.ball.id,
    weather: world.weather,
    weatherIntensity: world.weatherIntensity,
    matchMinute: world.matchMinute,
    pitch: {
      moisture: world.pitch.moisture,
      grip: world.pitch.grip,
      rollingResistance: world.pitch.rollingResistance,
      bounce: world.pitch.bounce,
      lineWear: world.pitch.lineWear,
      divots: world.pitch.divots,
    },
    crowd: {
      mood: world.crowd.mood,
      tension: world.crowd.tension,
      homeEnergy: world.crowd.homeEnergy,
      awayEnergy: world.crowd.awayEnergy,
      leavingRatio: world.crowd.leavingRatio,
    },
    ceremony: { active: world.ceremony.active, stage: world.ceremony.stage },
    screenEvent,
    eventId: `${tick}-${world.competition.id}-${world.matchMinute.toFixed(2)}`,
    authoritative: ['ball', 'clock', 'pitch', 'weather', 'decisions', 'screens', 'ceremony'],
    localOnly: ['crowd-animation', 'flags', 'vendors', 'ambient-traffic'],
  }
}

export function interpolateWorldSnapshot(previous: WorldNetworkSnapshot, next: WorldNetworkSnapshot, alpha: number): WorldNetworkSnapshot {
  const mix = (a: number, b: number) => a + (b - a) * Math.min(1, Math.max(0, alpha))
  return {
    ...next,
    matchMinute: mix(previous.matchMinute, next.matchMinute),
    weatherIntensity: mix(previous.weatherIntensity, next.weatherIntensity),
    pitch: {
      moisture: mix(previous.pitch.moisture, next.pitch.moisture),
      grip: mix(previous.pitch.grip, next.pitch.grip),
      rollingResistance: mix(previous.pitch.rollingResistance, next.pitch.rollingResistance),
      bounce: mix(previous.pitch.bounce, next.pitch.bounce),
      lineWear: mix(previous.pitch.lineWear, next.pitch.lineWear),
      divots: mix(previous.pitch.divots, next.pitch.divots),
    },
    crowd: {
      mood: mix(previous.crowd.mood, next.crowd.mood),
      tension: mix(previous.crowd.tension, next.crowd.tension),
      homeEnergy: mix(previous.crowd.homeEnergy, next.crowd.homeEnergy),
      awayEnergy: mix(previous.crowd.awayEnergy, next.crowd.awayEnergy),
      leavingRatio: mix(previous.crowd.leavingRatio, next.crowd.leavingRatio),
    },
  }
}
