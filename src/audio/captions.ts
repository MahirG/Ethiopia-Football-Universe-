import type { FootballAudioEvent } from './types'

export const CLOSED_CAPTIONS: Partial<Record<FootballAudioEvent, string>> = {
  kickoff: '[Referee whistle]',
  'half-time': '[Long referee whistle]',
  'full-time': '[Final whistle sequence]',
  'goal-scored': '[Crowd erupts · drums and horns]',
  'save-made': '[Goalkeeper parries the ball · crowd reacts]',
  'post-hit': '[Ball strikes the post]',
  'crossbar-hit': '[Ball strikes the crossbar]',
  'net-hit': '[Ball hits the net]',
  'crowd-chant': '[Supporters chanting]',
  'weather-rain': '[Rain falling across the stadium]',
  'weather-thunder': '[Thunder in the distance]',
  'announcer-goal': '[Stadium announcement over loudspeakers]',
}
