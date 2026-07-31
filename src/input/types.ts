export type InputDeviceKind = 'keyboard' | 'mouse' | 'gamepad' | 'touch' | 'unknown'

export type FootballInputAction =
  | 'sprint'
  | 'controlled-sprint'
  | 'shield'
  | 'pass'
  | 'through-pass'
  | 'lob-pass'
  | 'shoot'
  | 'finesse'
  | 'chip'
  | 'skill'
  | 'press'
  | 'tackle'
  | 'slide-tackle'
  | 'jockey'
  | 'player-switch'
  | 'cancel'
  | 'manual-control'
  | 'pause'
  | 'tactics'

export type ControlPresetId = 'classic' | 'modern' | 'competitive' | 'mobile-simple' | 'mobile-advanced' | 'one-handed'
export type JoystickMode = 'fixed' | 'floating'

export interface ControlSettings {
  preset: ControlPresetId
  leftHanded: boolean
  joystickMode: JoystickMode
  touchScale: number
  touchOpacity: number
  touchSensitivity: number
  gamepadDeadZone: number
  gamepadSensitivity: number
  haptics: boolean
  showTouchControls: 'auto' | 'always' | 'never'
}

export interface MovementInput {
  x: number
  z: number
  magnitude: number
}

export interface UniversalInputState {
  move: MovementInput
  held: Set<FootballInputAction>
  pressed: Set<FootballInputAction>
  released: Set<FootballInputAction>
  holdDurations: Map<FootballInputAction, number>
  lastHoldDurations: Map<FootballInputAction, number>
  rawKeys: Set<string>
  activeDevice: InputDeviceKind
  connectedGamepad: string | null
  lastInputAt: number
}
