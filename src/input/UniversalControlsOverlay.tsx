import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { getControlSettings, pulseHaptic, releaseAllVirtualInput, setVirtualAction, setVirtualMovement, subscribeControlSettings } from './bus'
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
    // Some mobile WebViews drop pointer capture before React receives pointerup.
  }
}

function ActionButton({ action, label, className = '' }: ActionButtonProps) {
  const activePointer = useRef<number | null>(null)

  const release = (event?: ReactPointerEvent<HTMLButtonElement>) => {
    if (event && activePointer.current !== null && event.pointerId !== activePointer.current) return
    event?.preventDefault()
    event?.stopPropagation()
    setVirtualAction(action, false)
    if (event) safelyReleasePointer(event.currentTarget, event.pointerId)
    activePointer.current = null
  }

  return (
    <button
      className={className}
      type="button"
      aria-label={label}
      draggable={false}
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        activePointer.current = event.pointerId

        // Queue the action before attempting pointer capture. Older Android
        // WebViews can throw here, which previously prevented every button press.
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
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {label}
    </button>
  )
}

export function UniversalControlsOverlay({ enabled }: UniversalControlsOverlayProps) {
  const [settings, setSettings] = useState<ControlSettings>(() => getControlSettings())
  const padRef = useRef<HTMLDivElement>(null)
  const activePointer = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false })

  useEffect(() => subscribeControlSettings(setSettings), [])
  useEffect(() => () => releaseAllVirtualInput(), [])
  useEffect(() => {
    if (enabled) return
    activePointer.current = null
    setKnob({ x: 0, y: 0, active: false })
    releaseAllVirtualInput()
  }, [enabled])
  useEffect(() => {
    const release = () => {
      activePointer.current = null
      setKnob({ x: 0, y: 0, active: false })
      releaseAllVirtualInput()
    }
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') release()
    }
    window.addEventListener('blur', release)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const movePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId || !padRef.current) return
    event.preventDefault()
    event.stopPropagation()
    const rect = padRef.current.getBoundingClientRect()
    const radius = Math.max(34, Math.min(rect.width, rect.height) / 2)
    let x = event.clientX - (rect.left + rect.width / 2)
    let y = event.clientY - (rect.top + rect.height / 2)
    const length = Math.hypot(x, y)
    if (length > radius) {
      x = (x / length) * radius
      y = (y / length) * radius
    }
    const sensitivity = settings.touchSensitivity
    setKnob({ x, y, active: true })
    setVirtualMovement((-y / radius) * sensitivity, (x / radius) * sensitivity)
  }

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    safelyReleasePointer(event.currentTarget, event.pointerId)
    activePointer.current = null
    setKnob({ x: 0, y: 0, active: false })
    setVirtualMovement(0, 0)
  }

  if (!enabled || settings.showTouchControls === 'never') return null

  return (
    <div
      className={`universal-touch-controls ${settings.leftHanded ? 'is-left-handed' : ''} ${settings.showTouchControls === 'always' ? 'is-forced' : ''}`}
      style={{ '--touch-scale': settings.touchScale, '--touch-opacity': settings.touchOpacity } as CSSProperties}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        ref={padRef}
        className={`universal-joystick ${settings.joystickMode}`}
        role="application"
        aria-label="Movement joystick"
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
          activePointer.current = event.pointerId

          // Update movement even when pointer capture is unavailable.
          movePointer(event)
          safelyCapturePointer(event.currentTarget, event.pointerId)
          pulseHaptic(8)
        }}
        onPointerMove={movePointer}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onLostPointerCapture={releasePointer}
        onPointerLeave={(event) => {
          if (activePointer.current === event.pointerId && !safelyHasPointerCapture(event.currentTarget, event.pointerId)) releasePointer(event)
        }}
      >
        <span className="joystick-ring" />
        <span className={`joystick-knob ${knob.active ? 'active' : ''}`} style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>

      <div className="universal-action-cluster">
        <ActionButton action="through-pass" label="THRU" className="action-through" />
        <ActionButton action="shoot" label="SHOOT" className="action-shoot" />
        <ActionButton action="pass" label="PASS" className="action-pass" />
        <ActionButton action="lob-pass" label="LOB" className="action-lob" />
        <ActionButton action="tackle" label="TACKLE" className="action-tackle" />
        <ActionButton action="player-switch" label="SWITCH" className="action-switch" />
      </div>

      <div className="universal-modifier-cluster">
        <ActionButton action="sprint" label="SPRINT" className="modifier-sprint" />
        <ActionButton action="shield" label="SHIELD" className="modifier-shield" />
        <ActionButton action="skill" label="SKILL" className="modifier-skill" />
      </div>
    </div>
  )
}
