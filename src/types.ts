export type Language = 'en' | 'am' | 'om' | 'ti'
export type View = 'home' | 'match' | 'online' | 'clubs' | 'career' | 'tactics' | 'competitions' | 'academy' | 'community' | 'database' | 'settings'

export interface Club {
  id: string
  name: string
  shortName: string
  amharicName?: string
  city: string
  region: string
  founded?: number
  tier: 'Premier League' | 'Higher League' | 'Historic / Community'
  colors: [string, string]
  stadium: string
  capacity: number
  reputation: number
  attack: number
  midfield: number
  defense: number
  academy: number
  support: number
  philosophy: string
  honors?: string
}

export interface CareerState {
  clubId: string
  season: number
  week: number
  budget: number
  reputation: number
  morale: number
  fitness: number
  academy: number
  facilities: number
  points: number
  played: number
  wins: number
  draws: number
  losses: number
  objective: string
  news: string[]
}

export interface Prospect {
  id: string
  name: string
  age: number
  position: string
  rating: number
  potential: number
  region: string
  trait: string
}

export interface MatchRecord {
  id: string
  home: string
  away: string
  homeScore: number
  awayScore: number
  date: string
}
