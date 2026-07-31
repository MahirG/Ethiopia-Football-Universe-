import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { FootballAudioEngine } from './engine'
import { useAudioSettings } from './settings'
import type { AudioEventContext, AudioProfilerSnapshot, AudioSettings, AudioSnapshot, CrowdState, FootballAudioEvent } from './types'
import type { Weather } from '../game/types'
import { AudioSettingsPanel } from './AudioSettingsPanel'
import { AudioDebugOverlay } from './AudioDebugOverlay'
import { Volume2 } from 'lucide-react'

interface AudioContextValue {
  settings: AudioSettings
  patch: (next: Partial<AudioSettings>) => void
  reset: () => void
  engine: FootballAudioEngine
  profile: AudioProfilerSnapshot | null
  ensureStarted: () => Promise<void>
  emit: (event: FootballAudioEvent, payload?: Omit<AudioEventContext, 'event'>) => void
  setSnapshot: (snapshot: AudioSnapshot, transition?: number) => void
  setCrowd: (state: Partial<CrowdState>) => void
  setWeather: (weather: Weather, intensity: number) => void
}

const AudioContext = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const { settings, patch, reset } = useAudioSettings()
  const engineRef = useRef<FootballAudioEngine | null>(null)
  const [profile, setProfile] = useState<AudioProfilerSnapshot | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  if (!engineRef.current) engineRef.current = new FootballAudioEngine(settings)
  const engine = engineRef.current

  useEffect(() => engine.updateSettings(settings), [engine, settings])
  useEffect(() => {
    const interval = window.setInterval(() => setProfile(engine.profile()), 500)
    return () => window.clearInterval(interval)
  }, [engine])

  useEffect(() => {
    let lastHover = 0
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button,a,[role="button"],select,input') : null
      if (!target) return
      void engine.ensureStarted()
      engine.emit({ event: target instanceof HTMLInputElement && target.type === 'checkbox' ? 'ui-confirm' : 'ui-click' })
    }
    const hover = (event: MouseEvent) => {
      const now = performance.now()
      if (now - lastHover < 100) return
      const target = event.target instanceof Element ? event.target.closest('button,a,[role="button"]') : null
      if (!target) return
      lastHover = now
      engine.emit({ event: 'ui-hover' })
    }
    document.addEventListener('click', click, true)
    document.addEventListener('mouseover', hover, true)
    return () => {
      document.removeEventListener('click', click, true)
      document.removeEventListener('mouseover', hover, true)
    }
  }, [engine])

  useEffect(() => {
    const readEnvironment = () => {
      const text = document.querySelector('.broadcast-tech-strip')?.textContent?.toLowerCase() ?? ''
      const weather: Weather = text.includes('rain') ? 'rain' : text.includes('wind') ? 'wind' : text.includes('overcast') ? 'overcast' : 'clear'
      const match = text.match(/(\d+)%/)
      engine.setWeather(weather, match ? Number(match[1]) / 100 : 0.65)
    }
    const interval = window.setInterval(readEnvironment, 1000)
    readEnvironment()
    return () => window.clearInterval(interval)
  }, [engine])

  const ensureStarted = useCallback(() => engine.ensureStarted(), [engine])
  const emit = useCallback((event: FootballAudioEvent, payload: Omit<AudioEventContext, 'event'> = {}) => engine.emit({ event, ...payload }), [engine])
  const setSnapshot = useCallback((snapshot: AudioSnapshot, transition?: number) => engine.setSnapshot(snapshot, transition), [engine])
  const setCrowd = useCallback((state: Partial<CrowdState>) => engine.setCrowd(state), [engine])
  const setWeather = useCallback((weather: Weather, intensity: number) => engine.setWeather(weather, intensity), [engine])

  const value = useMemo(() => ({ settings, patch, reset, engine, profile, ensureStarted, emit, setSnapshot, setCrowd, setWeather }), [emit, engine, ensureStarted, patch, profile, reset, setCrowd, setSnapshot, setWeather, settings])
  return (
    <AudioContext.Provider value={value}>
      {children}
      <button className="global-audio-console" onClick={() => setSettingsOpen(true)} title="Open production audio console"><Volume2 size={16} /> AUDIO</button>
      <button className="global-audio-profiler" onClick={() => setDebugOpen((current) => !current)}>PROFILER</button>
      <AudioSettingsPanel settings={settings} patch={patch} reset={reset} open={settingsOpen} setOpen={setSettingsOpen} />
      <AudioDebugOverlay profile={profile} open={debugOpen} close={() => setDebugOpen(false)} trigger={(event) => { void engine.ensureStarted(); engine.emit({ event, team: 'home', force: 0.85 }) }} />
    </AudioContext.Provider>
  )
}

export function useGlobalAudio() {
  const value = useContext(AudioContext)
  if (!value) throw new Error('useGlobalAudio must be used inside AudioProvider')
  return value
}
