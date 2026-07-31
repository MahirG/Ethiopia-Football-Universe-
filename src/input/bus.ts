import type { ControlSettings, FootballInputAction, InputDeviceKind, MovementInput } from './types'

const STORAGE_KEY = 'efu-universal-control-settings-v1'

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  preset: 'classic',
  leftHanded: false,
  joystickMode: 'fixed',
  touchScale: 1,
  touchOpacity: 0.78,
  touchSensitivity: 1,
  gamepadDeadZone: 0.16,
  gamepadSensitivity: 1,
  haptics: true,
  showTouchControls: 'auto',
}

interface VirtualInputSnapshot {
  move: MovementInput
  held: Set<FootballInputAction>
  pressed: Set<FootballInputAction>
  released: Set<FootballInputAction>
}

const virtualInput: VirtualInputSnapshot = {
  move: { x: 0, z: 0, magnitude: 0 },
  held: new Set(),
  pressed: new Set(),
  released: new Set(),
}

let activeDevice: InputDeviceKind = 'unknown'
let settings = loadStoredSettings()
const deviceListeners = new Set<(device: InputDeviceKind) => void>()
const settingsListeners = new Set<(next: ControlSettings) => void>()
const actionListeners = new Set<(action: FootballInputAction) => void>()

function loadStoredSettings(): ControlSettings {
  if (typeof window === 'undefined') return DEFAULT_CONTROL_SETTINGS
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<ControlSettings>
    return { ...DEFAULT_CONTROL_SETTINGS, ...stored }
  } catch {
    return DEFAULT_CONTROL_SETTINGS
  }
}

export function markActiveInputDevice(device: InputDeviceKind) {
  if (activeDevice === device) return
  activeDevice = device
  deviceListeners.forEach((listener) => listener(device))
}

export function getActiveInputDevice() {
  return activeDevice
}

export function subscribeInputDevice(listener: (device: InputDeviceKind) => void) {
  deviceListeners.add(listener)
  return () => { deviceListeners.delete(listener) }
}

export function getControlSettings() {
  return settings
}

export function updateControlSettings(patch: Partial<ControlSettings>) {
  settings = { ...settings, ...patch }
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  settingsListeners.forEach((listener) => listener(settings))
  return settings
}

export function resetControlSettings() {
  settings = DEFAULT_CONTROL_SETTINGS
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY)
  settingsListeners.forEach((listener) => listener(settings))
  return settings
}

export function subscribeControlSettings(listener: (next: ControlSettings) => void) {
  settingsListeners.add(listener)
  return () => { settingsListeners.delete(listener) }
}


export function publishFootballAction(action: FootballInputAction) {
  actionListeners.forEach((listener) => listener(action))
}

export function subscribeFootballAction(listener: (action: FootballInputAction) => void) {
  actionListeners.add(listener)
  return () => { actionListeners.delete(listener) }
}

export function setVirtualMovement(x: number, z: number) {
  const rawMagnitude = Math.hypot(x, z)
  const magnitude = Math.min(1, rawMagnitude)
  virtualInput.move = rawMagnitude > 0 ? { x: (x / rawMagnitude) * magnitude, z: (z / rawMagnitude) * magnitude, magnitude } : { x: 0, z: 0, magnitude: 0 }
  if (magnitude > 0.02) markActiveInputDevice('touch')
}

export function setVirtualAction(action: FootballInputAction, down: boolean) {
  if (down) {
    if (!virtualInput.held.has(action)) virtualInput.pressed.add(action)
    virtualInput.held.add(action)
    markActiveInputDevice('touch')
  } else {
    if (virtualInput.held.has(action)) virtualInput.released.add(action)
    virtualInput.held.delete(action)
  }
}

export function consumeVirtualInput(): VirtualInputSnapshot {
  const snapshot = {
    move: { ...virtualInput.move },
    held: new Set(virtualInput.held),
    pressed: new Set(virtualInput.pressed),
    released: new Set(virtualInput.released),
  }
  virtualInput.pressed.clear()
  virtualInput.released.clear()
  return snapshot
}

export function releaseAllVirtualInput() {
  virtualInput.held.forEach((action) => virtualInput.released.add(action))
  virtualInput.held.clear()
  virtualInput.move = { x: 0, z: 0, magnitude: 0 }
}

export function pulseHaptic(duration = 12) {
  if (!settings.haptics || typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  navigator.vibrate(duration)
}
