import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { getActiveInputDevice, getControlSettings, pulseHaptic, releaseAllVirtualInput, setVirtualAction, setVirtualMovement, subscribeControlSettings, subscribeInputDevice } from './bus'
import { projectTouchStick } from './mobileControlMath'
import type { ControlSettings, FootballInputAction } from './types'

interface UniversalControlsOverlayProps {
  enabled: boolean
}

interface ActionButtonProps {
  action: FootballInputAction
  label: string
  className?: string
}

function safelyHasPointerCapture(element: HTMLElement, pointerId: number) {
  try {
    return typeof element.hasPointerCapture === 'function' && element.hasPointerCapture(pointerId)
  } catch {
    return false
  }
}

function safelyCapturePointer(element: HTMLElement, pointerId: number) {
  try {
    if (typeof element.setPointerCapture !== 'function') return false
    element.setPointerCapture(pointerId)
    return safelyHasPointerCapture(element, pointerId)
  } catch {
    return false
  }
}

function safelyReleasePointer(element: HTMLElement, pointerId: number) {
  try {
    if (safelyHasPointerCapture(element, pointerId) && typeof element.releasePointerCapture === 'function') {
      element.releasePointerCapture(pointerId)
    }
  } catch {
    // Some Android WebViews drop capture before pointerup reaches React.
  }
}

/** Every action owns its pointer. A second finger cannot cancel a held shot. */
function ActionButton({ action, label, className = '' }: ActionButtonProps) {
  const activePointer = useRef<number | null>(null)
  const keyboardPressed = useRef(false)
  const [pressed, setPressed] = useState(false)
  const release = (event?: ReactPointerEvent<HTMLButtonElement>) => {
    if (event && activePointer.current !== event.pointerId) return
    if (!event && activePointer.current === null && !keyboardPressed.current) return
    event?.preventDefault()
    event?.stopPropagation()
    if (event) safelyReleasePointer(event.currentTarget, event.pointerId)
    activePointer.current = null
    keyboardPressed.current = false
    setPressed(false)
    setVirtualAction(action, false)
  }
  useEffect(() => {
    const reset = () => {
      activePointer.current = null
      keyboardPressed.current = false
      setPressed(false)
      setVirtualAction(action, false)
    }
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('blur', reset)
      setVirtualAction(action, false)
    }
  }, [action])

  return (
    <button
      className={`${className} ${pressed ? 'is-pressed' : ''}`}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      draggable={false}
      onPointerDown={(event) => {
        if (activePointer.current !== null) return
        event.preventDefault()
        event.stopPropagation()
        activePointer.current = event.pointerId
        setPressed(true)
        // Start the action even if an older Android WebView refuses capture.
        setVirtualAction(action, true)
        safelyCapturePointer(event.currentTarget, event.pointerId)
        pulseHaptic(action === 'shoot' || action === 'tackle' ? 18 : 10)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onPointerLeave={(event) => {
        if (activePointer.current === event.pointerId && !safelyHasPointerCapture(event.currentTarget, event.pointerId)) release(event)
      }}
      onKeyDown={(event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return
        event.preventDefault()
        event.stopPropagation()
        if (event.repeat || keyboardPressed.current || activePointer.current !== null) return
        keyboardPressed.current = true
        setPressed(true)
        setVirtualAction(action, true)
      }}
      onKeyUp={(event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return
        event.preventDefault()
        event.stopPropagation()
        if (keyboardPressed.current) release()
      }}
      onBlur={() => { if (keyboardPressed.current) release() }}
      onClick={(event) => { event.preventDefault(); event.stopPropagation() }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {label}
    </button>
  )
}

export function UniversalControlsOverlay({ enabled }: UniversalControlsOverlayProps) {
  const [settings, setSettings] = useState<ControlSettings>(() => getControlSettings())
  const [activeDevice, setActiveDevice] = useState(() => getActiveInputDevice())
  const padRef = useRef<HTMLDivElement>(null)
  const activePointer = useRef<number | null>(null)
  const joystickOrigin = useRef({ x: 0, y: 0 })
  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false })

  useEffect(() => subscribeControlSettings(setSettings), [])
  useEffect(() => subscribeInputDevice(setActiveDevice), [])
  useEffect(() => () => releaseAllVirtualInput(), [])

  const resetJoystick = () => {
    activePointer.current = null
    joystickOrigin.current = { x: 0, y: 0 }
    setOrigin({ x: 0, y: 0 })
    setKnob({ x: 0, y: 0, active: false })
    setVirtualMovement(0, 0)
  }
  useEffect(() => {
    if (enabled) return
    activePointer.current = null
    joystickOrigin.current = { x: 0, y: 0 }
    setOrigin({ x: 0, y: 0 })
    setKnob({ x: 0, y: 0, active: false })
    releaseAllVirtualInput()
  }, [enabled])

  useEffect(() => {
    const onBlur = () => {
      activePointer.current = null
      joystickOrigin.current = { x: 0, y: 0 }
      setOrigin({ x: 0, y: 0 })
      setKnob({ x: 0, y: 0, active: false })
      releaseAllVirtualInput()
    }
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') onBlur()
    }
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const updateJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId || !padRef.current) return
    event.preventDefault()
    event.stopPropagation()
    const rect = padRef.current.getBoundingClientRect()
    const radius = Math.max(23, Math.min(rect.width, rect.height) * 0.34)
    const dx = event.clientX - (rect.left + rect.width / 2 + joystickOrigin.current.x)
    const dy = event.clientY - (rect.top + rect.height / 2 + joystickOrigin.current.y)
    const stick = projectTouchStick(dx, dy, radius, settings.joystickDeadZone, settings.touchSensitivity)
    setKnob({ x: stick.offsetX, y: stick.offsetY, active: true })
    setVirtualMovement(stick.x, stick.z)
  }

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    safelyReleasePointer(event.currentTarget, event.pointerId)
    resetJoystick()
  }

  const showControls = enabled &&
    settings.showTouchControls !== 'never' &&
    (settings.showTouchControls === 'always' || activeDevice !== 'gamepad')
  if (!showControls) return null

  return (
    <div
      className={`universal-touch-controls efu-mobile-match-controls ${settings.leftHanded ? 'is-left-handed' : ''} ${settings.showTouchControls === 'always' ? 'is-forced' : ''}`}
      style={{ '--touch-scale': settings.touchScale, '--touch-opacity': settings.touchOpacity } as CSSProperties}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        ref={padRef}
        className={`universal-joystick ${settings.joystickMode} ${knob.active ? 'is-active' : ''}`}
        role="application"
        aria-label="Movement joystick. Drag to move player."
        onPointerDown={(event) => {
          if (activePointer.current !== null) return
          event.preventDefault()
          event.stopPropagation()
          activePointer.current = event.pointerId
          const rect = event.currentTarget.getBoundingClientRect()
          const maxShift = Math.min(rect.width, rect.height) * 0.28
          const shift = settings.joystickMode === 'floating' ? {
            x: Math.max(-maxShift, Math.min(maxShift, event.clientX - (rect.left + rect.width / 2))),
            y: Math.max(-maxShift, Math.min(maxShift, event.clientY - (rect.top + rect.height / 2))),
          } : { x: 0, y: 0 }
          joystickOrigin.current = shift
          setOrigin(shift)
          updateJoystick(event)
          safelyCapturePointer(event.currentTarget, event.pointerId)
          pulseHaptic(8)
        }}
        onPointerMove={updateJoystick}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onLostPointerCapture={releasePointer}
        onPointerLeave={(event) => {
          if (activePointer.current === event.pointerId && !safelyHasPointerCapture(event.currentTarget, event.pointerId)) releasePointer(event)
        }}
      >
        <span className="joystick-ring" style={{ transform: `translate(${origin.x}px, ${origin.y}px)` }} />
        <span className={`joystick-knob ${knob.active ? 'active' : ''}`} style={{ transform: `translate(${origin.x + knob.x}px, ${origin.y + knob.y}px)` }} />
      </div>
      <div className="universal-action-cluster" aria-label="Football actions">
        <ActionButton action="through-pass" label="THRU" className="action-through" />
        <ActionButton action="shoot" label="SHOOT" className="action-shoot" />
        <ActionButton action="pass" label="PASS" className="action-pass" />
        <ActionButton action="lob-pass" label="LOB" className="action-lob" />
        <ActionButton action="tackle" label="TACKLE" className="action-tackle" />
        <ActionButton action="player-switch" label="SWITCH" className="action-switch" />
      </div>
      <div className="universal-modifier-cluster" aria-label="Football modifiers">
        <ActionButton action="sprint" label="SPRINT" className="modifier-sprint" />
        <ActionButton action="shield" label="SHIELD" className="modifier-shield" />
        <ActionButton action="skill" label="SKILL" className="modifier-skill" />
      </div>
    </div>
  )
}
