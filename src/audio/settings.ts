import { useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { AudioSettings } from './types'

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  enabled: true,
  master: 0.78,
  music: 0.34,
  commentary: 0.9,
  crowd: 0.72,
  announcer: 0.72,
  effects: 0.82,
  ui: 0.32,
  voiceChat: 0.7,
  weather: 0.54,
  dynamicRange: 'tv',
  mono: false,
  commentaryLanguage: 'am',
  announcerLanguage: 'am',
  subtitles: true,
  closedCaptions: true,
  visualIndicators: true,
  quality: 'high',
  commentaryEnabled: true,
  announcerEnabled: true,
  musicEnabled: true,
}

export function useAudioSettings() {
  const [settings, setSettings] = useLocalStorage<AudioSettings>('efu-audio-settings-v2', DEFAULT_AUDIO_SETTINGS)
  const patch = useCallback((next: Partial<AudioSettings>) => setSettings((current) => ({ ...current, ...next })), [setSettings])
  const reset = useCallback(() => setSettings(DEFAULT_AUDIO_SETTINGS), [setSettings])
  return { settings, patch, reset }
}
