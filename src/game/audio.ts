import { useCallback, useEffect, useMemo, useRef } from 'react'

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

function createNoiseBuffer(context: AudioContext, duration: number) {
  const length = Math.max(1, Math.floor(context.sampleRate * duration))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const channel = buffer.getChannelData(0)
  let previous = 0
  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1
    previous = previous * 0.985 + white * 0.015
    channel[index] = previous * 0.72 + white * 0.12
  }
  return buffer
}

export function useMatchAudio(enabled: boolean, volume: number): MatchAudioDirector {
  const contextRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const crowdGainRef = useRef<GainNode | null>(null)
  const crowdIntensityRef = useRef(0.26)

  const ensureStarted = useCallback(async () => {
    if (!enabled) return
    let context = contextRef.current
    if (!context) {
      const AudioContextConstructor = window.AudioContext
      context = new AudioContextConstructor()
      contextRef.current = context

      const master = context.createGain()
      master.gain.value = Math.max(0, Math.min(1, volume))
      master.connect(context.destination)
      masterRef.current = master

      const crowdSource = context.createBufferSource()
      crowdSource.buffer = createNoiseBuffer(context, 3.5)
      crowdSource.loop = true

      const lowpass = context.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 920
      lowpass.Q.value = 0.65

      const crowdGain = context.createGain()
      crowdGain.gain.value = crowdIntensityRef.current
      crowdSource.connect(lowpass)
      lowpass.connect(crowdGain)
      crowdGain.connect(master)
      crowdGainRef.current = crowdGain
      crowdSource.start()
    }
    if (context.state === 'suspended') await context.resume()
  }, [enabled, volume])

  const tone = useCallback((frequency: number, duration: number, gain: number, type: OscillatorType = 'sine', endFrequency?: number) => {
    const context = contextRef.current
    const master = masterRef.current
    if (!enabled || !context || !master) return
    const now = context.currentTime
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    if (endFrequency !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration)
    envelope.gain.setValueAtTime(0.0001, now)
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.018)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(envelope)
    envelope.connect(master)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.03)
  }, [enabled])

  const noiseBurst = useCallback((duration: number, gain: number, cutoff: number) => {
    const context = contextRef.current
    const master = masterRef.current
    if (!enabled || !context || !master) return
    const now = context.currentTime
    const source = context.createBufferSource()
    source.buffer = createNoiseBuffer(context, duration)
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(gain, now)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    source.connect(filter)
    filter.connect(envelope)
    envelope.connect(master)
    source.start(now)
  }, [enabled])

  const whistle = useCallback((long = false) => {
    tone(1850, long ? 0.78 : 0.42, 0.095, 'sine', long ? 2250 : 2050)
    window.setTimeout(() => tone(2050, long ? 0.58 : 0.26, 0.07, 'sine', 1750), long ? 340 : 170)
  }, [tone])

  const pass = useCallback(() => {
    tone(160, 0.11, 0.1, 'triangle', 82)
    noiseBurst(0.09, 0.075, 1250)
  }, [noiseBurst, tone])

  const shot = useCallback(() => {
    tone(118, 0.18, 0.18, 'triangle', 48)
    noiseBurst(0.16, 0.15, 1800)
  }, [noiseBurst, tone])

  const save = useCallback(() => {
    tone(92, 0.2, 0.16, 'triangle', 46)
    noiseBurst(0.18, 0.13, 980)
    window.setTimeout(() => tone(245, 0.16, 0.075, 'sine', 170), 65)
  }, [noiseBurst, tone])

  const goal = useCallback(() => {
    const context = contextRef.current
    const crowd = crowdGainRef.current
    if (context && crowd) {
      const now = context.currentTime
      crowd.gain.cancelScheduledValues(now)
      crowd.gain.setValueAtTime(crowd.gain.value, now)
      crowd.gain.linearRampToValueAtTime(0.78, now + 0.22)
      crowd.gain.exponentialRampToValueAtTime(Math.max(0.001, crowdIntensityRef.current), now + 3.8)
    }
    tone(196, 0.55, 0.12, 'sawtooth', 392)
    window.setTimeout(() => tone(247, 0.55, 0.11, 'sawtooth', 494), 120)
    window.setTimeout(() => tone(294, 0.68, 0.1, 'sawtooth', 588), 240)
  }, [tone])

  const setCrowdIntensity = useCallback((value: number) => {
    crowdIntensityRef.current = Math.max(0.05, Math.min(0.72, value))
    const context = contextRef.current
    const crowd = crowdGainRef.current
    if (!context || !crowd) return
    crowd.gain.setTargetAtTime(crowdIntensityRef.current, context.currentTime, 0.7)
  }, [])

  useEffect(() => {
    const context = contextRef.current
    const master = masterRef.current
    if (!context || !master) return
    master.gain.setTargetAtTime(enabled ? Math.max(0, Math.min(1, volume)) : 0, context.currentTime, 0.08)
  }, [enabled, volume])

  useEffect(() => () => {
    const context = contextRef.current
    contextRef.current = null
    masterRef.current = null
    crowdGainRef.current = null
    if (context) void context.close()
  }, [])

  const kickoff = useCallback(() => whistle(false), [whistle])
  const halftime = useCallback(() => whistle(true), [whistle])
  const fulltime = useCallback(() => {
    whistle(true)
    window.setTimeout(() => whistle(false), 850)
  }, [whistle])

  return useMemo(() => ({
    ensureStarted,
    kickoff,
    halftime,
    fulltime,
    pass,
    shot,
    save,
    goal,
    setCrowdIntensity,
  }), [ensureStarted, fulltime, goal, halftime, kickoff, pass, save, setCrowdIntensity, shot])
}
