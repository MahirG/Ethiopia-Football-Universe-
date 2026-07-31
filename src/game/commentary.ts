import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

interface AmharicCommentaryDirector {
  caption: string
  supported: boolean
  comment: (event: CommentaryEvent, context: CommentaryContext) => void
  clear: () => void
}

const PHRASES: Record<CommentaryEvent, string[]> = {
  intro: [
    'እንኳን ወደ ኢትዮጵያ ፉትቦል ዩኒቨርስ በደህና መጡ። ዛሬ {home} ከ {away} ጋር ይጫወታል።',
    'የዛሬው ታላቅ ጨዋታ፣ {home} ከ {away} ጋር። ሁሉም ነገር ዝግጁ ነው።',
  ],
  kickoff: [
    'የዳኛው ፊሽካ ተሰማ፤ ጨዋታው ተጀመረ!',
    'ኳሱ ተንቀሳቀሰ፤ የዛሬው ጨዋታ በይፋ ተጀምሯል።',
  ],
  pass: [
    'ጥሩ ኳስ ማቀበል።',
    'ኳሱን በጥሩ ቁጥጥር እያንቀሳቀሱ ነው።',
    'ትክክለጛ ፓስ፤ ጥቃቱ ይቀጥላል።',
  ],
  shot: [
    'ወደ ጎል ተመታ!',
    'ኃይለኛ ሙከራ፤ ኳሱ ወደ ግብ እየሄደ ነው!',
    'የጎል ዕድል፤ ተመታ!',
  ],
  save: [
    'ግሩም የግብ ጠባቂ ማዳን!',
    'ግብ ጠባቂው በድንቅ ሁኔታ አዳነው!',
    'አስደናቂ መከላከል፤ ጎሉን አዳነ!',
  ],
  goal: [
    'ጎል! ጎል! ግሩም ጎል ነው!',
    'ጎል! ስታዲየሙ በደስታ ተናወጠ!',
    'ኳሱ መረቡ ውስጥ ነው! አስደናቂ ጎል!',
  ],
  restart: [
    'ጨዋታው ከመሀል ሜዳ ይቀጥላል።',
    'ኳሱ ወደ መሀል ተመልሷል፤ ጨዋታው ይቀጥላል።',
  ],
  halftime: [
    'የመጀመሪያው አጋማሽ ተጠናቀቀ። ተጫዋቾቹ ወደ እረፍት ይሄዳሉ።',
    'የእረፍት ሰዓት ደርሷል፤ የመጀመሪያው አጋማሽ ተጠናቀቀ።',
  ],
  'second-half': [
    'ሁለተኛው አጋማሽ ተጀመረ።',
    'ቡድኖቹ ተመልሰዋል፤ ሁለተኛው አጋማሽ ተጀምሯል።',
  ],
  fulltime: [
    'የመጨረሻው ፊሽካ ተሰማ፤ ጨዋታው ተጠናቀቀ።',
    'ጨዋታው ተጠናቀቀ፤ የዛሬው ውጤት በዚህ ተወስኗል።',
  ],
  'home-win': [
    '{home} ዛሬ ድል አድርጓል። የመጨረሻው ውጤት {homeScore} ለ {awayScore}።',
  ],
  'away-win': [
    '{away} ከሜዳው ውጭ ታላቅ ድል አድርጓል። የመጨረሻው ውጤት {awayScore} ለ {homeScore}።',
  ],
  draw: [
    'ጨዋታው በአቻ ውጤት ተጠናቀቀ። ሁለቱም ቡድኖች ነጥብ ተጋርተዋል።',
  ],
}

const PRIORITY_EVENTS = new Set<CommentaryEvent>(['intro', 'kickoff', 'save', 'goal', 'halftime', 'second-half', 'fulltime', 'home-win', 'away-win', 'draw'])

function seededChoice(event: CommentaryEvent, serial: number) {
  const values = PHRASES[event]
  return values[serial % values.length]
}

function renderPhrase(template: string, context: CommentaryContext) {
  const teamName = context.team === 'home' ? context.homeName : context.awayName
  return template
    .replaceAll('{home}', context.homeName)
    .replaceAll('{away}', context.awayName)
    .replaceAll('{team}', teamName)
    .replaceAll('{homeScore}', String(context.homeScore ?? 0))
    .replaceAll('{awayScore}', String(context.awayScore ?? 0))
}

export function useAmharicCommentary(enabled: boolean, volume: number): AmharicCommentaryDirector {
  const [caption, setCaption] = useState('')
  const [supported, setSupported] = useState(false)
  const captionTimerRef = useRef<number | null>(null)
  const serialRef = useRef(0)
  const lastSpokenRef = useRef<Record<string, number>>({})
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    const synthesis = window.speechSynthesis
    if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') return
    setSupported(true)

    const resolveVoice = () => {
      const voices = synthesis.getVoices()
      voiceRef.current = voices.find((voice) => voice.lang.toLowerCase().startsWith('am'))
        ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
        ?? voices[0]
        ?? null
    }

    resolveVoice()
    synthesis.addEventListener('voiceschanged', resolveVoice)
    return () => synthesis.removeEventListener('voiceschanged', resolveVoice)
  }, [])

  const clear = useCallback(() => {
    if (captionTimerRef.current !== null) window.clearTimeout(captionTimerRef.current)
    captionTimerRef.current = null
    setCaption('')
    window.speechSynthesis?.cancel()
  }, [])

  const comment = useCallback((event: CommentaryEvent, context: CommentaryContext) => {
    const now = performance.now()
    const cooldown = event === 'pass' ? 2600 : event === 'shot' ? 800 : event === 'restart' ? 1800 : 0
    if (cooldown > 0 && now - (lastSpokenRef.current[event] ?? 0) < cooldown) return
    lastSpokenRef.current[event] = now

    serialRef.current += 1
    const text = renderPhrase(seededChoice(event, serialRef.current), context)
    setCaption(text)
    if (captionTimerRef.current !== null) window.clearTimeout(captionTimerRef.current)
    captionTimerRef.current = window.setTimeout(() => {
      captionTimerRef.current = null
      setCaption('')
    }, event === 'goal' ? 6200 : 4300)

    if (!enabled || !supported) return
    const synthesis = window.speechSynthesis
    if (!synthesis) return
    if (PRIORITY_EVENTS.has(event)) synthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'am-ET'
    utterance.voice = voiceRef.current
    utterance.volume = Math.max(0, Math.min(1, volume))
    utterance.rate = event === 'goal' ? 1.02 : 0.9
    utterance.pitch = event === 'goal' ? 1.05 : 0.94
    synthesis.speak(utterance)
  }, [enabled, supported, volume])

  useEffect(() => () => {
    if (captionTimerRef.current !== null) window.clearTimeout(captionTimerRef.current)
    window.speechSynthesis?.cancel()
  }, [])

  return useMemo(() => ({ caption, supported, comment, clear }), [caption, clear, comment, supported])
}
