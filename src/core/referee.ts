import type { CardKind, CorePlayerSnapshot, TeamSide } from './types'
import { evaluateFoul, shouldApplyAdvantage, type FoulEvidence } from './rules'

export interface RefereeProfile {
  strictness: number
  advantagePreference: number
  contactTolerance: number
  cardFrequency: number
  positioning: number
  experience: number
  confidence: number
}

export interface RefereeDecision {
  foul: boolean
  teamAwarded: TeamSide | null
  card: CardKind
  playAdvantage: boolean
  retrospectiveCard: CardKind
  severity: number
  reason: string
}

export class RefereeDecisionEngine {
  private readonly foulCounts = new Map<string, number>()
  constructor(readonly profile: RefereeProfile = { strictness: 0.58, advantagePreference: 0.65, contactTolerance: 0.5, cardFrequency: 0.52, positioning: 0.78, experience: 0.82, confidence: 0.76 }) {}

  assess(tackler: CorePlayerSnapshot, victim: CorePlayerSnapshot, evidence: FoulEvidence, possessionConfidence: number, fieldProgress: number, attackersAhead: number, immediateChance: number): RefereeDecision {
    const repeated = (this.foulCounts.get(tackler.id) ?? 0) >= 2
    const base = evaluateFoul({ ...evidence, repeatedFoul: evidence.repeatedFoul || repeated }, tackler.discipline)
    const adjustedFoul = base.foul && base.severity + this.profile.strictness * 0.12 > this.profile.contactTolerance * 0.24
    if (!adjustedFoul) return { foul: false, teamAwarded: null, card: 'none', playAdvantage: false, retrospectiveCard: 'none', severity: base.severity, reason: 'fair-contact' }
    this.foulCounts.set(tackler.id, (this.foulCounts.get(tackler.id) ?? 0) + 1)
    const advantage = this.profile.advantagePreference > 0.35 && shouldApplyAdvantage(possessionConfidence, fieldProgress, attackersAhead, immediateChance)
    const teamAwarded = victim.team
    return { foul: true, teamAwarded, card: advantage ? 'none' : base.card, playAdvantage: advantage, retrospectiveCard: advantage ? base.card : 'none', severity: base.severity, reason: base.card === 'red' ? 'serious-foul-play' : repeated ? 'persistent-fouling' : evidence.promisingAttack ? 'stopping-promising-attack' : 'careless-or-reckless-contact' }
  }
}
