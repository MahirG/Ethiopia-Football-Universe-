import { RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getControlSettings, resetControlSettings, subscribeControlSettings, updateControlSettings } from './bus'
import type { ControlPresetId, ControlSettings } from './types'

interface ControlSettingsPanelProps {
  open: boolean
  onClose: () => void
}

const PRESET_LABELS: Record<ControlPresetId, string> = {
  classic: 'Classic',
  modern: 'Modern',
  competitive: 'Competitive',
  'mobile-simple': 'Mobile Simple',
  'mobile-advanced': 'Mobile Advanced',
  'one-handed': 'One-handed',
}

export function ControlSettingsPanel({ open, onClose }: ControlSettingsPanelProps) {
  const [settings, setSettings] = useState<ControlSettings>(() => getControlSettings())
  useEffect(() => subscribeControlSettings(setSettings), [])
  if (!open) return null

  const patch = (next: Partial<ControlSettings>) => setSettings(updateControlSettings(next))

  return (
    <div className="control-settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="control-settings-panel" role="dialog" aria-modal="true" aria-label="Universal control settings">
        <header>
          <div><span>Universal input system</span><h2>Controls & accessibility</h2></div>
          <button type="button" onClick={onClose} aria-label="Close controls"><X size={19} /></button>
        </header>

        <div className="control-settings-grid">
          <label>Preset<select value={settings.preset} onChange={(event) => patch({ preset: event.target.value as ControlPresetId })}>{Object.entries(PRESET_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>Touch visibility<select value={settings.showTouchControls} onChange={(event) => patch({ showTouchControls: event.target.value as ControlSettings['showTouchControls'] })}><option value="auto">Automatic</option><option value="always">Always</option><option value="never">Never</option></select></label>
          <label>Joystick<select value={settings.joystickMode} onChange={(event) => patch({ joystickMode: event.target.value as ControlSettings['joystickMode'] })}><option value="fixed">Fixed</option><option value="floating">Floating</option></select></label>
          <label className="toggle-control"><input type="checkbox" checked={settings.leftHanded} onChange={(event) => patch({ leftHanded: event.target.checked })} /><span>Left-handed touch layout</span></label>
          <label className="toggle-control"><input type="checkbox" checked={settings.haptics} onChange={(event) => patch({ haptics: event.target.checked })} /><span>Touch haptics</span></label>
          <label>Touch size <b>{Math.round(settings.touchScale * 100)}%</b><input type="range" min="0.78" max="1.25" step="0.01" value={settings.touchScale} onChange={(event) => patch({ touchScale: Number(event.target.value) })} /></label>
          <label>Touch opacity <b>{Math.round(settings.touchOpacity * 100)}%</b><input type="range" min="0.35" max="1" step="0.01" value={settings.touchOpacity} onChange={(event) => patch({ touchOpacity: Number(event.target.value) })} /></label>
          <label>Touch sensitivity <b>{settings.touchSensitivity.toFixed(2)}×</b><input type="range" min="0.65" max="1.35" step="0.05" value={settings.touchSensitivity} onChange={(event) => patch({ touchSensitivity: Number(event.target.value) })} /></label>
          <label>Gamepad dead zone <b>{Math.round(settings.gamepadDeadZone * 100)}%</b><input type="range" min="0.05" max="0.35" step="0.01" value={settings.gamepadDeadZone} onChange={(event) => patch({ gamepadDeadZone: Number(event.target.value) })} /></label>
          <label>Gamepad sensitivity <b>{settings.gamepadSensitivity.toFixed(2)}×</b><input type="range" min="0.7" max="1.3" step="0.05" value={settings.gamepadSensitivity} onChange={(event) => patch({ gamepadSensitivity: Number(event.target.value) })} /></label>
        </div>

        <div className="control-map-reference">
          <div><strong>Keyboard</strong><span>WASD move · Shift sprint · E pass · T through · Q lob · Space/LMB shoot · C shield · F tackle · V slide · R switch · X cancel</span></div>
          <div><strong>Gamepad</strong><span>Left stick move · RT sprint · LT shield · A pass · X through · Y lob · B shoot · LB switch · RB controlled sprint</span></div>
          <div><strong>Touch</strong><span>Analog joystick · independent pass/through/lob/shoot · sprint/shield/skill · tackle and manual switch</span></div>
        </div>

        <footer><button className="secondary-button" type="button" onClick={() => setSettings(resetControlSettings())}><RotateCcw size={16} /> Reset controls</button><button className="primary-button" type="button" onClick={onClose}>Done</button></footer>
      </section>
    </div>
  )
}
