import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { pronounce } from './pronunciation'
import type { TeamSide } from '../game/types'
import type { AudioLanguage, FootballAudioEvent } from './types'

export interface CommentaryContext {
  team?: TeamSide
  playerName?: string
  homeName: string
  awayName: string
  stadiumName?: string
  competition?: string
  homeScore?: number
  awayScore?: number
  minute?: number
  importance?: number
  derby?: number
  stage?: string
}

interface Line {
  event: FootballAudioEvent
  priority: number
  cooldownMs: number
  text: Partial<Record<AudioLanguage, string[]>>
}

const LINES: Line[] = [
  { event: 'match-started', priority: 80, cooldownMs: 60000, text: {
    am: ['እንኳን ወደ {stadium} በደህና መጡ። ዛሬ {home} ከ {away} ጋር ይጫወታል።', 'በ{competition} የዛሬው ጨዋታ፣ {home} ከ {away} ጋር።'],
    om: ['Baga gara {stadium} nagaan dhuftan. Harʼa {home} fi {away} wal morkatu.'],
    ti: ['እንቋዕ ናብ {stadium} ብደሓን መጻእኩም። ሎሚ {home} ምስ {away} ይጻወት።'],
    so: ['Ku soo dhowaada {stadium}. Maanta {home} waxay la ciyaaraysaa {away}.'],
    en: ['Welcome to {stadium}. Today, {home} face {away}.'],
  } },
  { event: 'kickoff', priority: 85, cooldownMs: 30000, text: { am: ['የዳኛው ፊሽካ ተሰማ፤ ጨዋታው ተጀመረ!', 'ኳሱ ተንቀሳቀሰ፤ ጨዋታው በይፋ ተጀምሯል።'], om: ['Fiingeen dhagaʼame; taphaan jalqabe!'], ti: ['ፊሽካ ተሰሚዑ፤ ጸወታ ጀሚሩ!'], so: ['Foorigii waa dhacay; ciyaartu way bilaabatay!'], en: ['The whistle sounds and the match is underway!'] } },
  { event: 'pass-completed', priority: 20, cooldownMs: 2500, text: { am: ['ጥሩ ኳስ ማቀበል።', 'ትክክለኛ ፓስ፤ ጥቃቱ ይቀጥላል።', '{team} ኳሱን በጥሩ ቁጥጥር እያንቀሳቀሰ ነው።'], om: ['Dabarsa gaarii.', 'Dabarsa sirrii; haleellaan itti fufa.'], ti: ['ጽቡቕ ምትሕልላፍ ኩዕሶ።'], so: ['Baas fiican.', 'Baas sax ah, weerarkuna wuu socdaa.'], en: ['A well-weighted pass.', 'Good circulation as the attack continues.'] } },
  { event: 'through-ball', priority: 42, cooldownMs: 1800, text: { am: ['መከላከያውን የከፈተ ድንቅ ኳስ!', 'በመሀል የገባ አደገኛ ፓስ!'], en: ['A superb through ball splits the defence!'] } },
  { event: 'cross', priority: 44, cooldownMs: 1800, text: { am: ['ኳሱ ወደ ቅጣት ሳጥኑ ተሻገረ!', 'አደገኛ ክሮስ ወደ ግብ አካባቢ!'], en: ['A dangerous cross into the penalty area!'] } },
  { event: 'shot-taken', priority: 68, cooldownMs: 700, text: { am: ['ወደ ጎል ተመታ!', 'ኃይለኛ ሙከራ፤ ኳሱ ወደ ግብ እየሄደ ነው!', '{player} ሞከረ!'], om: ['Gara goolii rukute!', 'Yaalii jabaa!'], ti: ['ናብ ሸቶ ተወቒዑ!', 'ሓያል ፈተነ!'], so: ['Wuxuu ku toogtay goolka!', 'Isku day xooggan!'], en: ['The shot is away!', 'A powerful effort toward goal!'] } },
  { event: 'save-made', priority: 76, cooldownMs: 900, text: { am: ['ግሩም የግብ ጠባቂ ማዳን!', 'ግብ ጠባቂው በድንቅ ሁኔታ አዳነው!', 'አስደናቂ መከላከል፤ ጎሉን አዳነ!'], om: ['Eegumsa goolii dinqisiisaa!'], ti: ['ዘደንቕ ምድሓን ሓላዊ ልዳት!'], so: ['Badbaadin cajiib ah oo goolhayaha ah!'], en: ['A magnificent goalkeeper save!'] } },
  { event: 'goal-scored', priority: 100, cooldownMs: 0, text: { am: ['ጎል! ጎል! {team} ኳሱን መረብ ውስጥ አስገባ!', 'ጎል! ስታዲየሙ በደስታ ፈነዳ! {team} አስቆጥሯል!', 'ኳሱ መረቡ ውስጥ ነው! አስደናቂ ጎል!'], om: ['Goolii! {team} kubbaa saaphana keessa galche!'], ti: ['ሸቶ! {team} ኩዕሶ ኣብ መርበብ ኣእትዩ!'], so: ['Gool! {team} ayaa shabaqa taabtay!'], en: ['Goal! {team} have found the net!'] } },
  { event: 'equalizer', priority: 100, cooldownMs: 0, text: { am: ['አቻ ሆነ! {team} ጨዋታውን ወደ እኩል መለሰ!', 'ጎል! ውጤቱ አንድ ሆነ፤ ጨዋታው እንደገና ተከፈተ!'], en: ['The equalizer! {team} bring the match level!'] } },
  { event: 'winning-goal', priority: 100, cooldownMs: 0, text: { am: ['ወሳኝ ጎል! {team} በመጨረሻዎቹ ደቂቃዎች መሪነቱን ያዘ!', 'ይህ የድል ጎል ሊሆን ይችላል!'], en: ['A potentially decisive winning goal for {team}!'] } },
  { event: 'crowd-miss', priority: 48, cooldownMs: 1400, text: { am: ['እጅግ ቀርቦ ወጣ!', 'ታላቅ ዕድል ጠፋ!'], en: ['So close! A major chance goes begging!'] } },
  { event: 'foul-committed', priority: 62, cooldownMs: 1600, text: { am: ['ዳኛው ጥፋት ብሎ አቁሟል።', 'ጠንካራ ግጭት፤ ፊሽካው ተሰማ።'], en: ['The referee stops play for the foul.'] } },
  { event: 'yellow-card', priority: 72, cooldownMs: 3000, text: { am: ['ቢጫ ካርድ ወጣ።', 'ዳኛው ተጫዋቹን በቢጫ ካርድ አስጠነቀቀ።'], en: ['The referee shows a yellow card.'] } },
  { event: 'red-card', priority: 94, cooldownMs: 3000, text: { am: ['ቀይ ካርድ! ተጫዋቹ ከሜዳ ተሰናብቷል!', 'ትልቅ ውሳኔ፤ ቀይ ካርድ ወጣ!'], en: ['Red card! The player is sent off!'] } },
  { event: 'penalty-awarded', priority: 96, cooldownMs: 3000, text: { am: ['ፔናልቲ! ዳኛው ወደ ነጥቡ ጠቆመ!', 'ትልቅ ዕድል፤ የቅጣት ምት ተሰጠ!'], en: ['Penalty! The referee points to the spot!'] } },
  { event: 'offside', priority: 58, cooldownMs: 1800, text: { am: ['ኦፍሳይድ ተብሏል።', 'ረዳት ዳኛው ባንዲራውን አነሳ።'], en: ['The assistant referee raises the flag for offside.'] } },
  { event: 'substitution', priority: 55, cooldownMs: 5000, text: { am: ['የተጫዋች ቅያሪ ይደረጋል።', '{team} አዲስ ኃይል ወደ ሜዳ እያስገባ ነው።'], en: ['A substitution is being made.'] } },
  { event: 'half-time', priority: 88, cooldownMs: 60000, text: { am: ['የመጀመሪያው አጋማሽ ተጠናቀቀ። ውጤቱ {homeScore} ለ {awayScore}።', 'የእረፍት ሰዓት ደርሷል።'], en: ['Half-time. The score is {homeScore} to {awayScore}.'] } },
  { event: 'second-half', priority: 84, cooldownMs: 60000, text: { am: ['ሁለተኛው አጋማሽ ተጀመረ።', 'ቡድኖቹ ተመልሰዋል፤ ሁለተኛው አጋማሽ ተጀምሯል።'], en: ['The second half is underway.'] } },
  { event: 'full-time', priority: 98, cooldownMs: 60000, text: { am: ['የመጨረሻው ፊሽካ ተሰማ፤ {home} {homeScore} ለ {awayScore} {away}።', 'ጨዋታው ተጠናቀቀ፤ የዛሬው ውጤት {homeScore} ለ {awayScore} ነው።'], en: ['Full-time: {home} {homeScore}, {away} {awayScore}.'] } },
  { event: 'trophy-won', priority: 100, cooldownMs: 60000, text: { am: ['ሻምፒዮን! {team} ዋንጫውን አነሳ!', 'ታሪካዊ ቀን! {team} የውድድሩ አሸናፊ ሆኗል!'], en: ['Champions! {team} lift the trophy!'] } },
]

const LINE_MAP = new Map(LINES.map((line) => [line.event, line]))

function render(template: string, context: CommentaryContext, language: AudioLanguage) {
  const teamName = context.team === 'away' ? context.awayName : context.homeName
  const player = context.playerName ? pronounce(context.playerName, language) : language === 'am' ? 'ተጫዋቹ' : 'the player'
  return template
    .replaceAll('{home}', pronounce(context.homeName, language))
    .replaceAll('{away}', pronounce(context.awayName, language))
    .replaceAll('{team}', pronounce(teamName, language))
    .replaceAll('{player}', player)
    .replaceAll('{stadium}', pronounce(context.stadiumName ?? 'the stadium', language))
    .replaceAll('{competition}', pronounce(context.competition ?? 'Ethiopian Premier League', language))
    .replaceAll('{homeScore}', String(context.homeScore ?? 0))
    .replaceAll('{awayScore}', String(context.awayScore ?? 0))
    .replaceAll('{minute}', String(Math.round(context.minute ?? 0)))
}

function choose<T>(values: T[], history: number) {
  return values[history % values.length]
}

interface VoiceDirector {
  caption: string
  priority: number
  supported: boolean
  speak: (event: FootballAudioEvent, context: CommentaryContext) => void
  clear: () => void
}

export function useCommentaryDirector(enabled: boolean, volume: number, language: AudioLanguage): VoiceDirector {
  const [caption, setCaption] = useState('')
  const [priority, setPriority] = useState(0)
  const [supported, setSupported] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const activePriorityRef = useRef(0)
  const historyRef = useRef(new Map<string, number>())
  const lastUsedRef = useRef(new Map<string, number>())
  const clearTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return
    setSupported(true)
    const resolve = () => {
      const voices = window.speechSynthesis.getVoices()
      const code = language === 'am' ? 'am' : language === 'om' ? 'om' : language === 'ti' ? 'ti' : language === 'so' ? 'so' : 'en'
      voiceRef.current = voices.find((voice) => voice.lang.toLowerCase().startsWith(code)) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ?? voices[0] ?? null
    }
    resolve()
    window.speechSynthesis.addEventListener('voiceschanged', resolve)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', resolve)
  }, [language])

  const clear = useCallback(() => {
    if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current)
    clearTimerRef.current = null
    activePriorityRef.current = 0
    setPriority(0)
    setCaption('')
    window.speechSynthesis?.cancel()
  }, [])

  const speak = useCallback((event: FootballAudioEvent, context: CommentaryContext) => {
    const line = LINE_MAP.get(event)
    if (!line) return
    const now = performance.now()
    const last = lastUsedRef.current.get(event) ?? 0
    if (now - last < line.cooldownMs) return
    if (line.priority < activePriorityRef.current && window.speechSynthesis?.speaking) return
    lastUsedRef.current.set(event, now)
    const key = `${event}:${language}`
    const count = (historyRef.current.get(key) ?? 0) + 1
    historyRef.current.set(key, count)
    const variants = line.text[language] ?? line.text.en ?? []
    if (variants.length === 0) return
    const text = render(choose(variants, count), context, language)
    activePriorityRef.current = line.priority
    setPriority(line.priority)
    setCaption(text)
    if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current)
    clearTimerRef.current = window.setTimeout(() => {
      activePriorityRef.current = 0
      setPriority(0)
      setCaption('')
    }, line.priority >= 90 ? 6500 : 4400)

    if (!enabled || !supported) return
    const synthesis = window.speechSynthesis
    if (line.priority >= activePriorityRef.current) synthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'am' ? 'am-ET' : language === 'om' ? 'om-ET' : language === 'ti' ? 'ti-ET' : language === 'so' ? 'so-SO' : 'en-GB'
    utterance.voice = voiceRef.current
    utterance.volume = Math.max(0, Math.min(1, volume))
    utterance.rate = event.includes('goal') ? 1.05 : 0.92
    utterance.pitch = event.includes('goal') ? 1.04 : 0.96
    utterance.onend = () => { if (activePriorityRef.current === line.priority) activePriorityRef.current = 0 }
    synthesis.speak(utterance)
  }, [enabled, language, supported, volume])

  useEffect(() => () => clear(), [clear])
  return useMemo(() => ({ caption, priority, supported, speak, clear }), [caption, clear, priority, speak, supported])
}

const ANNOUNCER_LINES: Partial<Record<FootballAudioEvent, Partial<Record<AudioLanguage, string>>>> = {
  'announcer-welcome': { am: 'እንኳን ወደ {stadium} በደህና መጡ።', en: 'Welcome to {stadium}.' },
  'announcer-lineup': { am: 'የዛሬው የመጀመሪያ አሰላለፍ በቅርቡ ይቀርባል።', en: 'Today’s starting lineups will be presented shortly.' },
  'announcer-goal': { am: 'ለ{team} ጎል! አስቆጣሪው {player}!', en: 'Goal for {team}! Scored by {player}!' },
  'announcer-card': { am: 'ቢጫ ካርድ ለ{team}።', en: 'Yellow card for {team}.' },
  'announcer-substitution': { am: 'ለ{team} የተጫዋች ቅያሪ።', en: 'Substitution for {team}.' },
  'announcer-result': { am: 'የመጨረሻው ውጤት፣ {home} {homeScore}፣ {away} {awayScore}።', en: 'Final score: {home} {homeScore}, {away} {awayScore}.' },
}

export function useStadiumAnnouncer(enabled: boolean, volume: number, language: AudioLanguage) {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const resolve = () => {
      const voices = window.speechSynthesis.getVoices()
      voiceRef.current = voices.find((voice) => voice.lang.toLowerCase().startsWith(language === 'am' ? 'am' : language)) ?? voices[0] ?? null
    }
    resolve()
    window.speechSynthesis.addEventListener('voiceschanged', resolve)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', resolve)
  }, [language])
  return useCallback((event: FootballAudioEvent, context: CommentaryContext) => {
    const template = ANNOUNCER_LINES[event]?.[language] ?? ANNOUNCER_LINES[event]?.en
    if (!enabled || !template || !('speechSynthesis' in window)) return
    const text = render(template, context, language)
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'am' ? 'am-ET' : language === 'om' ? 'om-ET' : language === 'ti' ? 'ti-ET' : language === 'so' ? 'so-SO' : 'en-GB'
    utterance.voice = voiceRef.current
    utterance.volume = Math.max(0, Math.min(1, volume))
    utterance.rate = 0.82
    utterance.pitch = 0.8
    window.speechSynthesis.speak(utterance)
  }, [enabled, language, volume])
}
