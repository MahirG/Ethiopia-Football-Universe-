import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from 'react'
import { useThree } from '@react-three/fiber'

interface SceneBoundaryProps {
  children: ReactNode
  onFailure: (error: Error) => void
  onRetry: () => void
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

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onFailure(error)
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="match-renderer-fallback" role="alert">
          <strong>Match graphics were interrupted</strong>
          <p>Gameplay is paused. Your displayed score and match clock are preserved, but the physical player and ball positions will restart.</p>
          <button type="button" onClick={this.props.onRetry}>Restart graphics in Performance mode</button>
        </div>
      )
    }
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
