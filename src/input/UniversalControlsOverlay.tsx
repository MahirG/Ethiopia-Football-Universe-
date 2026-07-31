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

function ActionButton({ action, label, className = '' }: ActionButtonProps) {
  const release = () => setVirtualAction(action, false)
  return (
    <button
      className={className}
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        setVirtualAction(action, true)
        pulseHaptic(action === 'shoot' || action === 'tackle' ? 18 : 10)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
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

  const movePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId || !padRef.current) return
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
    activePointer.current = null
    setKnob({ x: 0, y: 0, active: false })
    setVirtualMovement(0, 0)
  }

  if (!enabled || settings.showTouchControls === 'never') return null

  return (
    <div
      className={`universal-touch-controls ${settings.leftHanded ? 'is-left-handed' : ''} ${settings.showTouchControls === 'always' ? 'is-forced' : ''}`}
      style={{ '--touch-scale': settings.touchScale, '--touch-opacity': settings.touchOpacity } as CSSProperties}
    >
      <div
        ref={padRef}
        className={`universal-joystick ${settings.joystickMode}`}
        role="application"
        aria-label="Movement joystick"
        onPointerDown={(event) => {
          event.preventDefault()
          activePointer.current = event.pointerId
          event.currentTarget.setPointerCapture(event.pointerId)
          movePointer(event)
          pulseHaptic(8)
        }}
        onPointerMove={movePointer}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onLostPointerCapture={releasePointer}
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
