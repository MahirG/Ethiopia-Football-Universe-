import * as THREE from 'three'
import { FORMATION, PLAYER_HEIGHT } from '../game/config'
import type { TeamSide, Weather } from '../game/types'
import { createPlayerProfile } from './profiles'
import { createEmotionalState, createPhysicalState } from './state'
import { createRelationshipMap } from './relationships'
import type { HumanAction, HumanTelemetry, MatchWorldState, PlayerProfile, PlayerRelationship, PlayerRuntimeState } from './types'

export interface HumanWorldBundle {
  world: MatchWorldState
  profiles: Map<string, PlayerProfile>
  telemetry: HumanTelemetry
  relationships: Map<string, PlayerRelationship>
}

export function createHumanWorld(weather: Weather, weatherIntensity: number): HumanWorldBundle {
  const profiles = new Map<string, PlayerProfile>()
  const players: PlayerRuntimeState[] = []

  for (const team of ['home', 'away'] as const) {
    for (let index = 0; index < FORMATION.length; index += 1) {
      const profile = createPlayerProfile(index, team)
      const [anchorX, anchorZ] = FORMATION[index]
      const position = new THREE.Vector3(
        team === 'home' ? anchorX : -anchorX,
        PLAYER_HEIGHT / 2,
        team === 'home' ? anchorZ : -anchorZ,
      )
      profiles.set(profile.id, profile)
      players.push({
        id: profile.id,
        team,
        index,
        role: profile.role,
        position,
        velocity: new THREE.Vector3(),
        facing: team === 'home' ? 0 : Math.PI,
        desiredFacing: team === 'home' ? 0 : Math.PI,
        action: profile.role === 'goalkeeper' ? 'goalkeeper-set' : 'hold',
        actionStartedAt: 0,
        hasBallIntent: false,
        onBall: false,
        offsideRisk: 0,
        nearestOpponentDistance: 30,
        nearestTeammateDistance: 30,
        scanTarget: new THREE.Vector3(),
        emotion: createEmotionalState(profile),
        physical: createPhysicalState(),
      })
    }
  }

  const actionCounts = {} as Record<HumanAction, number>
  const actions: HumanAction[] = ['hold', 'support', 'press', 'mark', 'recover', 'dribble', 'pass', 'shoot', 'clear', 'tackle', 'intercept', 'goalkeeper-set', 'goalkeeper-dive', 'goalkeeper-claim']
  for (const action of actions) actionCounts[action] = 0

  return {
    profiles,
    relationships: createRelationshipMap(profiles.values()),
    world: {
      players,
      ballPosition: new THREE.Vector3(0, 0.28, 0),
      ballVelocity: new THREE.Vector3(),
      matchProgress: 0,
      weather,
      weatherIntensity,
      scoreHome: 0,
      scoreAway: 0,
      eventPulse: 0,
    },
    telemetry: {
      averageFatigue: 0,
      averagePressure: 0,
      activeDecisions: actionCounts,
      footSlipEvents: 0,
      ballContacts: 0,
      mistakes: 0,
      goalkeeperReactionMs: 0,
      maxPlayerSpeed: 0,
    },
  }
}

export function findRuntime(bundle: HumanWorldBundle, team: TeamSide, index: number) {
  return bundle.world.players.find((player) => player.team === team && player.index === index)
}

export function updateHumanTelemetry(bundle: HumanWorldBundle) {
  const { players } = bundle.world
  const counts = bundle.telemetry.activeDecisions
  for (const key of Object.keys(counts) as HumanAction[]) counts[key] = 0
  let fatigue = 0
  let pressure = 0
  let maxSpeed = 0
  for (const player of players) {
    fatigue += player.physical.fatigue
    pressure += player.emotion.pressure
    maxSpeed = Math.max(maxSpeed, player.velocity.length())
    counts[player.action] += 1
  }
  bundle.telemetry.averageFatigue = players.length ? fatigue / players.length : 0
  bundle.telemetry.averagePressure = players.length ? pressure / players.length : 0
  bundle.telemetry.maxPlayerSpeed = maxSpeed
}
