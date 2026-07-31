import type { FootballAudioEvent } from './types'

const TEST_EVENTS: Array<[FootballAudioEvent, string]> = [
  ['goal-scored', 'Goal'], ['penalty-awarded', 'Penalty'], ['yellow-card', 'Yellow'], ['red-card', 'Red'], ['save-made', 'Save'], ['crowd-chant', 'Chant'], ['var-review', 'VAR'], ['weather-thunder', 'Thunder'], ['trophy-won', 'Trophy'], ['announcer-goal', 'PA goal'],
]

export function AudioEventLab({ trigger }: { trigger: (event: FootballAudioEvent) => void }) {
  return <div className="audio-event-lab">{TEST_EVENTS.map(([event, label]) => <button key={event} onClick={() => trigger(event)}>{label}</button>)}</div>
}
