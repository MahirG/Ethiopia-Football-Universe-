import type { CoreFrameInput, CoreTelemetry, Vec3Like } from './types'

export interface CoreDebugFrame {
  ballVelocity: Vec3Like
  ballSpin: Vec3Like
  possessionRadius: number
  offsideLines: { home: number; away: number }
  tacticalZones: Array<{ team: 'home' | 'away'; center: Vec3Like; width: number; depth: number }>
  playerIntentions: Array<{ id: string; action: string; fatigue: number; balance: number }>
  network: { sequence: number; corrections: number; rejectedInputs: number }
  surface: { grip: number; wetness: number; rollingResistance: number }
}

export function createDebugFrame(frame: CoreFrameInput, telemetry: CoreTelemetry): CoreDebugFrame {
  return {
    ballVelocity: { ...frame.ball.velocity },
    ballSpin: { ...frame.ball.angularVelocity },
    possessionRadius: 3.1,
    offsideLines: { home: telemetry.offsideLineHome, away: telemetry.offsideLineAway },
    tacticalZones: [
      { team: 'home', center: { x: telemetry.homeTactics.lineHeight * 30 - 15, y: 0, z: 0 }, width: telemetry.homeTactics.width * 68, depth: telemetry.homeTactics.depth * 52.5 },
      { team: 'away', center: { x: 15 - telemetry.awayTactics.lineHeight * 30, y: 0, z: 0 }, width: telemetry.awayTactics.width * 68, depth: telemetry.awayTactics.depth * 52.5 },
    ],
    playerIntentions: frame.players.map((player) => ({ id: player.id, action: player.action, fatigue: player.fatigue, balance: player.balance })),
    network: { sequence: telemetry.authoritativeSequence, corrections: telemetry.networkCorrections, rejectedInputs: telemetry.rejectedInputs },
    surface: { grip: frame.surface.grip, wetness: frame.surface.wetness, rollingResistance: frame.surface.rollingResistance },
  }
}
