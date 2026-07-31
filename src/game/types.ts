export type Weather = 'clear' | 'overcast' | 'rain' | 'wind' | 'storm' | 'fog' | 'snow' | 'heat' | 'dust'
export type TimeOfDay = 'dynamic' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'golden' | 'sunset' | 'evening' | 'night' | 'late-night'
export type LiveCameraMode = 'broadcast' | 'auto' | 'follow' | 'ball' | 'free'
export type CameraMode = LiveCameraMode | 'replay'
export type TeamSide = 'home' | 'away'
export type Difficulty = 'Academy' | 'Professional' | 'Legendary'
export type QualityLevel = 'performance' | 'balanced' | 'ultra'
export type PresentationPhase = 'idle' | 'intro' | 'live' | 'halftime' | 'fulltime'
export type MatchAction = 'pass' | 'shot' | 'save'

export interface MatchTelemetry {
  homeTerritory: number
  awayTerritory: number
  ballSpeed: number
  controlledDistance: number
  stamina: number
}

export interface MatchSceneProps {
  running: boolean
  homeColor: string
  homeSecondaryColor: string
  awayColor: string
  awaySecondaryColor: string
  homeName: string
  awayName: string
  weather: Weather
  weatherIntensity: number
  timeOfDay: TimeOfDay
  cameraMode: CameraMode
  difficulty: Difficulty
  quality: QualityLevel
  replayToken: number
  replayActive: boolean
  matchProgress: number
  presentationPhase: PresentationPhase
  celebrationTeam: TeamSide | null
  cameraShake: boolean
  scoreHome: number
  scoreAway: number
  world: import('../world/types').MatchWorldState
  competitiveSettings?: import('../phase5/types').CompetitiveSettings
  manualRestartRequest?: import('../phase5/types').ManualRestartRequest | null
  onGoal: (team: TeamSide) => void
  onEvent: (message: string) => void
  onAction: (action: MatchAction, team: TeamSide) => void
  onTelemetry: (telemetry: MatchTelemetry) => void
  onHumanTelemetry: (telemetry: import('../human/types').HumanTelemetry) => void
  onCompetitiveState?: (state: import('../phase5/types').CompetitiveMatchState) => void
  onCompetitiveEvent?: (event: import('../phase5/types').CompetitiveEvent) => void
  onAudioEvent: (event: import('../audio/types').FootballAudioEvent, context?: Omit<import('../audio/types').AudioEventContext, 'event'>) => void
}
