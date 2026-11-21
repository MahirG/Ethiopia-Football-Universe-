import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const path = new URL('../src/input/mobileControlMath.ts', import.meta.url)
const source = readFileSync(path, 'utf8')
const code = ts.transpileModule(source, {
  fileName: 'mobileControlMath.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const exports = {}
runInNewContext(code, { exports, module: { exports } }, { filename: 'mobileControlMath.ts' })
const { normalizeStick, projectTouchStick } = exports
const near = (actual, expected, epsilon = 1e-6) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} !== ${expected}`)

const idle = normalizeStick(0.04, 0.03, 0.1)
assert.equal(idle.magnitude, 0, 'controller drift below radial dead zone must be ignored')
assert.equal(normalizeStick(0, 0, 0.2).magnitude, 0)
const half = normalizeStick(0.55, 0, 0.1)
near(half.magnitude, 0.5)
near(half.z, 0)
const diagonal = normalizeStick(0.5, 0.5, 0.1)
near(diagonal.x, diagonal.z)
assert.ok(diagonal.magnitude > 0.65, 'diagonal movement should not be cut by per-axis dead zones')
const hard = normalizeStick(3, -2, 0.08, 2)
near(hard.magnitude, 1)
near(Math.hypot(hard.x, hard.z), 1)
assert.equal(normalizeStick(NaN, Infinity, NaN).magnitude, 0)

const forward = projectTouchStick(0, -44, 44, 0.08)
near(forward.x, 1)
near(forward.z, 0)
const right = projectTouchStick(44, 0, 44, 0.08)
near(right.x, 0)
near(right.z, 1)
const center = projectTouchStick(2, 2, 44, 0.1)
near(center.magnitude, 0)
const clipped = projectTouchStick(90, 90, 44, 0.08)
assert.ok(Math.hypot(clipped.offsetX, clipped.offsetY) <= 44.00001)
assert.ok(clipped.magnitude <= 1)
near(projectTouchStick(0, -44, 44, 0.1, 0.7).magnitude, 0.7)

const overlay = readFileSync(new URL('../src/input/UniversalControlsOverlay.tsx', import.meta.url), 'utf8')
const input = readFileSync(new URL('../src/input/useUniversalInput.ts', import.meta.url), 'utf8')
const settings = readFileSync(new URL('../src/input/ControlSettingsPanel.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/input/mobile-football.css', import.meta.url), 'utf8')
for (const needle of ['projectTouchStick(', 'subscribeInputDevice(', 'safelyHasPointerCapture',
  'onLostPointerCapture={release}', 'onPointerCancel={release}', 'onKeyDown=', 'aria-pressed={pressed}',
  'onPointerCancel={releasePointer}', 'joystickMode', 'joystickDeadZone']) {
  assert.ok(overlay.includes(needle), 'missing touch handling: ' + needle)
}
assert.ok(input.includes('normalizeStick('), 'Gamepad API must use normalized radial sticks')
assert.ok(input.includes('gamepaddisconnected'), 'Gamepad disconnect must release held actions')
assert.ok(input.includes('visibilitychange'), 'Backgrounding must release input')
assert.ok(!input.includes("tab: 'tactics'"), 'Tab must remain available for focus navigation')
assert.ok(input.includes("m: 'tactics'"), 'A playable tactic shortcut must replace Tab')
assert.ok(settings.includes('Touch dead zone'), 'joystick tuning must be accessible')
assert.ok(styles.includes('safe-area-inset-bottom') && styles.includes('max-width:360px'),
  'touch HUD must handle safe areas and small Android phones')
console.log('EFU Phase 4 controls validated: radial sticks, floating touch, pointer safety, controller disconnect, focus, and mobile HUD.')
