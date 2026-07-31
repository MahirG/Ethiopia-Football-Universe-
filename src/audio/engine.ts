import { AUDIO_EVENT_MAP } from './catalog'
import { FootballAudioEventBus } from './eventBus'
import type {
  AudioBusName,
  AudioEventContext,
  AudioProfilerSnapshot,
  AudioSettings,
  AudioSnapshot,
  ClubAudioProfile,
  CrowdState,
  StadiumAudioProfile,
} from './types'

const BUS_NAMES: AudioBusName[] = [
  'master', 'music', 'commentary', 'crowd', 'announcer', 'ball', 'players',
  'referee', 'weather', 'environment', 'ui', 'cinematics', 'voiceChat', 'replays',
]

const SNAPSHOTS: Record<AudioSnapshot, Partial<Record<AudioBusName, number>>> = {
  'main-menu': { music: 1, crowd: 0.12, commentary: 0, ball: 0, players: 0 },
  'team-selection': { music: 0.86, ui: 1, crowd: 0.1 },
  'pre-match': { music: 0.66, crowd: 0.72, announcer: 1, commentary: 0.88 },
  'normal-match': { music: 0, crowd: 0.86, commentary: 1, announcer: 0.9, ball: 1, players: 0.8, referee: 1 },
  'dangerous-attack': { crowd: 1.12, commentary: 0.98, ball: 1.08, players: 0.86 },
  'goal-celebration': { crowd: 1.3, commentary: 1.05, announcer: 1.1, ball: 0.62, cinematics: 1.1 },
  penalty: { crowd: 0.48, commentary: 0.82, ball: 1.14, referee: 1.15 },
  'var-review': { crowd: 0.54, commentary: 0.9, announcer: 0.9, referee: 1.1 },
  'half-time': { music: 0.62, crowd: 0.4, commentary: 0.95, announcer: 0.8 },
  'full-time': { music: 0.6, crowd: 0.82, commentary: 1, announcer: 1 },
  replay: { crowd: 0.58, commentary: 0.8, ball: 1.22, replays: 1.12, cinematics: 0.9 },
  'pause-menu': { crowd: 0.22, commentary: 0, ball: 0, players: 0, ui: 1 },
  'trophy-ceremony': { music: 1, crowd: 1.18, commentary: 0.92, announcer: 1.12, cinematics: 1.2 },
}

interface ActiveVoice {
  id: number
  priority: number
  stop: () => void
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

function makeNoise(context: AudioContext, seconds: number, pink = false) {
  const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * seconds)), context.sampleRate)
  const data = buffer.getChannelData(0)
  let previous = 0
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1
    previous = pink ? previous * 0.975 + white * 0.025 : white
    data[index] = pink ? previous * 0.8 + white * 0.1 : white
  }
  return buffer
}

export class FootballAudioEngine {
  readonly events = new FootballAudioEventBus()
  private context: AudioContext | null = null
  private buses = new Map<AudioBusName, GainNode>()
  private settings: AudioSettings
  private snapshot: AudioSnapshot = 'normal-match'
  private crowdState: CrowdState = {
    intensity: 0.28,
    homeSupport: 0.68,
    awaySupport: 0.36,
    tension: 0.2,
    attackThreat: 0,
    momentum: 0,
    importance: 0.55,
    derby: 0,
    capacityRatio: 0.8,
  }
  private stadium: StadiumAudioProfile | null = null
  private homeClub: ClubAudioProfile | null = null
  private awayClub: ClubAudioProfile | null = null
  private crowdGains: GainNode[] = []
  private weatherGain: GainNode | null = null
  private continuous: AudioBufferSourceNode[] = []
  private activeVoices: ActiveVoice[] = []
  private cooldowns = new Map<string, number>()
  private lastEvents: string[] = []
  private queued = 0
  private nextVoiceId = 1
  private maxVoices = 32
  private unsubscribe: (() => void) | null

  constructor(settings: AudioSettings) {
    this.settings = settings
    this.maxVoices = this.voiceLimit(settings)
    this.unsubscribe = this.events.on('*', (event) => this.handle(event))
  }

  async ensureStarted() {
    if (!this.settings.enabled) return
    if (!this.context) this.createGraph()
    if (this.context?.state === 'suspended') await this.context.resume()
  }

  configureMatch(stadium: StadiumAudioProfile, home: ClubAudioProfile, away: ClubAudioProfile) {
    this.stadium = stadium
    this.homeClub = home
    this.awayClub = away
    this.crowdState.homeSupport = home.crowdEnergy
    this.crowdState.awaySupport = away.crowdEnergy * 0.58
    this.crowdState.capacityRatio = clamp(stadium.capacity / 40000, 0.35, 1)
    this.updateCrowd()
  }

  updateSettings(settings: AudioSettings) {
    this.settings = settings
    this.maxVoices = this.voiceLimit(settings)
    this.updateBusLevels(0.08)
  }

  setSnapshot(snapshot: AudioSnapshot, transition = 0.35) {
    this.snapshot = snapshot
    this.updateBusLevels(transition)
  }

  setCrowd(next: Partial<CrowdState>) {
    const merged = { ...this.crowdState, ...next }
    this.crowdState = {
      intensity: clamp(merged.intensity),
      homeSupport: clamp(merged.homeSupport),
      awaySupport: clamp(merged.awaySupport),
      tension: clamp(merged.tension),
      attackThreat: clamp(merged.attackThreat),
      momentum: clamp(merged.momentum, -1, 1),
      importance: clamp(merged.importance),
      derby: clamp(merged.derby),
      capacityRatio: clamp(merged.capacityRatio),
    }
    this.updateCrowd()
  }

  setWeather(weather: 'clear' | 'overcast' | 'rain' | 'wind', intensity: number) {
    if (!this.context || !this.weatherGain) return
    const target = weather === 'rain'
      ? 0.24 * intensity
      : weather === 'wind'
        ? 0.11 * intensity
        : weather === 'overcast'
          ? 0.025
          : 0
    this.weatherGain.gain.setTargetAtTime(target, this.context.currentTime, 0.8)
  }

  emit(context: AudioEventContext) {
    this.events.emit({ ...context, time: performance.now() })
  }

  profile(): AudioProfilerSnapshot {
    const settings = this.settings
    const buses: Record<AudioBusName, number> = {
      master: settings.master,
      music: settings.music,
      commentary: settings.commentary,
      crowd: settings.crowd,
      announcer: settings.announcer,
      ball: settings.effects,
      players: settings.effects,
      referee: settings.effects,
      weather: settings.weather,
      environment: settings.effects * 0.7,
      ui: settings.ui,
      cinematics: settings.effects,
      voiceChat: settings.voiceChat,
      replays: settings.effects,
    }
    return {
      started: Boolean(this.context),
      activeVoices: this.activeVoices.length,
      maxVoices: this.maxVoices,
      queuedEvents: this.queued,
      currentSnapshot: this.snapshot,
      crowd: { ...this.crowdState },
      buses,
      lastEvents: [...this.lastEvents],
      estimatedMemoryKb: 64 + this.continuous.length * 860 + this.activeVoices.length * 24,
      stadiumProfile: this.stadium?.name ?? 'Unconfigured',
      homeProfile: this.homeClub?.name ?? 'Unconfigured',
      awayProfile: this.awayClub?.name ?? 'Unconfigured',
    }
  }

  destroy() {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.continuous.forEach((source) => {
      try { source.stop() } catch { /* already stopped */ }
    })
    this.activeVoices.forEach((voice) => voice.stop())
    this.continuous = []
    this.activeVoices = []
    const context = this.context
    this.context = null
    this.buses.clear()
    if (context) void context.close()
  }

  private voiceLimit(settings: AudioSettings) {
    if (settings.quality === 'low') return 16
    if (settings.quality === 'medium') return 24
    if (settings.quality === 'high') return 36
    return 48
  }

  private createGraph() {
    const context = new AudioContext({ latencyHint: 'interactive' })
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = this.settings.dynamicRange === 'night' ? -28 : this.settings.dynamicRange === 'tv' ? -20 : -12
    compressor.knee.value = 18
    compressor.ratio.value = this.settings.dynamicRange === 'full' ? 2 : 5
    compressor.attack.value = 0.008
    compressor.release.value = 0.24
    compressor.connect(context.destination)

    const master = context.createGain()
    master.connect(compressor)
    this.buses.set('master', master)
    BUS_NAMES.filter((name) => name !== 'master').forEach((name) => {
      const gain = context.createGain()
      gain.connect(master)
      this.buses.set(name, gain)
    })
    this.context = context
    this.updateBusLevels(0)
    this.startCrowd()
    this.startWeather()
  }

  private startCrowd() {
    const context = this.context
    const bus = this.buses.get('crowd')
    if (!context || !bus) return
    const layers = [
      { cutoff: 720, gain: 0.28, rate: 0.91 },
      { cutoff: 1180, gain: 0.16, rate: 1.04 },
      { cutoff: 1850, gain: 0.08, rate: 1.17 },
      { cutoff: 460, gain: 0.12, rate: 0.78 },
    ]
    const count = this.settings.quality === 'low' ? 2 : this.settings.quality === 'medium' ? 3 : 4
    layers.slice(0, count).forEach((layer, index) => {
      const source = context.createBufferSource()
      source.buffer = makeNoise(context, 5.5 + index, true)
      source.loop = true
      source.playbackRate.value = layer.rate
      const filter = context.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = layer.cutoff
      filter.Q.value = 0.45 + index * 0.22
      const gain = context.createGain()
      gain.gain.value = layer.gain
      source.connect(filter)
      filter.connect(gain)
      gain.connect(bus)
      source.start()
      this.continuous.push(source)
      this.crowdGains.push(gain)
    })
  }

  private startWeather() {
    const context = this.context
    const bus = this.buses.get('weather')
    if (!context || !bus) return
    const source = context.createBufferSource()
    source.buffer = makeNoise(context, 4.25)
    source.loop = true
    const filter = context.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 2900
    const gain = context.createGain()
    gain.gain.value = 0
    source.connect(filter)
    filter.connect(gain)
    gain.connect(bus)
    source.start()
    this.continuous.push(source)
    this.weatherGain = gain
  }

  private handle(event: AudioEventContext) {
    const definition = AUDIO_EVENT_MAP.get(event.event)
    if (!definition || !this.context || !this.settings.enabled) return
    const key = `${definition.id}:${event.team ?? 'neutral'}`
    const now = performance.now()
    if (now < (this.cooldowns.get(key) ?? 0)) return
    this.cooldowns.set(key, now + definition.cooldownMs)
    this.lastEvents = [`${event.event}${event.team ? `:${event.team}` : ''}`, ...this.lastEvents].slice(0, 10)
    this.queued += 1
    queueMicrotask(() => {
      this.queued = Math.max(0, this.queued - 1)
      this.play(event, definition.priority, definition.bus, definition.baseVolume)
    })
    this.reactMix(event)
  }

  private reactMix(event: AudioEventContext) {
    if (event.event === 'goal-scored' || event.event === 'winning-goal' || event.event === 'equalizer') {
      this.setSnapshot('goal-celebration', 0.12)
      this.setCrowd({ intensity: 1, tension: 0.72, momentum: event.team === 'home' ? 1 : -1 })
      window.setTimeout(() => this.setSnapshot('normal-match', 1.2), 4200)
      return
    }
    if (event.event === 'penalty-awarded') {
      this.setCrowd({ attackThreat: 1, tension: 1 })
      this.setSnapshot('penalty', 0.2)
      return
    }
    if (event.event === 'shot-taken') {
      this.setCrowd({ attackThreat: 1, tension: Math.max(this.crowdState.tension, 0.78) })
      return
    }
    if (event.event === 'replay-start') this.setSnapshot('replay', 0.18)
    else if (event.event === 'replay-end') this.setSnapshot('normal-match', 0.45)
    else if (event.event === 'half-time') this.setSnapshot('half-time', 0.5)
    else if (event.event === 'full-time') this.setSnapshot('full-time', 0.25)
    else if (event.event === 'var-review') this.setSnapshot('var-review', 0.2)
    else if (event.event === 'trophy-won') this.setSnapshot('trophy-ceremony', 0.18)
  }

  private play(event: AudioEventContext, priority: number, busName: AudioBusName, volume: number) {
    const context = this.context
    const bus = this.buses.get(busName)
    if (!context || !bus) return
    if (this.activeVoices.length >= this.maxVoices) {
      const weakest = [...this.activeVoices].sort((a, b) => a.priority - b.priority)[0]
      if (!weakest || weakest.priority > priority) return
      weakest.stop()
    }

    const now = context.currentTime
    const name = event.event
    const force = clamp(event.force ?? (name.includes('shot') ? 0.92 : 0.54))
    const pitch = 0.94 + Math.random() * 0.12
    const panner = event.position ? this.makePanner(event.position) : null
    const destination: AudioNode = panner ?? bus
    if (panner) panner.connect(bus)
    const shape = this.soundShape(name)

    const oscillator = context.createOscillator()
    const toneGain = context.createGain()
    oscillator.type = shape.type
    oscillator.frequency.setValueAtTime(shape.frequency * pitch, now)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(28, shape.endFrequency * pitch), now + shape.duration)
    toneGain.gain.setValueAtTime(0.0001, now)
    toneGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * force * 0.42), now + Math.min(0.018, shape.duration / 4))
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + shape.duration)
    oscillator.connect(toneGain)
    toneGain.connect(destination)

    const noise = context.createBufferSource()
    noise.buffer = makeNoise(context, Math.max(0.08, shape.duration))
    const filter = context.createBiquadFilter()
    filter.type = name.includes('net') || name.startsWith('crowd-') ? 'lowpass' : 'bandpass'
    filter.frequency.value = name.includes('shot') ? 1600 : name.includes('net') ? 780 : 1100
    const noiseGain = context.createGain()
    noiseGain.gain.setValueAtTime(shape.noise * force, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + shape.duration)
    noise.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(destination)

    const id = this.nextVoiceId++
    const stop = () => {
      try { oscillator.stop() } catch { /* already stopped */ }
      try { noise.stop() } catch { /* already stopped */ }
      this.activeVoices = this.activeVoices.filter((voice) => voice.id !== id)
    }
    this.activeVoices.push({ id, priority, stop })
    oscillator.start(now)
    noise.start(now)
    oscillator.stop(now + shape.duration + 0.04)
    noise.stop(now + shape.duration + 0.04)
    window.setTimeout(() => {
      this.activeVoices = this.activeVoices.filter((voice) => voice.id !== id)
    }, (shape.duration + 0.15) * 1000)
  }

  private soundShape(name: string) {
    if (name.startsWith('ui-')) return { duration: 0.065, frequency: name === 'ui-error' ? 170 : name === 'ui-confirm' ? 620 : 390, endFrequency: name === 'ui-error' ? 90 : 510, type: 'sine' as OscillatorType, noise: 0.008 }
    if (name.includes('goal') || name === 'trophy-won') return { duration: 0.78, frequency: 196, endFrequency: 588, type: 'sawtooth' as OscillatorType, noise: 0.18 }
    if (name === 'kickoff' || name === 'half-time' || name === 'full-time' || name.includes('foul') || name === 'offside') return { duration: name === 'full-time' ? 0.82 : 0.42, frequency: 1780, endFrequency: 2180, type: 'sine' as OscillatorType, noise: 0.008 }
    if (name.includes('post') || name.includes('crossbar')) return { duration: 0.46, frequency: name.includes('crossbar') ? 740 : 610, endFrequency: 380, type: 'sine' as OscillatorType, noise: 0.035 }
    if (name.includes('net')) return { duration: 0.34, frequency: 120, endFrequency: 52, type: 'triangle' as OscillatorType, noise: 0.14 }
    if (name.includes('save') || name.includes('goalkeeper')) return { duration: 0.24, frequency: 105, endFrequency: 48, type: 'triangle' as OscillatorType, noise: 0.12 }
    if (name.includes('shot') || name === 'volley') return { duration: 0.2, frequency: 115, endFrequency: 42, type: 'triangle' as OscillatorType, noise: 0.16 }
    if (name.includes('card') || name.includes('penalty') || name === 'var-decision') return { duration: 0.3, frequency: 880, endFrequency: 560, type: 'square' as OscillatorType, noise: 0.025 }
    if (name.startsWith('crowd-')) return { duration: 0.85, frequency: 145, endFrequency: 220, type: 'sawtooth' as OscillatorType, noise: 0.22 }
    if (name.startsWith('music-') || name === 'cinematic-stinger') return { duration: 1.35, frequency: 147, endFrequency: 294, type: 'sine' as OscillatorType, noise: 0.02 }
    if (name === 'footstep' || name.includes('collision') || name.includes('tackle')) return { duration: 0.13, frequency: 82, endFrequency: 42, type: 'triangle' as OscillatorType, noise: 0.1 }
    return { duration: 0.18, frequency: 160, endFrequency: 70, type: 'triangle' as OscillatorType, noise: 0.05 }
  }

  private makePanner(position: [number, number, number]) {
    const context = this.context
    if (!context) return null
    const panner = context.createPanner()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = 3
    panner.maxDistance = 100
    panner.rolloffFactor = 0.8
    panner.positionX.value = position[0]
    panner.positionY.value = position[1]
    panner.positionZ.value = position[2]
    return panner
  }

  private updateCrowd() {
    const context = this.context
    if (!context || this.crowdGains.length === 0) return
    const state = this.crowdState
    const emotion = clamp(
      state.intensity * 0.34 + state.tension * 0.2 + state.attackThreat * 0.18 +
      state.importance * 0.12 + state.derby * 0.1 + state.capacityRatio * 0.06,
    )
    const home = clamp(0.4 + state.momentum * 0.22 + state.homeSupport * 0.32)
    const away = clamp(0.24 - state.momentum * 0.18 + state.awaySupport * 0.28)
    const values = [
      0.12 + emotion * 0.32,
      0.035 + home * emotion * 0.23,
      0.025 + away * emotion * 0.2,
      0.025 + (state.derby + state.importance) * emotion * 0.11,
    ]
    this.crowdGains.forEach((gain, index) => {
      gain.gain.setTargetAtTime(values[index] ?? 0.04, context.currentTime, 0.55 + index * 0.15)
    })
  }

  private updateBusLevels(transition: number) {
    const context = this.context
    if (!context) return
    const settings = this.settings
    const levels: Record<AudioBusName, number> = {
      master: settings.enabled ? settings.master : 0,
      music: settings.musicEnabled ? settings.music : 0,
      commentary: settings.commentaryEnabled ? settings.commentary : 0,
      crowd: settings.crowd,
      announcer: settings.announcerEnabled ? settings.announcer : 0,
      ball: settings.effects,
      players: settings.effects,
      referee: settings.effects,
      weather: settings.weather,
      environment: settings.effects * 0.7,
      ui: settings.ui,
      cinematics: settings.effects,
      voiceChat: settings.voiceChat,
      replays: settings.effects,
    }
    const snapshot = SNAPSHOTS[this.snapshot]
    BUS_NAMES.forEach((name) => {
      const gain = this.buses.get(name)
      if (!gain) return
      const value = levels[name] * (snapshot[name] ?? 1)
      if (transition <= 0) gain.gain.value = value
      else gain.gain.setTargetAtTime(value, context.currentTime, transition)
    })
  }
}
