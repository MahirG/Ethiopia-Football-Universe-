import { Component, useEffect, useRef, type ReactNode } from 'react'
import { useThree } from '@react-three/fiber'

interface SceneBoundaryProps {
  children: ReactNode
  onFailure: (error: Error) => void
}

interface SceneBoundaryState {
  failed: boolean
}

/** Contain Three.js render failures inside Match instead of blanking the app. */
export class MatchSceneErrorBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false }

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    this.props.onFailure(error)
  }

  render() {
    // The parent MatchView owns the single accessible recovery overlay. Avoid
    // stacking duplicate panels above a lost canvas on a small phone screen.
    if (this.state.failed) return null
    return this.props.children
  }
}

interface ContextGuardProps {
  onLost?: () => void
  onRestored?: () => void
}

/**
 * Listens on the actual WebGL Canvas. WebGL context loss is distinct from a
 * React component exception and needs its own guarded recovery path.
 */
export function WebGLContextGuard({ onLost, onRestored }: ContextGuardProps) {
  const { gl } = useThree()
  const handlers = useRef({ onLost, onRestored })
  useEffect(() => {
    handlers.current = { onLost, onRestored }
  }, [onLost, onRestored])

  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => {
      // Allows the browser to attempt restoration instead of permanently
      // discarding a low-memory Android WebGL context.
      event.preventDefault()
      handlers.current.onLost?.()
    }
    const restored = () => handlers.current.onRestored?.()
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    return () => {
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
    }
  }, [gl])
  return null
}
