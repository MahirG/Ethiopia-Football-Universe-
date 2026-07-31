import { useCallback, useEffect, useMemo } from 'react'
import type { TeamSide, Weather } from '../game/types'
import { useCommentaryDirector, useStadiumAnnouncer, type CommentaryContext } from './commentary'
import { clubAudioProfile, stadiumProfile } from './profiles'
import type { AudioEventContext, AudioSettings, AudioSnapshot, CrowdState, FootballAudioEvent } from './types'
import { useGlobalAudio } from './AudioProvider'

interface MatchIdentity {
  homeId: string
  awayId: string
  homeName: string
  awayName: string
  stadiumName: string
  competition: string
}

export function useFootballAudio(settings: AudioSettings, identity: MatchIdentity) {
  const { engine, profile } = useGlobalAudio()
  const commentary = useCommentaryDirector(settings.commentaryEnabled, settings.commentary, settings.commentaryLanguage)
  const announce = useStadiumAnnouncer(settings.announcerEnabled, settings.announcer, settings.announcerLanguage)

  useEffect(() => {
    engine.updateSettings(settings)
  }, [engine, settings])

  useEffect(() => {
    engine.configureMatch(stadiumProfile(identity.stadiumName), clubAudioProfile(identity.homeId), clubAudioProfile(identity.awayId))
  }, [engine, identity.awayId, identity.homeId, identity.stadiumName])


  const context = useCallback((extra: Partial<CommentaryContext> = {}): CommentaryContext => ({
    homeName: identity.homeName,
    awayName: identity.awayName,
    stadiumName: identity.stadiumName,
    competition: identity.competition,
    ...extra,
  }), [identity.awayName, identity.competition, identity.homeName, identity.stadiumName])

  const ensureStarted = useCallback(() => engine.ensureStarted(), [engine])
  const emit = useCallback((event: FootballAudioEvent, payload: Omit<AudioEventContext, 'event'> = {}) => {
    engine.emit({ event, ...payload })
    const team = payload.team
    if (event === 'goal-scored') {
      const nextHome = (payload.scoreHome ?? 0) + (team === 'home' ? 1 : 0)
      const nextAway = (payload.scoreAway ?? 0) + (team === 'away' ? 1 : 0)
      const contextual = payload.matchMinute && payload.matchMinute > 78 && nextHome !== nextAway ? 'winning-goal' : nextHome === nextAway ? 'equalizer' : 'goal-scored'
      commentary.speak(contextual, context({ team, homeScore: nextHome, awayScore: nextAway, minute: payload.matchMinute }))
      announce('announcer-goal', context({ team, playerName: payload.playerName, homeScore: nextHome, awayScore: nextAway }))
    } else if (event === 'yellow-card') {
      commentary.speak(event, context({ team, minute: payload.matchMinute }))
      announce('announcer-card', context({ team }))
    } else if (event === 'substitution') {
      commentary.speak(event, context({ team, playerName: payload.playerName }))
      announce('announcer-substitution', context({ team, playerName: payload.playerName }))
    } else {
      commentary.speak(event, context({ team, playerName: payload.playerName, homeScore: payload.scoreHome, awayScore: payload.scoreAway, minute: payload.matchMinute }))
    }
  }, [announce, commentary, context, engine])

  const setSnapshot = useCallback((snapshot: AudioSnapshot, transition?: number) => engine.setSnapshot(snapshot, transition), [engine])
  const setCrowd = useCallback((state: Partial<CrowdState>) => engine.setCrowd(state), [engine])
  const setWeather = useCallback((weather: Weather, intensity: number) => engine.setWeather(weather, intensity), [engine])
  const announceWelcome = useCallback(() => announce('announcer-welcome', context()), [announce, context])
  const announceResult = useCallback((homeScore: number, awayScore: number) => announce('announcer-result', context({ homeScore, awayScore })), [announce, context])
  const clearVoices = useCallback(() => commentary.clear(), [commentary])

  return useMemo(() => ({
    ensureStarted,
    emit,
    setSnapshot,
    setCrowd,
    setWeather,
    announceWelcome,
    announceResult,
    clearVoices,
    caption: commentary.caption,
    commentaryPriority: commentary.priority,
    speechSupported: commentary.supported,
    profile,
  }), [announceResult, announceWelcome, clearVoices, commentary.caption, commentary.priority, commentary.supported, emit, ensureStarted, profile, setCrowd, setSnapshot, setWeather])
}

export function teamMomentum(homeScore: number, awayScore: number, team: TeamSide) {
  const difference = team === 'home' ? homeScore - awayScore : awayScore - homeScore
  return Math.max(-1, Math.min(1, difference / 2))
}
