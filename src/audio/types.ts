import type { CameraMode, TeamSide, Weather } from '../game/types'

export type AudioLanguage = 'am' | 'om' | 'en' | 'ti' | 'so'
export type AudioQuality = 'low' | 'medium' | 'high' | 'ultra'
export type DynamicRange = 'night' | 'tv' | 'headphones' | 'home-theatre' | 'full'
export type AudioBusName = 'master' | 'music' | 'commentary' | 'crowd' | 'announcer' | 'ball' | 'players' | 'referee' | 'weather' | 'environment' | 'ui' | 'cinematics' | 'voiceChat' | 'replays'
export type AudioSnapshot = 'main-menu' | 'team-selection' | 'pre-match' | 'normal-match' | 'dangerous-attack' | 'goal-celebration' | 'penalty' | 'var-review' | 'half-time' | 'full-time' | 'replay' | 'pause-menu' | 'trophy-ceremony'

export type FootballAudioEvent =
  | 'match-started' | 'kickoff' | 'ball-kicked' | 'pass-completed' | 'cross' | 'through-ball' | 'first-touch' | 'heavy-touch'
  | 'shot-taken' | 'volley' | 'header' | 'ball-roll' | 'ball-bounce' | 'post-hit' | 'crossbar-hit' | 'net-hit'
  | 'goal-scored' | 'goal-disallowed' | 'own-goal' | 'equalizer' | 'winning-goal' | 'late-goal'
  | 'goalkeeper-catch' | 'goalkeeper-parry' | 'goalkeeper-punch' | 'goalkeeper-punt' | 'save-made'
  | 'foul-committed' | 'serious-foul' | 'penalty-awarded' | 'yellow-card' | 'red-card' | 'offside' | 'advantage' | 'var-review' | 'var-decision'
  | 'substitution' | 'injury' | 'half-time' | 'second-half' | 'full-time' | 'added-time' | 'trophy-won'
  | 'player-call' | 'player-pain' | 'player-celebrate' | 'player-collision' | 'slide-tackle' | 'footstep'
  | 'crowd-chant' | 'crowd-protest' | 'crowd-miss' | 'crowd-save' | 'crowd-card'
  | 'announcer-welcome' | 'announcer-lineup' | 'announcer-goal' | 'announcer-card' | 'announcer-substitution' | 'announcer-result'
  | 'weather-rain' | 'weather-wind' | 'weather-thunder'
  | 'ui-hover' | 'ui-focus' | 'ui-click' | 'ui-back' | 'ui-confirm' | 'ui-error' | 'ui-notification' | 'ui-achievement' | 'ui-tab'
  | 'music-menu' | 'music-pre-match' | 'music-half-time' | 'music-full-time' | 'music-trophy'
  | 'replay-start' | 'replay-end' | 'cinematic-stinger'
  | 'coin-toss' | 'team-entrance' | 'handshake' | 'national-anthem' | 'competition-anthem' | 'moment-silence' | 'trophy-presentation' | 'medal-ceremony' | 'confetti' | 'fireworks' | 'press-conference' | 'dressing-room-celebration'
  | 'career-scouting' | 'career-player-signed' | 'career-transfer-accepted' | 'career-transfer-rejected' | 'career-contract-signed' | 'career-contract-rejected' | 'career-board-warning' | 'career-news' | 'promotion' | 'relegation' | 'qualification' | 'award-ceremony'
  | 'online-match-found' | 'online-disconnected' | 'online-reconnected' | 'voice-chat-activity'

export interface AudioEventContext {
  event: FootballAudioEvent
  time?: number
  team?: TeamSide
  playerName?: string
  homeName?: string
  awayName?: string
  stadiumId?: string
  clubId?: string
  scoreHome?: number
  scoreAway?: number
  matchMinute?: number
  competition?: string
  stage?: string
  importance?: number
  derby?: number
  tension?: number
  attackThreat?: number
  momentum?: number
  force?: number
  speed?: number
  spin?: number
  wetness?: number
  weather?: Weather
  camera?: CameraMode
  replay?: boolean
  position?: [number, number, number]
  metadata?: Record<string, string | number | boolean | undefined>
}

export interface AudioEventDefinition {
  id: string
  event: FootballAudioEvent
  bus: AudioBusName
  priority: number
  cooldownMs: number
  maxInstances: number
  baseVolume: number
  pitchMin: number
  pitchMax: number
  spatial: boolean
  maxDistance: number
  variations: string[]
  tags: string[]
}

export interface CrowdState {
  intensity: number
  homeSupport: number
  awaySupport: number
  tension: number
  attackThreat: number
  momentum: number
  importance: number
  derby: number
  capacityRatio: number
}

export interface StadiumAudioProfile {
  id: string
  name: string
  city: string
  capacity: number
  openness: number
  roofCoverage: number
  crowdProximity: number
  reverbSeconds: number
  earlyReflections: number
  paEchoMs: number
  environment: 'urban' | 'lakeside' | 'highland' | 'warm-dry' | 'green'
  crowdLoudness: number
}

export interface ClubAudioProfile {
  clubId: string
  name: string
  shortName: string
  nickname: string
  city: string
  stadiumId: string
  primaryLanguage: AudioLanguage
  secondaryLanguages: AudioLanguage[]
  homeChants: string[]
  awayChants: string[]
  goalChant: string
  drumStyle: 'kebero' | 'hand-clap' | 'horn-led' | 'mixed'
  crowdEnergy: number
  supporterDensity: number
  loyalty: number
  rivals: string[]
  pronunciation: string
}

export interface AudioSettings {
  enabled: boolean
  master: number
  music: number
  commentary: number
  crowd: number
  announcer: number
  effects: number
  ui: number
  voiceChat: number
  weather: number
  dynamicRange: DynamicRange
  mono: boolean
  commentaryLanguage: AudioLanguage
  announcerLanguage: AudioLanguage
  subtitles: boolean
  closedCaptions: boolean
  visualIndicators: boolean
  quality: AudioQuality
  commentaryEnabled: boolean
  announcerEnabled: boolean
  musicEnabled: boolean
}

export interface AudioProfilerSnapshot {
  started: boolean
  activeVoices: number
  maxVoices: number
  queuedEvents: number
  currentSnapshot: AudioSnapshot
  crowd: CrowdState
  buses: Record<AudioBusName, number>
  lastEvents: string[]
  estimatedMemoryKb: number
  stadiumProfile: string
  homeProfile: string
  awayProfile: string
}
