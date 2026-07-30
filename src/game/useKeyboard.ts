import { useEffect, useRef } from 'react'

export interface KeyboardState {
  held: Set<string>
  pressed: Set<string>
}

export function useKeyboard() {
  const state = useRef<KeyboardState>({ held: new Set(), pressed: new Set() })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!state.current.held.has(key)) state.current.pressed.add(key)
      state.current.held.add(key)
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault()
    }
    const onKeyUp = (event: KeyboardEvent) => state.current.held.delete(event.key.toLowerCase())
    const onBlur = () => {
      state.current.held.clear()
      state.current.pressed.clear()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  return state
}
