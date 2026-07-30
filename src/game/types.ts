export type Weather = 'clear' | 'rain' | 'wind'
export type TimeOfDay = 'afternoon' | 'golden' | 'night'
export type CameraMode = 'broadcast' | 'follow' | 'ball' | 'free'
export type TeamSide = 'home' | 'away'
export type Difficulty = 'Academy' | 'Professional' | 'Legendary'

export interface MatchSceneProps {
  running: boolean
  homeColor: string
  awayColor: string
  weather: Weather
  timeOfDay: TimeOfDay
  cameraMode: CameraMode
  difficulty: Difficulty
  onGoal: (team: TeamSide) => void
  onEvent: (message: string) => void
}
