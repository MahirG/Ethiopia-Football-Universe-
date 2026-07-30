export type Weather = 'clear' | 'overcast' | 'rain' | 'wind'
export type TimeOfDay = 'afternoon' | 'golden' | 'night'
export type LiveCameraMode = 'broadcast' | 'auto' | 'follow' | 'ball' | 'free'
export type CameraMode = LiveCameraMode | 'replay'
export type TeamSide = 'home' | 'away'
export type Difficulty = 'Academy' | 'Professional' | 'Legendary'
export type QualityLevel = 'performance' | 'balanced' | 'ultra'

export interface MatchSceneProps {
  running: boolean
  homeColor: string
  homeSecondaryColor: string
  awayColor: string
  awaySecondaryColor: string
  weather: Weather
  timeOfDay: TimeOfDay
  cameraMode: CameraMode
  difficulty: Difficulty
  quality: QualityLevel
  replayToken: number
  replayActive: boolean
  onGoal: (team: TeamSide) => void
  onEvent: (message: string) => void
}
