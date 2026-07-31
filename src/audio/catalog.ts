import type { AudioBusName, AudioEventDefinition, FootballAudioEvent } from './types'

const busFor = (event: FootballAudioEvent): AudioBusName => {
  if (event.startsWith('ui-') || event.startsWith('career-') || event.startsWith('online-')) return 'ui'
  if (event.startsWith('music-') || event.includes('anthem')) return 'music'
  if (event.startsWith('announcer-')) return 'announcer'
  if (event === 'trophy-presentation' || event === 'medal-ceremony' || event === 'award-ceremony' || event === 'confetti' || event === 'fireworks' || event === 'team-entrance' || event === 'handshake' || event === 'coin-toss' || event === 'press-conference' || event === 'dressing-room-celebration') return 'cinematics'
  if (event === 'voice-chat-activity') return 'voiceChat'
  if (event.startsWith('weather-')) return 'weather'
  if (event.startsWith('crowd-') || event.includes('goal') || event === 'trophy-won') return 'crowd'
  if (event.startsWith('replay-')) return 'replays'
  if (event.includes('foul') || event.includes('card') || event === 'offside' || event === 'kickoff' || event === 'half-time' || event === 'full-time') return 'referee'
  if (event.startsWith('player-') || event === 'slide-tackle' || event === 'footstep') return 'players'
  return 'ball'
}

const frequent = new Set<FootballAudioEvent>(['ball-kicked', 'pass-completed', 'first-touch', 'ball-roll', 'ball-bounce', 'footstep'])
const critical = new Set<FootballAudioEvent>(['goal-scored', 'penalty-awarded', 'red-card', 'winning-goal', 'trophy-won'])

export const ALL_AUDIO_EVENTS: FootballAudioEvent[] = [
  'match-started','kickoff','ball-kicked','pass-completed','cross','through-ball','first-touch','heavy-touch','shot-taken','volley','header','ball-roll','ball-bounce','post-hit','crossbar-hit','net-hit','goal-scored','goal-disallowed','own-goal','equalizer','winning-goal','late-goal','goalkeeper-catch','goalkeeper-parry','goalkeeper-punch','goalkeeper-punt','save-made','foul-committed','serious-foul','penalty-awarded','yellow-card','red-card','offside','advantage','var-review','var-decision','substitution','injury','half-time','second-half','full-time','added-time','trophy-won','player-call','player-pain','player-celebrate','player-collision','slide-tackle','footstep','crowd-chant','crowd-protest','crowd-miss','crowd-save','crowd-card','announcer-welcome','announcer-lineup','announcer-goal','announcer-card','announcer-substitution','announcer-result','weather-rain','weather-wind','weather-thunder','ui-hover','ui-focus','ui-click','ui-back','ui-confirm','ui-error','ui-notification','ui-achievement','ui-tab','music-menu','music-pre-match','music-half-time','music-full-time','music-trophy','replay-start','replay-end','cinematic-stinger','coin-toss','team-entrance','handshake','national-anthem','competition-anthem','moment-silence','trophy-presentation','medal-ceremony','confetti','fireworks','press-conference','dressing-room-celebration','career-scouting','career-player-signed','career-transfer-accepted','career-transfer-rejected','career-contract-signed','career-contract-rejected','career-board-warning','career-news','promotion','relegation','qualification','award-ceremony','online-match-found','online-disconnected','online-reconnected','voice-chat-activity'
]

export const AUDIO_EVENT_DEFINITIONS: AudioEventDefinition[] = ALL_AUDIO_EVENTS.map((event) => ({
  id: `efu.${event}`,
  event,
  bus: busFor(event),
  priority: critical.has(event) ? 100 : event.includes('goal') ? 92 : event.includes('card') || event.includes('penalty') ? 84 : event.includes('shot') || event.includes('save') ? 72 : event.startsWith('ui-') ? 20 : 44,
  cooldownMs: frequent.has(event) ? 120 : event === 'crowd-chant' ? 8000 : 450,
  maxInstances: frequent.has(event) ? 5 : 2,
  baseVolume: event.startsWith('ui-') ? 0.28 : critical.has(event) ? 0.95 : 0.68,
  pitchMin: frequent.has(event) ? 0.93 : 0.97,
  pitchMax: frequent.has(event) ? 1.07 : 1.03,
  spatial: !event.startsWith('ui-') && !event.startsWith('music-') && !event.startsWith('announcer-') && !event.startsWith('crowd-'),
  maxDistance: event.startsWith('player-') ? 30 : 80,
  variations: Array.from({ length: frequent.has(event) ? 16 : event.includes('goal') ? 12 : 8 }, (_, index) => `${event}.${String(index + 1).padStart(2, '0')}`),
  tags: [busFor(event), critical.has(event) ? 'critical' : 'standard', 'procedural-placeholder'],
}))

export const AUDIO_EVENT_MAP = new Map(AUDIO_EVENT_DEFINITIONS.map((definition) => [definition.event, definition]))
