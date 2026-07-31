import { useEffect, useRef } from 'react'
import { consumeVirtualInput, getControlSettings, markActiveInputDevice, publishFootballAction, releaseAllVirtualInput } from './bus'
import type { FootballInputAction, UniversalInputState } from './types'

const PREVENT_DEFAULT_KEYS = new Set([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'])

const KEYBOARD_BINDINGS: Partial<Record<string, FootballInputAction>> = {
  shift: 'sprint',
  control: 'controlled-sprint',
  c: 'shield',
  e: 'pass',
  t: 'through-pass',
  q: 'lob-pass',
  ' ': 'shoot',
  alt: 'finesse',
  f: 'tackle',
  g: 'chip',
  b: 'skill',
  v: 'slide-tackle',
  r: 'player-switch',
  x: 'cancel',
  z: 'manual-control',
  escape: 'pause',
  tab: 'tactics',
}

function emptyState(): UniversalInputState {
  return {
    move: { x: 0, z: 0, magnitude: 0 },
    held: new Set(),
    pressed: new Set(),
    released: new Set(),
    holdDurations: new Map(),
    lastHoldDurations: new Map(),
    rawKeys: new Set(),
    activeDevice: 'unknown',
    connectedGamepad: null,
    lastInputAt: 0,
  }
}

function applyDeadZone(value: number, deadZone: number) {
  const absolute = Math.abs(value)
  if (absolute <= deadZone) return 0
  return Math.sign(value) * Math.min(1, (absolute - deadZone) / (1 - deadZone))
}

export function useUniversalInput() {
  const state = useRef<UniversalInputState>(emptyState())
  const keyboardHeld = useRef(new Set<FootballInputAction>())
  const mouseHeld = useRef(new Set<FootballInputAction>())
  const transientPressed = useRef(new Set<FootballInputAction>())
  const transientReleased = useRef(new Set<FootballInputAction>())
  const gamepadPrevious = useRef(new Set<FootballInputAction>())
  useEffect(() => {
    let frame = 0
    let previousTime = performance.now()
    const setKeyboardAction = (key: string, down: boolean) => {
      const action = KEYBOARD_BINDINGS[key]
      if (!action) return
      const target = keyboardHeld.current
      if (down) {
        if (!target.has(action)) transientPressed.current.add(action)
        target.add(action)
      } else {
        if (target.has(action)) transientReleased.current.add(action)
        target.delete(action)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!event.repeat) {
        state.current.rawKeys.add(key)
        setKeyboardAction(key, true)
        markActiveInputDevice('keyboard')
      }
      if (PREVENT_DEFAULT_KEYS.has(key)) event.preventDefault()
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      state.current.rawKeys.delete(key)
      setKeyboardAction(key, false)
    }
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target?.closest('.game-shell-3d')) return
      const action: FootballInputAction | null = event.button === 0 ? 'shoot' : event.button === 2 ? 'shield' : event.button === 3 ? 'sprint' : event.button === 4 ? 'player-switch' : null
      if (!action) return
      event.preventDefault()
      if (!mouseHeld.current.has(action)) transientPressed.current.add(action)
      mouseHeld.current.add(action)
      markActiveInputDevice('mouse')
    }
    const onMouseUp = (event: MouseEvent) => {
      const action: FootballInputAction | null = event.button === 0 ? 'shoot' : event.button === 2 ? 'shield' : event.button === 3 ? 'sprint' : event.button === 4 ? 'player-switch' : null
      if (!action) return
      if (mouseHeld.current.has(action)) transientReleased.current.add(action)
      mouseHeld.current.delete(action)
    }
    const onContextMenu = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('.game-shell-3d')) event.preventDefault()
    }
    const onBlur = () => {
      state.current.rawKeys.clear()
      keyboardHeld.current.forEach((action) => transientReleased.current.add(action))
      mouseHeld.current.forEach((action) => transientReleased.current.add(action))
      keyboardHeld.current.clear()
      mouseHeld.current.clear()
      gamepadPrevious.current.clear()
      releaseAllVirtualInput()
    }
    const onTouch = () => markActiveInputDevice('touch')
    const onGamepad = () => markActiveInputDevice('gamepad')

    window.addEventListener('keydown', onKeyDown, { passive: false })
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousedown', onMouseDown, { passive: false })
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('blur', onBlur)
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('gamepadconnected', onGamepad)

    const update = (now: number) => {
      const delta = Math.min(0.1, Math.max(0, (now - previousTime) / 1000))
      previousTime = now
      const settings = getControlSettings()
      const virtual = consumeVirtualInput()
      const gamepadHeld = new Set<FootballInputAction>()
      let gamepadMove = { x: 0, z: 0, magnitude: 0 }
      let connectedGamepad: string | null = null
      const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
      const pad = Array.from(pads).find((item): item is Gamepad => Boolean(item?.connected))
      if (pad) {
        connectedGamepad = pad.id
        const x = applyDeadZone(-(pad.axes[1] ?? 0), settings.gamepadDeadZone) * settings.gamepadSensitivity
        const z = applyDeadZone(pad.axes[0] ?? 0, settings.gamepadDeadZone) * settings.gamepadSensitivity
        const rawMagnitude = Math.hypot(x, z)
        const magnitude = Math.min(1, rawMagnitude)
        gamepadMove = rawMagnitude > 0 ? { x: (x / rawMagnitude) * magnitude, z: (z / rawMagnitude) * magnitude, magnitude } : { x: 0, z: 0, magnitude: 0 }
        const button = (index: number) => (pad.buttons[index]?.value ?? 0) > 0.45
        if (button(0)) gamepadHeld.add('pass')
        if (button(1)) gamepadHeld.add('shoot')
        if (button(2)) gamepadHeld.add('through-pass')
        if (button(3)) gamepadHeld.add('lob-pass')
        if (button(4)) gamepadHeld.add('player-switch')
        if (button(5)) gamepadHeld.add('controlled-sprint')
        if (button(6)) gamepadHeld.add('shield')
        if (button(7)) gamepadHeld.add('sprint')
        if (button(8)) gamepadHeld.add('tactics')
        if (button(9)) gamepadHeld.add('pause')
        if (button(10)) gamepadHeld.add('manual-control')
        if (button(11)) gamepadHeld.add('skill')
        if (button(12)) gamepadHeld.add('finesse')
        if (button(13)) gamepadHeld.add('chip')
        if (button(14)) gamepadHeld.add('tackle')
        if (button(15)) gamepadHeld.add('slide-tackle')
        const gamepadActive = magnitude > 0.04 || pad.buttons.some((item) => item.pressed)
        if (gamepadActive) markActiveInputDevice('gamepad')
      }
      gamepadHeld.forEach((action) => {
        if (!gamepadPrevious.current.has(action)) transientPressed.current.add(action)
      })
      gamepadPrevious.current.forEach((action) => {
        if (!gamepadHeld.has(action)) transientReleased.current.add(action)
      })
      gamepadPrevious.current = gamepadHeld

      const keyboardX = Number(state.current.rawKeys.has('w') || state.current.rawKeys.has('arrowup')) - Number(state.current.rawKeys.has('s') || state.current.rawKeys.has('arrowdown'))
      const keyboardZ = Number(state.current.rawKeys.has('d') || state.current.rawKeys.has('arrowright')) - Number(state.current.rawKeys.has('a') || state.current.rawKeys.has('arrowleft'))
      const keyboardMagnitude = Math.min(1, Math.hypot(keyboardX, keyboardZ))
      const keyboardMove = keyboardMagnitude > 0 ? { x: keyboardX / keyboardMagnitude, z: keyboardZ / keyboardMagnitude, magnitude: 1 } : { x: 0, z: 0, magnitude: 0 }
      if (keyboardMagnitude > 0) markActiveInputDevice('keyboard')

      const nextHeld = new Set<FootballInputAction>([...keyboardHeld.current, ...mouseHeld.current, ...gamepadHeld, ...virtual.held])
      virtual.pressed.forEach((action) => transientPressed.current.add(action))
      virtual.released.forEach((action) => transientReleased.current.add(action))
      nextHeld.forEach((action) => state.current.holdDurations.set(action, (state.current.holdDurations.get(action) ?? 0) + delta))
      transientReleased.current.forEach((action) => {
        state.current.lastHoldDurations.set(action, state.current.holdDurations.get(action) ?? 0)
        state.current.holdDurations.delete(action)
      })

      const activeDevice = virtual.move.magnitude > 0.02 || virtual.held.size > 0
        ? 'touch'
        : gamepadMove.magnitude > 0.02 || gamepadHeld.size > 0
          ? 'gamepad'
          : keyboardMove.magnitude > 0.02 || keyboardHeld.current.size > 0
            ? 'keyboard'
            : state.current.activeDevice
      const move = activeDevice === 'touch' ? virtual.move : activeDevice === 'gamepad' ? gamepadMove : keyboardMove
      state.current.move = move
      state.current.held = nextHeld
      transientPressed.current.forEach((action) => {
        state.current.pressed.add(action)
        publishFootballAction(action)
      })
      transientReleased.current.forEach((action) => state.current.released.add(action))
      state.current.activeDevice = activeDevice
      state.current.connectedGamepad = connectedGamepad
      if (move.magnitude > 0.02 || nextHeld.size > 0 || transientPressed.current.size > 0 || transientReleased.current.size > 0) state.current.lastInputAt = now
      transientPressed.current.clear()
      transientReleased.current.clear()
      frame = window.requestAnimationFrame(update)
    }
    frame = window.requestAnimationFrame(update)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('gamepadconnected', onGamepad)
    }
  }, [])
  return state
}
