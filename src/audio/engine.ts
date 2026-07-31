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

const BUS_NAMES: AudioBusName[] = ['master','music','commentary','crowd','announcer','ball','players','referee','weather','environment','ui','cinematics','voiceChat','replays']

const SNAPSHOT_LEVELS: Record<AudioSnapshot, Partial<Record<AudioBusName, number>>> = {
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

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value))
}

function noiseBuffer(context: AudioContext, duration: number, color: 'white' | 'pink' = 'pink') {
  const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1
    last = color === 'pink' ? last * 0.975 + white * 0.025 : white
    data[index] = color === 'pink' ? last * 0.8 + white * 0.1 : white
  }
  return buffer
}

export class FootballAudioEngine {
  readonly events = new FootballAudioEventBus()
  private context: AudioContext | null = null
  private buses = new Map<AudioBusName, GainNode>()
  private masterCompressor: DynamicsCompressorNode | null = null
  private settings: AudioSettings
  private crowdState: CrowdState = { intensity: 0.28, homeSupport: 0.68, awaySupport: 0.36, tension: 0.2, attackThreat: 0, momentum: 0, importance: 0.55, derby: 0, capacityRatio: 0.8 }
  private snapshot: AudioSnapshot = 'normal-match'
  private stadium: StadiumAudioProfile | null = null
  private homeClub: ClubAudioProfile | null = null
  private awayClub: ClubAudioProfile | null = null
  private activeVoices: ActiveVoice[] = []
  private nextVoiceId = 1
  private cooldowns = new Map<string, number>()
  private lastEvents: string[] = []
  private continuous: AudioBufferSourceNode[] = []
  private crowdGains: GainNode[] = []
  private weatherGain: GainNode | null = null
  private queued = 0
  private maxVoices = 32
  private unsubscribe: (() => void) | null = null

  constructor(settings: AudioSettings) {
    this.settings = settings
    this.maxVoices = settings.quality === 'low' ? 16 : settings.quality === 'medium' ? 24 : settings.quality === 'high' ? 36 : 48
    this.unsubscribe = this.events.on('*', (event) => this.handle(event))
  }

  async ensureStarted() {
    if (!this.settings.enabled) return
    if (!this.context) this.createGraph()
    if (this.context?.state === 'suspended') await this.context.resume()
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
    this.context = context
    this.masterCompressor = compressor

    const master = context.createGain()
    master.connect(compressor)
    this.buses.set('master', master)
    for (const name of BUS_NAMES.filter((name) => name !== 'master')) {
      const gain = context.createGain()
      gain.connect(master)
      this.buses.set(name, gain)
    }
    this.updateBusLevels(0)
    this.startCrowdLayers()
    this.startEnvironmentLayers()
  }

  private startCrowdLayers() {
    const context = this.context
    const crowdBus = this.buses.get('crowd')
    if (!context || !crowdBus) return
    this.crowdGains = []
    const layers = [
      { cutoff: 720, gain: 0.28, playback: 0.91 },
      { cutoff: 1180, gain: 0.16, playback: 1.04 },
      { cutoff: 1850, gain: 0.08, playback: 1.17 },
      { cutoff: 460, gain: 0.12, playback: 0.78 },
    ]
    layers.slice(0, this.settings.quality === 'low' ? 2 : this.settings.quality === 'medium' ? 3 : 4).forEach((layer, index) => {
      const source = context.createBufferSource()
      source.buffer = noiseBuffer(context, 5.5 + index, 'pink')
      source.loop = true
      source.playbackRate.value = layer.playback
      const filter = context.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = layer.cutoff
      filter.Q.value = 0.45 + index * 0.22
      const gain = context.createGain()
      gain.gain.value = layer.gain
      source.connect(filter)
      filter.connect(gain)
      gain.connect(crowdBus)
      source.start()
      this.continuous.push(source)
      this.crowdGains.push(gain)
    })
  }

  private startEnvironmentLayers() {
    const context = this.context
    const weatherBus = this.buses.get('weather')
    if (!context || !weatherBus) return
    const source = context.createBufferSource()
    source.buffer = noiseBuffer(context, 4.25, 'white')
    source.loop = true
    const highpass = context.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 2900
    const gain = context.createGain()
    gain.gain.value = 0
    source.connect(highpass)
    highpass.connect(gain)
    gain.connect(weatherBus)
    source.start()
    this.continuous.push(source)
    this.weatherGain = gain
  }

  configureMatch(stadium: StadiumAudioProfile, home: ClubAudioProfile, away: ClubAudioProfile) {
    this.stadium = stadium
    this.homeClub = home
    this.awayClub = away
    this.crowdState.homeSupport = home.crowdEnergy
    this.crowdState.awaySupport = away.crowdEnergy * 0.58
    this.crowdState.capacityRatio = clamp((stadium.capacity || 12000) / 40000, 0.35, 1)
    this.updateCrowd()
  }

  updateSettings(settings: AudioSettings) {
    this.settings = settings
    this.maxVoices = settings.quality === 'low' ? 16 : settings.quality === 'medium' ? 24 : settings.quality === 'high' ? 36 : 48
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
    const context = this.context
    if (!context || !this.weatherGain) return
    const target = weather === 'rain' ? 0.24 * intensity : weather === 'wind' ? 0.11 * intensity : weather === 'overcast' ? 0.025 : 0
    this.weatherGain.gain.setTargetAtTime(target, context.currentTime, 0.8)
  }

  emit(context: AudioEventContext) {
    this.events.emit({ ...context, time: performance.now() })
  }

  private handle(context: AudioEventContext) {
    const definition = AUDIO_EVENT_MAP.get(context.event)
    if (!definition || !this.context || !this.settings.enabled) return
    const nowMs = performance.now()
    const key = `${definition.id}:${context.team ?? 'neutral'}`
    if (nowMs < (this.cooldowns.get(key) ?? 0)) return
    this.cooldowns.set(key, nowMs + definition.cooldownMs)
    this.lastEvents = [`${context.event}${context.team ? `:${context.team}` : ''}`, ...this.lastEvents].slice(0, 10)
    this.queued += 1
    queueMicrotask(() => {
      this.queued = Math.max(0, this.queued - 1)
      this.playProcedural(context, definition.priority, definition.bus, definition.baseVolume)
    })
    this.reactMix(context)
  }

  private reactMix(context: AudioEventContext) {
    if (context.event === 'goal-scored' || context.event === 'winning-goal' || context.event === 'equalizer') {
      this.setSnapshot('goal-celebration', 0.12)
      this.setCrowd({ intensity: 1, tension: 0.72, momentum: context.team === 'home' ? 1 : -1 })
      window.setTimeout(() => this.setSnapshot('normal-match', 1.2), 4200)
    } else if (context.event === 'shot-taken' || context.event === 'penalty-awarded') {
      this.setCrowd({ attackThreat: 1, tension: Math.max(this.crowdState.tension, 0.78) })
    } else if (context.event === 'replay-start') this.setSnapshot('replay', 0.18)
    else if (context.event === 'replay-end') this.setSnapshot('normal-match', 0.45)
    else if (context.event === 'half-time') this.setSnapshot('half-time', 0.5)
    else if (context.event === 'full-time') this.setSnapshot('full-time', 0.25)
    else if (context.event === 'penalty-awarded') this.setSnapshot('penalty', 0.2)
    else if (context.event === 'var-review') this.setSnapshot('var-review', 0.2)
  }

  private playProcedural(event: AudioEventContext, priority: number, busName: AudioBusName, volume: number) {
    const context = this.context
    const bus = this.buses.get(busName)
    if (!context || !bus) return
    if (this.activeVoices.length >= this.maxVoices) {
      const weakest = [...this.activeVoices].sort((a, b) => a.priority - b.priority)[0]
      if (!weakest || weakest.priority > priority) return
      weakest.stop()
    }

    const now = context.currentTime
    const eventName = event.event
    const force = clamp(event.force ?? (eventName.includes('shot') ? 0.92 : 0.54))
    const randomPitch = 0.94 + Math.random() * 0.12
    const spatial = event.position ? this.makeSpatial(event.position, event.metadata?.listenerX as number | undefined, event.metadata?.listenerZ as number | undefined) : null
    const destination: AudioNode = spatial ?? bus
    if (spatial) spatial.connect(bus)

    let duration = 0.18
    let frequency = 160
    let endFrequency = 70
    let type: OscillatorType = 'triangle'
    let noise = 0.05

    if (eventName.startsWith('ui-')) { duration = 0.065; frequency = eventName === 'ui-error' ? 170 : eventName === 'ui-confirm' ? 620 : 390; endFrequency = eventName === 'ui-error' ? 90 : 510; type = 'sine'; noise = 0.008 }
    else if (eventName.includes('goal') || eventName === 'trophy-won') { duration = 0.78; frequency = 196; endFrequency = 588; type = 'sawtooth'; noise = 0.18 }
    else if (eventName.includes('whistle') || eventName === 'kickoff' || eventName === 'half-time' || eventName === 'full-time' || eventName.includes('foul') || eventName === 'offside') { duration = eventName === 'full-time' ? 0.82 : 0.42; frequency = 1780; endFrequency = 2180; type = 'sine'; noise = 0.008 }
    else if (eventName.includes('post') || eventName.includes('crossbar')) { duration = 0.46; frequency = eventName.includes('crossbar') ? 740 : 610; endFrequency = 380; type = 'sine'; noise = 0.035 }
    else if (eventName.includes('net')) { duration = 0.34; frequency = 120; endFrequency = 52; type = 'triangle'; noise = 0.14 }
    else if (eventName.includes('save') || eventName.includes('goalkeeper')) { duration = 0.24; frequency = 105; endFrequency = 48; type = 'triangle'; noise = 0.12 }
    else if (eventName.includes('shot') || eventName === 'volley') { duration = 0.2; frequency = 115; endFrequency = 42; type = 'triangle'; noise = 0.16 }
    else if (eventName.includes('card') || eventName.includes('penalty') || eventName === 'var-decision') { duration = 0.3; frequency = 880; endFrequency = 560; type = 'square'; noise = 0.025 }
    else if (eventName.startsWith('crowd-')) { duration = 0.85; frequency = 145; endFrequency = 220; type = 'sawtooth'; noise = 0.22 }
    else if (eventName.startsWith('music-') || eventName === 'cinematic-stinger') { duration = 1.35; frequency = 147; endFrequency = 294; type = 'sine'; noise = 0.02 }
    else if (eventName === 'footstep' || eventName.includes('collision') || eventName.includes('tackle')) { duration = 0.13; frequency = 82; endFrequency = 42; type = 'triangle'; noise = 0.1 }

    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency * randomPitch, now)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(28, endFrequency * randomPitch), now + duration)
    envelope.gain.setValueAtTime(0.0001, now)
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * force * 0.42), now + Math.min(0.018, duration / 4))
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(envelope)
    envelope.connect(destination)

    const noiseSource = context.createBufferSource()
    noiseSource.buffer = noiseBuffer(context, Math.max(0.08, duration), 'white')
    const noiseFilter = context.createBiquadFilter()
    noiseFilter.type = eventName.includes('net') || eventName.startsWith('crowd-') ? 'lowpass' : 'bandpass'
    noiseFilter.frequency.value = eventName.includes('shot') ? 1600 : eventName.includes('net') ? 780 : 1100
    const noiseEnvelope = context.createGain()
    noiseEnvelope.gain.setValueAtTime(noise * force, now)
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseEnvelope)
    noiseEnvelope.connect(destination)

    oscillator.start(now)
    noiseSource.start(now)
    const voiceId = this.nextVoiceId++
    const stop = () => {
      try { oscillator.stop() } catch { /* already stopped */ }
      try { noiseSource.stop() } catch { /* already stopped */ }
      this.activeVoices = this.activeVoices.filter((voice) => voice.id !== voiceId)
    }
    this.activeVoices.push({ id: voiceId, priority, stop })
    oscillator.stop(now + duration + 0.04)
    noiseSource.stop(now + duration + 0.04)
    window.setTimeout(() => { this.activeVoices = this.activeVoices.filter((voice) => voice.id !== voiceId) }, (duration + 0.15) * 1000)
  }

  private makeSpatial(position: [number, number, number], listenerX = 0, listenerZ = 0) {
    const context = this.context
    if (!context) return null
    const panner = context.createPanner()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = 3
    panner.maxDistance = 100
    panner.rolloffFactor = 0.8
    panner.positionX.value = position[0] - listenerX
    panner.positionY.value = position[1]
    panner.positionZ.value = position[2] - listenerZ
    return panner
  }

  private updateCrowd() {
    const context = this.context
    if (!context || this.crowdGains.length === 0) return
    const state = this.crowdState
    const emotional = clamp(state.intensity * 0.34 + state.tension * 0.2 + state.attackThreat * 0.18 + state.importance * 0.12 + state.derby * 0.1 + state.capacityRatio * 0.06)
    const homeBias = clamp(0.4 + state.momentum * 0.22 + state.homeSupport * 0.32)
    const awayBias = clamp(0.24 - state.momentum * 0.18 + state.awaySupport * 0.28)
    const values = [0.12 + emotional * 0.32, 0.035 + homeBias * emotional * 0.23, 0.025 + awayBias * emotional * 0.2, 0.025 + (state.derby + state.importance) * emotional * 0.11]
    this.crowdGains.forEach((gain, index) => gain.gain.setTargetAtTime(values[index] ?? 0.04, context.currentTime, 0.55 + index * 0.15))
  }

  private updateBusLevels(transition: number) {
    const context = this.context
    if (!context) return
    const settings = this.settings
    const buses: Record<AudioBusName, number> = {
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
    const snapshot = SNAPSHOT_LEVELS[this.snapshot]
    BUS_NAMES.forEach((name) => {
      const gain = this.buses.get(name)
      if (!gain) return
      const value = buses[name] * (snapshot[name] ?? 1)
      if (transition <= 0) gain.gain.value = value
      else gain.gain.setTargetAtTime(value, context.currentTime, transition)
    })
  }

  profile(): AudioProfilerSnapshot {
    const settings = this.settings
    const levels: Record<AudioBusName, number> = {
      master: settings.master, music: settings.music, commentary: settings.commentary, crowd: settings.crowd, announcer: settings.announcer,
      ball: settings.effects, players: settings.effects, referee: settings.effects, weather: settings.weather, environment: settings.effects * 0.7,
      ui: settings.ui, cinematics: settings.effects, voiceChat: settings.voiceChat, replays: settings.effects,
    }
    return {
      started: Boolean(this.context),
      activeVoices: this.activeVoices.length,
      maxVoices: this.maxVoices,
      queuedEvents: this.queued,
      currentSnapshot: this.snapshot,
      crowd: { ...this.crowdState },
      buses: levels,
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
    this.continuous.forEach((source) => { try { source.stop() } catch { /* already stopped */ } })
    this.activeVoices.forEach((voice) => voice.stop())
    this.continuous = []
    this.activeVoices = []
    const context = this.context
    this.context = null
    this.buses.clear()
    if (context) void context.close()
  }
}
