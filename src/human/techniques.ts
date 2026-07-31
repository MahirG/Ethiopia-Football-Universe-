import type { FootballTechnique, HumanAction, TechniqueDefinition } from './types'

export const TECHNIQUES: Record<FootballTechnique, TechniqueDefinition> = {
  'close-dribble': { id: 'close-dribble', power: 0.72, lift: 0, spin: 0.35, error: 0.72, preparation: 0.05, recovery: 0.14, preferredContact: 'inside' },
  'sprint-dribble': { id: 'sprint-dribble', power: 1.35, lift: 0, spin: 0.18, error: 1.18, preparation: 0.04, recovery: 0.22, preferredContact: 'instep' },
  'protective-touch': { id: 'protective-touch', power: 0.58, lift: 0, spin: 0.12, error: 0.62, preparation: 0.07, recovery: 0.18, preferredContact: 'sole' },
  'short-pass': { id: 'short-pass', power: 0.9, lift: 0.02, spin: 0.2, error: 0.75, preparation: 0.1, recovery: 0.24, preferredContact: 'inside' },
  'driven-pass': { id: 'driven-pass', power: 1.25, lift: 0.04, spin: 0.12, error: 1.02, preparation: 0.14, recovery: 0.3, preferredContact: 'instep' },
  'through-ball': { id: 'through-ball', power: 1.05, lift: 0.03, spin: 0.22, error: 0.9, preparation: 0.12, recovery: 0.26, preferredContact: 'inside' },
  'lofted-pass': { id: 'lofted-pass', power: 1.08, lift: 0.38, spin: 0.28, error: 1.08, preparation: 0.18, recovery: 0.34, preferredContact: 'instep' },
  cross: { id: 'cross', power: 1.14, lift: 0.26, spin: 0.48, error: 1.04, preparation: 0.16, recovery: 0.34, preferredContact: 'inside' },
  backheel: { id: 'backheel', power: 0.72, lift: 0.02, spin: 0.18, error: 1.35, preparation: 0.1, recovery: 0.28, preferredContact: 'outside' },
  'power-shot': { id: 'power-shot', power: 1.2, lift: 0.13, spin: 0.18, error: 1.08, preparation: 0.15, recovery: 0.45, preferredContact: 'instep' },
  'placed-shot': { id: 'placed-shot', power: 0.88, lift: 0.08, spin: 0.26, error: 0.7, preparation: 0.13, recovery: 0.38, preferredContact: 'inside' },
  'finesse-shot': { id: 'finesse-shot', power: 0.82, lift: 0.12, spin: 0.66, error: 0.82, preparation: 0.18, recovery: 0.42, preferredContact: 'inside' },
  'chip-shot': { id: 'chip-shot', power: 0.62, lift: 0.55, spin: 0.34, error: 1.08, preparation: 0.19, recovery: 0.38, preferredContact: 'instep' },
  volley: { id: 'volley', power: 1.12, lift: 0.12, spin: 0.22, error: 1.42, preparation: 0.2, recovery: 0.5, preferredContact: 'instep' },
  'half-volley': { id: 'half-volley', power: 1.08, lift: 0.15, spin: 0.2, error: 1.32, preparation: 0.18, recovery: 0.48, preferredContact: 'instep' },
  header: { id: 'header', power: 0.84, lift: 0.08, spin: 0.06, error: 1.08, preparation: 0.18, recovery: 0.4, preferredContact: 'head' },
  clearance: { id: 'clearance', power: 1.22, lift: 0.28, spin: 0.12, error: 1.3, preparation: 0.12, recovery: 0.42, preferredContact: 'instep' },
  'poke-tackle': { id: 'poke-tackle', power: 0.72, lift: 0, spin: 0.08, error: 1.02, preparation: 0.08, recovery: 0.3, preferredContact: 'toe' },
  'slide-tackle': { id: 'slide-tackle', power: 1.08, lift: 0.04, spin: 0.1, error: 1.3, preparation: 0.13, recovery: 0.72, preferredContact: 'instep' },
  'keeper-catch': { id: 'keeper-catch', power: 0.12, lift: 0, spin: 0, error: 0.5, preparation: 0.08, recovery: 0.4, preferredContact: 'glove' },
  'keeper-parry': { id: 'keeper-parry', power: 0.9, lift: 0.18, spin: 0.08, error: 0.9, preparation: 0.06, recovery: 0.52, preferredContact: 'glove' },
  'keeper-throw': { id: 'keeper-throw', power: 1.02, lift: 0.14, spin: 0.16, error: 0.72, preparation: 0.18, recovery: 0.44, preferredContact: 'glove' },
}

export function defaultTechnique(action: HumanAction, ballHeight = 0, sprinting = false): FootballTechnique {
  if (action === 'shoot') return ballHeight > 0.62 ? 'volley' : 'power-shot'
  if (action === 'pass') return ballHeight > 0.52 ? 'lofted-pass' : 'short-pass'
  if (action === 'clear') return 'clearance'
  if (action === 'tackle' || action === 'intercept') return sprinting ? 'slide-tackle' : 'poke-tackle'
  if (action === 'goalkeeper-claim') return 'keeper-catch'
  return sprinting ? 'sprint-dribble' : 'close-dribble'
}
