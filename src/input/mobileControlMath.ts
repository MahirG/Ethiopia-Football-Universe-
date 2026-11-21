/** Pure game-input projection shared by touch and Gamepad API controllers.
 * This module deliberately contains no browser API or football match state.
 */

export interface ControlVector {
  x: number
  z: number
  magnitude: number
}
export interface TouchStickResult extends ControlVector {
  offsetX: number
  offsetY: number
}

function safe(value: number) { return Number.isFinite(value) ? value : 0 }
function limit(value: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, value)) }

/** Radial dead zone preserves diagonals and provides full travel at the edge. */
export function normalizeStick(
  horizontal: number,
  vertical: number,
  deadZone: number,
  sensitivity = 1,
): ControlVector {
  const x = safe(horizontal)
  const z = safe(vertical)
  const threshold = limit(safe(deadZone), 0, 0.9)
  const length = Math.hypot(x, z)
  if (length <= threshold) return { x: 0, z: 0, magnitude: 0 }
  const radialMagnitude = limit(((Math.min(1, length) - threshold) / (1 - threshold)) * limit(safe(sensitivity), 0.2, 2), 0, 1)
  return { x: (x / length) * radialMagnitude, z: (z / length) * radialMagnitude, magnitude: radialMagnitude }
}

/** Client pixels to game movement: physical up is positive x, right is positive z. */
export function projectTouchStick(
  displacementX: number,
  displacementY: number,
  radius: number,
  deadZone: number,
  sensitivity = 1,
): TouchStickResult {
  const r = Math.max(1, safe(radius))
  const dx = safe(displacementX)
  const dy = safe(displacementY)
  const length = Math.hypot(dx, dy)
  const factor = length > r ? r / length : 1
  const offsetX = dx * factor
  const offsetY = dy * factor
  const result = normalizeStick(-offsetY / r, offsetX / r, deadZone, sensitivity)
  return { ...result, offsetX, offsetY }
}
