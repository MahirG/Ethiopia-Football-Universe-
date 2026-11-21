import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { FrameHealthMonitor, type FrameHealthSnapshot } from './frameHealth'

interface Props {
  active: boolean
  running: boolean
  onSnapshot?: (snapshot: FrameHealthSnapshot) => void
}

/** Read-only, opt-in performance probe. Does not change match timing or rendering settings. */
export function MatchPerformanceProbe({ active, running, onSnapshot }: Props) {
  const monitor = useRef(new FrameHealthMonitor(2400))
  useEffect(() => { if (active) monitor.current.reset() }, [active])
  useFrame((state, delta) => {
    if (!active || !running || !onSnapshot) return
    monitor.current.addFrame(delta)
    if (!monitor.current.shouldPublish(performance.now())) return
    const info = state.gl.info
    onSnapshot(monitor.current.snapshot({
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      dpr: state.gl.getPixelRatio(),
    }))
  })
  return null
}
