import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, Download, Gamepad2, Play, Square, X } from 'lucide-react'
import { getActiveInputDevice, subscribeInputDevice } from '../input/bus'
import type { InputDeviceKind } from '../input/types'
import type { QualityLevel } from '../game/types'
import type { FrameHealthSnapshot } from './frameHealth'

interface Props {
  open: boolean
  recording: boolean
  running: boolean
  quality: QualityLevel
  snapshot: FrameHealthSnapshot | null
  onStart: () => void
  onStop: () => void
  onClose: () => void
}

const CHECKS = [
  ['stick-shoot', 'Hold the joystick while shooting and passing'],
  ['interrupt', 'Interrupt a held button, background the app, then resume'],
  ['left-handed', 'Check left-handed controls and gesture cancellation'],
  ['rotate', 'Check portrait and landscape, including safe areas'],
  ['gamepad', 'Connect, disconnect and reconnect a supported controller'],
  ['match', 'Play a full 11v11 match without stuck controls or crashes'],
] as const

function deviceViewport() {
  return {
    widthCssPx: window.innerWidth,
    heightCssPx: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    orientation: window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait',
  }
}

export function MatchDeviceLab({ open, recording, running, quality, snapshot, onStart, onStop, onClose }: Props) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [device, setDevice] = useState<InputDeviceKind>(() => getActiveInputDevice())
  useEffect(() => subscribeInputDevice(setDevice), [])
  if (!open) return null

  const download = () => {
    if (!snapshot || snapshot.sampledFrames === 0) return
    // Report intentionally contains no device identifiers, account details, or location.
    const report = {
      schema: 'efu-device-lab-v1',
      recordedAt: new Date().toISOString(),
      graphicsPreset: quality,
      viewport: deviceViewport(),
      inputSource: device,
      capture: snapshot,
      completedManualChecks: Object.entries(completed).filter(([, done]) => done).map(([id]) => id),
      caveat: 'Browser frame timings and approximate WebGL allocation counters; not a GPU-memory or input-latency measurement.',
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'efu-device-lab-' + Date.now() + '.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 500)
  }

  return (
    <section className="device-lab panel" aria-label="Device Lab - mobile match testing">
      <div className="device-lab-head">
        <div>
          <small>EFU ENGINEERING • PRIVATE DEVICE CHECK</small>
          <h2><Activity size={20} /> Mobile Device Lab</h2>
          <p>Record frame health while a real match is running on your phone. No telemetry is uploaded.</p>
        </div>
        <button type="button" className="device-lab-close" onClick={onClose} aria-label="Close Device Lab"><X size={19} /></button>
      </div>
      <div className="device-lab-toolbar">
        {recording
          ? <button type="button" className="secondary-button" onClick={onStop}><Square size={16} /> Stop capture</button>
          : <button type="button" className="primary-button" onClick={onStart} disabled={!running}><Play size={16} /> Start capture</button>}
        <button type="button" className="secondary-button" disabled={!snapshot || !snapshot.sampledFrames} onClick={download}>
          <Download size={16} /> Export report
        </button>
        <span className="device-lab-chip"><Gamepad2 size={15} /> {device}</span>
        <span className="device-lab-chip">{quality.toUpperCase()}</span>
        {recording && <span className="device-lab-capturing">● Recording match frames</span>}
      </div>
      {!running && !recording && <p className="device-lab-hint">Start the live match before capturing performance. Open this panel again after the match starts.</p>}
      <div className="device-lab-grid" aria-live="off">
        <div><span>Average FPS (recent)</span><strong>{snapshot ? snapshot.averageFps.toFixed(1) : '—'}</strong></div>
        <div><span>P95 frame time</span><strong>{snapshot ? snapshot.p95FrameMs.toFixed(1) + ' ms' : '—'}</strong></div>
        <div><span>Frames above 33ms</span><strong>{snapshot ? snapshot.slowFramePercent.toFixed(1) + '%' : '—'}</strong></div>
        <div><span>Captured game time</span><strong>{snapshot ? snapshot.elapsedSeconds.toFixed(1) + ' s' : '—'}</strong></div>
        <div><span>WebGL draw calls*</span><strong>{snapshot ? snapshot.drawCalls.toLocaleString() : '—'}</strong></div>
        <div><span>Render triangles*</span><strong>{snapshot ? snapshot.triangles.toLocaleString() : '—'}</strong></div>
      </div>
      <p className="device-lab-hint">*Renderer counters are approximate snapshots, not hardware GPU memory or end-to-end touch latency. FPS and P95 represent a rolling window of recent rendered frames. Test sustained performance and heat separately.</p>
      <div className="device-lab-checks">
        <h3><CheckCircle2 size={17} /> Manual Android checklist</h3>
        {CHECKS.map(([id, label]) =>
          <label key={id}><input type="checkbox" checked={Boolean(completed[id])} onChange={event => setCompleted(prev => ({ ...prev, [id]: event.target.checked }))} /><span>{label}</span></label>
        )}
        <p>These boxes are self-reported checks, not automated evidence. Keep this PR in draft until the game has been tested on physical hardware.</p>
      </div>
    </section>
  )
}
