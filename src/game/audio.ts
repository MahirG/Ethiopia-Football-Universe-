import { useCallback, useEffect, useMemo } from 'react'
import { useGlobalAudio } from '../audio/AudioProvider'

interface MatchAudioDirector {
  ensureStarted: () => Promise<void>
  kickoff: () => void
  halftime: () => void
  fulltime: () => void
  pass: () => void
  shot: () => void
  save: () => void
  goal: () => void
  setCrowdIntensity: (value: number) => void
}

export function useMatchAudio(enabled: boolean, volume: number): MatchAudioDirector {
  const { ensureStarted, emit, setCrowd, setSnapshot, patch } = useGlobalAudio()

  useEffect(() => {
    patch({ enabled, master: volume })
  }, [enabled, patch, volume])

  const kickoff = useCallback(() => {
    setSnapshot('normal-match', 0.25)
    emit('kickoff')
  }, [emit, setSnapshot])
  const halftime = useCallback(() => {
    setSnapshot('half-time', 0.4)
    emit('half-time')
  }, [emit, setSnapshot])
  const fulltime = useCallback(() => {
    setSnapshot('full-time', 0.3)
    emit('full-time')
  }, [emit, setSnapshot])
  const pass = useCallback(() => emit('pass-completed', { force: 0.48 }), [emit])
  const shot = useCallback(() => emit('shot-taken', { force: 0.9 }), [emit])
  const save = useCallback(() => emit('save-made', { force: 0.82 }), [emit])
  const goal = useCallback(() => emit('goal-scored', { importance: 0.72, tension: 0.9 }), [emit])
  const setCrowdIntensity = useCallback((intensity: number) => {
    setCrowd({ intensity, tension: Math.max(0.12, intensity * 0.72), attackThreat: Math.max(0, intensity - 0.45) })
  }, [setCrowd])

  return useMemo(() => ({ ensureStarted, kickoff, halftime, fulltime, pass, shot, save, goal, setCrowdIntensity }), [ensureStarted, fulltime, goal, halftime, kickoff, pass, save, setCrowdIntensity, shot])
}
