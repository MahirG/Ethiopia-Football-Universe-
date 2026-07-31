import * as THREE from 'three'
import type { TeamSide } from '../game/types'
import type { PlayerRuntimeState } from '../human/types'
import { HALF_LENGTH, HALF_WIDTH } from '../game/config'
import type { RestartState, TacticalPhase, TacticalPreset, TeamShapeTelemetry } from './types'

const ROLE_LANES: Record<string, number> = {
  goalkeeper: 0,
  'centre-back': 0.22,
  fullback: 0.62,
  midfielder: 0.38,
  winger: 0.78,
  striker: 0.18,
}

export function inferPossession(players: PlayerRuntimeState[], ball: THREE.Vector3): TeamSide | null {
  let best: PlayerRuntimeState | null = null
  let distance = Number.POSITIVE_INFINITY
  for (const player of players) {
    const next = Math.hypot(player.position.x - ball.x, player.position.z - ball.z)
    if (next < distance) { best = player; distance = next }
  }
  return distance < 2.2 ? best?.team ?? null : null
}

export function inferTacticalPhase(team: TeamSide, possession: TeamSide | null, ball: THREE.Vector3, preset: TacticalPreset): TacticalPhase {
  const direction = team === 'home' ? 1 : -1
  const progress = ball.x * direction / HALF_LENGTH
  if (possession === team) {
    if (progress > 0.62) return 'sustained-attack'
    if (preset.tempo > 0.72 && progress > 0.08) return 'counterattack'
    return 'build-up'
  }
  if (preset.pressIntensity > 0.72 && progress > -0.25) return 'high-press'
  if (preset.lineHeight < 0.42 || progress < -0.55) return 'low-block'
  return 'mid-block'
}

export function tacticalAnchor(
  base: THREE.Vector3,
  player: PlayerRuntimeState,
  preset: TacticalPreset,
  phase: TacticalPhase,
  ball: THREE.Vector3,
  restart: RestartState | null,
) {
  const direction = player.team === 'home' ? 1 : -1
  const lane = ROLE_LANES[player.role] ?? 0.4
  const target = base.clone()
  const lineShift = (preset.lineHeight - 0.5) * 18 * direction
  const ballShift = THREE.MathUtils.clamp(ball.x * 0.24, -13, 13)
  const widthScale = THREE.MathUtils.lerp(0.7, 1.18, preset.width)
  target.x += lineShift + ballShift
  target.z *= widthScale
  if (phase === 'high-press') target.x += direction * (5 + preset.pressIntensity * 5)
  if (phase === 'low-block') target.x -= direction * 8
  if (phase === 'counterattack') target.x += direction * 9
  if (phase === 'sustained-attack') target.x += direction * 6
  if (player.role === 'fullback' || player.role === 'winger') {
    target.z += Math.sign(base.z || (player.index % 2 ? 1 : -1)) * lane * preset.width * 3
  }
  if (restart) {
    const distance = player.position.distanceTo(new THREE.Vector3(...restart.position))
    if (restart.team === player.team) {
      const angle = (player.index / 11) * Math.PI * 2
      const radius = restart.type === 'corner' ? 8 + (player.index % 5) * 2.3 : restart.type === 'penalty' ? 16 : 6 + (player.index % 4) * 2
      target.set(restart.position[0] - direction * Math.cos(angle) * radius, base.y, THREE.MathUtils.clamp(restart.position[2] + Math.sin(angle) * radius, -HALF_WIDTH + 2, HALF_WIDTH - 2))
    } else {
      const angle = (player.index / 11) * Math.PI * 2
      const radius = restart.type === 'penalty' ? 13 : 9.15
      target.set(restart.position[0] + direction * Math.cos(angle) * radius, base.y, THREE.MathUtils.clamp(restart.position[2] + Math.sin(angle) * radius, -HALF_WIDTH + 2, HALF_WIDTH - 2))
    }
  }
  target.x = THREE.MathUtils.clamp(target.x, -HALF_LENGTH + 1.2, HALF_LENGTH - 1.2)
  target.z = THREE.MathUtils.clamp(target.z, -HALF_WIDTH + 1.2, HALF_WIDTH - 1.2)
  return target
}

export function measureTeamShape(team: TeamSide, players: PlayerRuntimeState[], phase: TacticalPhase, preset: TacticalPreset): TeamShapeTelemetry {
  const selected = players.filter((player) => player.team === team)
  if (!selected.length) return { phase, lineHeight: preset.lineHeight, width: preset.width, compactness: preset.compactness, pressIntensity: preset.pressIntensity, averageX: 0, averageZ: 0 }
  const averageX = selected.reduce((sum, player) => sum + player.position.x, 0) / selected.length
  const averageZ = selected.reduce((sum, player) => sum + player.position.z, 0) / selected.length
  const spreadX = selected.reduce((sum, player) => sum + Math.abs(player.position.x - averageX), 0) / selected.length
  const spreadZ = selected.reduce((sum, player) => sum + Math.abs(player.position.z - averageZ), 0) / selected.length
  return {
    phase,
    lineHeight: THREE.MathUtils.clamp((averageX * (team === 'home' ? 1 : -1) + HALF_LENGTH) / (HALF_LENGTH * 2), 0, 1),
    width: THREE.MathUtils.clamp(spreadZ / 18, 0, 1),
    compactness: THREE.MathUtils.clamp(1 - (spreadX + spreadZ) / 48, 0, 1),
    pressIntensity: preset.pressIntensity,
    averageX,
    averageZ,
  }
}
