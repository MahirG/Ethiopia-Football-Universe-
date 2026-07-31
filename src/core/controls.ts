import type { AssistLevel, InputDevice, Vec3Like } from './types'

export interface RawControlInput {
  moveX: number
  moveY: number
  aimX: number
  aimY: number
  power: number
  sprint: boolean
  modifier: boolean
}

function deadzone(value: number, threshold: number) {
  if (Math.abs(value) <= threshold) return 0
  return Math.sign(value) * (Math.abs(value) - threshold) / (1 - threshold)
}

export function normalizeControlInput(input: RawControlInput, device: InputDevice) {
  const threshold = device === 'touch' ? 0.08 : device === 'gamepad' || device === 'handheld' ? 0.12 : 0
  const moveX = deadzone(Math.max(-1, Math.min(1, input.moveX)), threshold)
  const moveY = deadzone(Math.max(-1, Math.min(1, input.moveY)), threshold)
  const length = Math.hypot(moveX, moveY)
  return {
    move: length > 1 ? { x: moveX / length, y: moveY / length } : { x: moveX, y: moveY },
    aim: { x: Math.max(-1, Math.min(1, input.aimX)), y: Math.max(-1, Math.min(1, input.aimY)) },
    power: Math.max(0, Math.min(1, input.power)), sprint: input.sprint, modifier: input.modifier,
  }
}

export function assistedTarget(userDirection: Vec3Like, candidates: Array<{ id: string; direction: Vec3Like; lane: number; tacticalValue: number; offsideRisk: number }>, level: AssistLevel) {
  if (level === 'manual' || !candidates.length) return null
  const userLength = Math.hypot(userDirection.x, userDirection.z) || 1
  const weight = level === 'full' ? 0.56 : level === 'assisted' ? 0.4 : 0.22
  return [...candidates].sort((a, b) => {
    const score = (candidate: typeof a) => {
      const candidateLength = Math.hypot(candidate.direction.x, candidate.direction.z) || 1
      const alignment = (candidate.direction.x * userDirection.x + candidate.direction.z * userDirection.z) / (candidateLength * userLength)
      return alignment * (1 - weight) + candidate.lane * weight * 0.45 + candidate.tacticalValue * weight * 0.35 - candidate.offsideRisk * 0.28
    }
    return score(b) - score(a)
  })[0]?.id ?? null
}
