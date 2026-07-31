import { useCallback, useMemo } from 'react'
import { useCommentaryDirector } from '../audio/commentary'
import type { TeamSide } from './types'

export type CommentaryEvent =
  | 'intro'
  | 'kickoff'
  | 'pass'
  | 'shot'
  | 'save'
  | 'goal'
  | 'restart'
  | 'halftime'
  | 'second-half'
  | 'fulltime'
  | 'home-win'
  | 'away-win'
  | 'draw'

interface CommentaryContext {
  team?: TeamSide
  homeName: string
  awayName: string
  homeScore?: number
  awayScore?: number
}

const EVENT_MAP = {
  intro: 'match-started',
  kickoff: 'kickoff',
  pass: 'pass-completed',
  shot: 'shot-taken',
  save: 'save-made',
  goal: 'goal-scored',
  restart: 'second-half',
  halftime: 'half-time',
  'second-half': 'second-half',
  fulltime: 'full-time',
  'home-win': 'full-time',
  'away-win': 'full-time',
  draw: 'full-time',
} as const

export function useAmharicCommentary(enabled: boolean, volume: number) {
  const director = useCommentaryDirector(enabled, volume, 'am')
  const comment = useCallback((event: CommentaryEvent, context: CommentaryContext) => {
    director.speak(EVENT_MAP[event], {
      ...context,
      stadiumName: 'የኢትዮጵያ ስታዲየም',
      competition: 'የኢትዮጵያ ፕሪሚየር ሊግ',
    })
  }, [director])
  return useMemo(() => ({ caption: director.caption, supported: director.supported, comment, clear: director.clear }), [comment, director.caption, director.clear, director.supported])
}
