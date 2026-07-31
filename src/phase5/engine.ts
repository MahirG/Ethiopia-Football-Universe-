import * as THREE from 'three'
import { HALF_LENGTH } from '../game/config'
import type { TeamSide } from '../game/types'
import type { PlayerRuntimeState } from '../human/types'
import { buildAssetPipelineReport } from './assets'
import { DEFAULT_COMPETITIVE_SETTINGS, getRefereeProfile, getSetPieceRoutine, getTacticalPreset } from './catalog'
import {
  chooseFoulRestart,
  classifyBoundaryExit,
  defensiveOffsideLine,
  evaluateOffsideCandidate,
  oppositeTeam,
  resolveCard,
  resolveVarOutcome,
  restartLabel,
  shouldApplyAdvantage,
} from './laws'
import { inferPossession, inferTacticalPhase, measureTeamShape } from './tactics'
import type {
  BallDirective,
  CompetitiveEvent,
  CompetitiveMatchState,
  CompetitiveSettings,
  CompetitiveTickContext,
  CompetitiveTickResult,
  ManualRestartRequest,
  Phase5BallContact,
  Phase5FoulContact,
  RestartState,
  RestartType,
  VarReviewState,
} from './types'

function emptyRestartCounts(): Record<RestartType, number> {
  return { kickoff: 0, 'throw-in': 0, corner: 0, 'goal-kick': 0, 'direct-free-kick': 0, 'indirect-free-kick': 0, penalty: 0, 'drop-ball': 0 }
}

function initialState(settings: CompetitiveSettings): CompetitiveMatchState {
  const home = getTacticalPreset(settings.homeTacticId)
  const away = getTacticalPreset(settings.awayTacticId)
  return {
    sequence: 0,
    playState: 'pre-match',
    possession: null,
    restart: null,
    advantage: null,
    varReview: null,
    pendingOffside: null,
    lastDecision: 'play-on',
    lastMessage: 'Competitive match director ready',
    cards: [],
    fouls: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 },
    penalties: { home: 0, away: 0 },
    restarts: emptyRestartCounts(),
    addedTimeMinutes: 0,
    tacticalPhase: { home: 'build-up', away: 'mid-block' },
    eventLog: [],
    telemetry: {
      home: { phase: 'build-up', lineHeight: home.lineHeight, width: home.width, compactness: home.compactness, pressIntensity: home.pressIntensity, averageX: 0, averageZ: 0 },
      away: { phase: 'mid-block', lineHeight: away.lineHeight, width: away.width, compactness: away.compactness, pressIntensity: away.pressIntensity, averageX: 0, averageZ: 0 },
      offsideLineHome: HALF_LENGTH,
      offsideLineAway: -HALF_LENGTH,
      refereeDistanceToBall: 9,
      stoppageSeconds: 0,
      reviewCount: 0,
      restartCount: 0,
      passOffsideCandidates: 0,
      assetReadiness: buildAssetPipelineReport(settings.assetTier).readiness,
    },
  }
}

export class CompetitiveMatchDirector {
  private settings: CompetitiveSettings
  private state: CompetitiveMatchState
  private queuedEvents: CompetitiveEvent[] = []
  private queuedDirectives: BallDirective[] = []
  private lastTouch: Phase5BallContact | null = null
  private lastInBounds = new THREE.Vector3(0, 0.22, 0)
  private boundaryLocked = false
  private restartPlaced = false
  private clock = 0

  constructor(settings: CompetitiveSettings = DEFAULT_COMPETITIVE_SETTINGS) {
    this.settings = { ...settings }
    this.state = initialState(this.settings)
  }

  updateSettings(settings: CompetitiveSettings) {
    this.settings = { ...settings }
    this.state.telemetry.assetReadiness = buildAssetPipelineReport(settings.assetTier).readiness
  }

  reset() {
    this.state = initialState(this.settings)
    this.queuedEvents = []
    this.queuedDirectives = []
    this.lastTouch = null
    this.lastInBounds.set(0, 0.22, 0)
    this.boundaryLocked = false
    this.restartPlaced = false
    this.clock = 0
  }

  snapshot(): CompetitiveMatchState {
    return {
      ...this.state,
      cards: this.state.cards.map((card) => ({ ...card })),
      fouls: { ...this.state.fouls },
      offsides: { ...this.state.offsides },
      penalties: { ...this.state.penalties },
      restarts: { ...this.state.restarts },
      tacticalPhase: { ...this.state.tacticalPhase },
      eventLog: this.state.eventLog.slice(),
      telemetry: { ...this.state.telemetry, home: { ...this.state.telemetry.home }, away: { ...this.state.telemetry.away } },
    }
  }

  private emit(type: CompetitiveEvent['type'], message: string, matchMinute: number, extra: Partial<CompetitiveEvent> = {}) {
    this.state.sequence += 1
    const event: CompetitiveEvent = {
      id: `p5-${this.state.sequence}-${type}`,
      sequence: this.state.sequence,
      type,
      message,
      matchMinute,
      timestamp: this.clock,
      ...extra,
    }
    this.state.lastMessage = message
    this.state.eventLog = [...this.state.eventLog.slice(-39), event]
    this.queuedEvents.push(event)
  }

  private awardRestart(restart: RestartState, matchMinute: number) {
    this.state.restart = restart
    this.state.playState = 'restart-setup'
    this.state.lastDecision = restart.type === 'penalty' ? 'penalty' : restart.type === 'indirect-free-kick' ? 'offside' : 'foul'
    this.state.restarts[restart.type] += 1
    this.state.telemetry.restartCount += 1
    this.restartPlaced = false
    this.emit('restart-awarded', `${restartLabel(restart.type)} · ${restart.reason}`, matchMinute, { team: restart.team, restart })
  }

  registerContact(contact: Phase5BallContact, players: PlayerRuntimeState[], matchMinute: number) {
    this.lastTouch = { ...contact }
    this.state.possession = contact.team
    if (contact.action === 'pass' && contact.receiverId) {
      this.state.pendingOffside = evaluateOffsideCandidate(contact.playerId, contact.receiverId, contact.team, players, contact.position[0], contact.timestamp)
      if (this.state.pendingOffside) this.state.telemetry.passOffsideCandidates += 1
    } else if (this.state.pendingOffside && contact.playerId === this.state.pendingOffside.receiverId && contact.team === this.state.pendingOffside.team) {
      const candidate = this.state.pendingOffside
      this.state.pendingOffside = null
      this.state.offsides[contact.team] += 1
      this.state.lastDecision = 'offside'
      const routine = getSetPieceRoutine(contact.team === 'home' ? this.settings.awayFreeKickRoutineId : this.settings.homeFreeKickRoutineId)
      this.awardRestart({
        id: `offside-${Math.round(contact.timestamp * 1000)}`,
        type: 'indirect-free-kick',
        team: oppositeTeam(contact.team),
        position: [candidate.positionAtPass[0], 0.22, candidate.positionAtPass[2]],
        direct: false,
        reason: 'active player received the ball from an offside position',
        routineId: routine.id,
        countdown: 1.45,
        awardedAtMinute: matchMinute,
      }, matchMinute)
      this.emit('offside', `Offside · ${contact.playerId}`, matchMinute, { team: contact.team, decision: 'offside', metadata: { lineX: candidate.lineX, confidence: candidate.confidence } })
    }
  }

  registerFoul(foul: Phase5FoulContact, context: { matchMinute: number; possession: TeamSide | null; ballPosition: THREE.Vector3; ballVelocity: THREE.Vector3 }) {
    const referee = getRefereeProfile(this.settings.refereeProfileId)
    const fouledTeam = oppositeTeam(foul.team)
    this.state.fouls[foul.team] += 1
    const card = resolveCard(foul, referee)
    if (card !== 'none') {
      const record = { id: `card-${this.state.sequence + 1}`, team: foul.team, playerId: foul.playerId, color: card, minute: context.matchMinute, reason: foul.assessment.reason, severity: foul.assessment.severity } as const
      this.state.cards = [...this.state.cards, record]
      this.state.lastDecision = card === 'red' ? 'red-card' : 'yellow-card'
      this.emit('card', `${card.toUpperCase()} card · ${foul.playerId}`, context.matchMinute, { team: foul.team, card: record, decision: this.state.lastDecision })
    }
    if (shouldApplyAdvantage(foul, fouledTeam, context.possession, context.ballPosition, context.ballVelocity, referee)) {
      this.state.advantage = { team: fouledTeam, foulTeam: foul.team, position: [...foul.position], expiresAt: this.clock + 2.8, reason: foul.assessment.reason }
      this.state.playState = 'advantage'
      this.state.lastDecision = 'advantage'
      this.emit('advantage-played', `Advantage ${fouledTeam}`, context.matchMinute, { team: fouledTeam, decision: 'advantage' })
      return
    }
    const routine = getSetPieceRoutine(fouledTeam === 'home' ? this.settings.homeFreeKickRoutineId : this.settings.awayFreeKickRoutineId)
    const restart = chooseFoulRestart(foul, fouledTeam, context.matchMinute, routine)
    if (restart.type === 'penalty') {
      this.state.penalties[fouledTeam] += 1
      this.emit('penalty-awarded', `Penalty to ${fouledTeam}`, context.matchMinute, { team: fouledTeam, decision: 'penalty' })
    } else {
      this.emit('foul', `Foul · ${foul.assessment.reason.replace('-', ' ')}`, context.matchMinute, { team: foul.team, decision: 'foul' })
    }
    this.awardRestart(restart, context.matchMinute)
  }

  requestManual(request: ManualRestartRequest, matchMinute: number) {
    if (request.type === 'var-check') {
      this.beginVarReview('penalty', request.team, 'penalty', [0, 0.22, 0], matchMinute, 0.76)
      return
    }
    const routineId = request.type === 'corner'
      ? request.team === 'home' ? this.settings.homeCornerRoutineId : this.settings.awayCornerRoutineId
      : request.team === 'home' ? this.settings.homeFreeKickRoutineId : this.settings.awayFreeKickRoutineId
    const positions: Record<RestartType, [number, number, number]> = {
      kickoff: [0, 0.22, 0],
      'throw-in': [0, 0.22, 34],
      corner: [request.team === 'home' ? HALF_LENGTH : -HALF_LENGTH, 0.22, 34],
      'goal-kick': [request.team === 'home' ? -HALF_LENGTH + 5.5 : HALF_LENGTH - 5.5, 0.22, 0],
      'direct-free-kick': [request.team === 'home' ? 24 : -24, 0.22, 5],
      'indirect-free-kick': [request.team === 'home' ? 18 : -18, 0.22, -4],
      penalty: [request.team === 'home' ? HALF_LENGTH - 11 : -HALF_LENGTH + 11, 0.22, 0],
      'drop-ball': [0, 0.22, 0],
    }
    this.awardRestart({ id: `manual-${request.id}`, type: request.type, team: request.team, position: positions[request.type], direct: request.type !== 'throw-in' && request.type !== 'indirect-free-kick', reason: 'manual competitive test', routineId, countdown: 1.5, awardedAtMinute: matchMinute }, matchMinute)
  }

  private beginVarReview(type: VarReviewState['type'], team: TeamSide, decision: VarReviewState['provisionalDecision'], position: [number, number, number], matchMinute: number, evidence: number) {
    const review: VarReviewState = {
      id: `var-${this.state.sequence + 1}`,
      type,
      checkingTeam: team,
      provisionalDecision: decision,
      evidence,
      startedAt: this.clock,
      resolvesAt: this.clock + 2.6,
      goalTeam: type === 'goal' ? team : undefined,
      incidentPosition: position,
    }
    this.state.varReview = review
    this.state.playState = 'var-review'
    this.state.telemetry.reviewCount += 1
    this.queuedDirectives.push({ type: 'freeze' })
    this.emit('var-start', `VAR review · ${type}`, matchMinute, { team, review })
  }

  private confirmGoal(team: TeamSide, matchMinute: number) {
    this.state.lastDecision = 'goal-confirmed'
    this.emit('goal-confirmed', `Goal confirmed · ${team}`, matchMinute, { team, decision: 'goal-confirmed' })
    this.awardRestart({ id: `kickoff-${this.state.sequence}`, type: 'kickoff', team: oppositeTeam(team), position: [0, 0.22, 0], direct: true, reason: 'restart after goal', routineId: 'kickoff-standard', countdown: 2.1, awardedAtMinute: matchMinute }, matchMinute)
  }

  tick(context: CompetitiveTickContext): CompetitiveTickResult {
    this.clock = context.now
    const ballPosition = context.ballPosition
    const ballVelocity = context.ballVelocity
    const homeTactic = getTacticalPreset(this.settings.homeTacticId)
    const awayTactic = getTacticalPreset(this.settings.awayTacticId)
    const inferredPossession = inferPossession(context.players, ballPosition)
    if (inferredPossession) this.state.possession = inferredPossession
    const homePhase = inferTacticalPhase('home', this.state.possession, ballPosition, homeTactic)
    const awayPhase = inferTacticalPhase('away', this.state.possession, ballPosition, awayTactic)
    this.state.tacticalPhase = { home: homePhase, away: awayPhase }
    this.state.telemetry.home = measureTeamShape('home', context.players, homePhase, homeTactic)
    this.state.telemetry.away = measureTeamShape('away', context.players, awayPhase, awayTactic)
    this.state.telemetry.offsideLineHome = defensiveOffsideLine('home', context.players)
    this.state.telemetry.offsideLineAway = defensiveOffsideLine('away', context.players)

    if (Math.abs(ballPosition.x) <= HALF_LENGTH && Math.abs(ballPosition.z) <= 34 && ballPosition.y >= -1) {
      this.lastInBounds.copy(ballPosition)
      this.boundaryLocked = false
    }

    if (this.state.varReview && this.clock >= this.state.varReview.resolvesAt) {
      const review = this.state.varReview
      const outcome = resolveVarOutcome(review, getRefereeProfile(this.settings.refereeProfileId))
      this.state.varReview = null
      this.state.lastDecision = 'var-check-complete'
      this.emit('var-decision', `VAR ${outcome} · ${review.type}`, context.matchMinute, { team: review.checkingTeam, review, decision: 'var-check-complete', metadata: { outcome } })
      if (review.type === 'goal' && review.goalTeam) {
        if (outcome === 'overturned') {
          this.state.lastDecision = 'goal-overturned'
          this.emit('goal-overturned', `Goal overturned · ${review.goalTeam}`, context.matchMinute, { team: review.goalTeam, decision: 'goal-overturned' })
          this.awardRestart({ id: `var-goalkick-${this.state.sequence}`, type: 'goal-kick', team: oppositeTeam(review.goalTeam), position: [review.goalTeam === 'home' ? HALF_LENGTH - 5.5 : -HALF_LENGTH + 5.5, 0.22, 0], direct: true, reason: 'VAR overturned goal', routineId: 'goal-kick-short', countdown: 1.6, awardedAtMinute: context.matchMinute }, context.matchMinute)
        } else this.confirmGoal(review.goalTeam, context.matchMinute)
      } else if (!this.state.restart) this.state.playState = 'open-play'
    }

    if (this.state.advantage) {
      if (this.state.possession !== this.state.advantage.team || this.clock >= this.state.advantage.expiresAt) {
        const recalled = this.state.possession !== this.state.advantage.team
        const advantage = this.state.advantage
        this.state.advantage = null
        if (recalled) {
          const routine = getSetPieceRoutine(advantage.team === 'home' ? this.settings.homeFreeKickRoutineId : this.settings.awayFreeKickRoutineId)
          this.emit('advantage-recalled', `Advantage recalled · ${advantage.team}`, context.matchMinute, { team: advantage.team })
          this.awardRestart({ id: `adv-${this.state.sequence}`, type: 'direct-free-kick', team: advantage.team, position: [...advantage.position], direct: true, reason: advantage.reason, routineId: routine.id, countdown: 1.3, awardedAtMinute: context.matchMinute }, context.matchMinute)
        } else this.state.playState = 'open-play'
      }
    }

    if (!this.state.restart && !this.state.varReview && !this.boundaryLocked && (Math.abs(ballPosition.x) > HALF_LENGTH + 0.25 || Math.abs(ballPosition.z) > 34.25 || ballPosition.y < -1.5)) {
      this.boundaryLocked = true
      const boundary = classifyBoundaryExit(ballPosition, this.lastTouch?.team ?? null, this.lastInBounds)
      if (boundary.kind === 'goal' && boundary.goalTeam) {
        const evidence = this.state.pendingOffside?.team === boundary.goalTeam ? 0.94 : 0.52
        this.state.pendingOffside = null
        if (this.settings.varEnabled) this.beginVarReview('goal', boundary.goalTeam, 'goal-confirmed', [ballPosition.x, ballPosition.y, ballPosition.z], context.matchMinute, evidence)
        else this.confirmGoal(boundary.goalTeam, context.matchMinute)
      } else if (boundary.restart) {
        const type = boundary.restart.type
        const routineId = type === 'corner'
          ? boundary.restart.team === 'home' ? this.settings.homeCornerRoutineId : this.settings.awayCornerRoutineId
          : type === 'goal-kick' ? 'goal-kick-short' : 'throw-quick'
        this.awardRestart({ ...boundary.restart, id: `boundary-${this.state.sequence + 1}`, routineId, countdown: 1.45, awardedAtMinute: context.matchMinute }, context.matchMinute)
      }
    }

    if (this.state.restart) {
      this.state.playState = 'restart-setup'
      this.state.restart.countdown = Math.max(0, this.state.restart.countdown - context.delta)
      if (!this.restartPlaced) {
        this.queuedDirectives.push({ type: 'place', position: this.state.restart.position, restart: this.state.restart.type })
        this.restartPlaced = true
      } else this.queuedDirectives.push({ type: 'freeze', position: this.state.restart.position, restart: this.state.restart.type })
      if (this.state.restart.countdown <= 0 && this.settings.automaticRestarts) {
        const restart = this.state.restart
        const routine = getSetPieceRoutine(restart.routineId)
        const direction = restart.team === 'home' ? 1 : -1
        const targetX = restart.type === 'kickoff' ? direction * 8 : restart.type === 'goal-kick' ? direction * 24 : restart.type === 'throw-in' ? direction * 8 : restart.type === 'corner' ? -Math.sign(restart.position[0]) * 13 : direction * 22
        const targetZ = restart.type === 'corner' ? -Math.sign(restart.position[2]) * 5 : routine.targetZone[1]
        const vector = new THREE.Vector3(targetX, routine.deliveryHeight * 4.2, targetZ).normalize().multiplyScalar(THREE.MathUtils.lerp(5.5, 18, routine.power))
        this.queuedDirectives.push({ type: 'impulse', impulse: [vector.x, vector.y, vector.z], torque: [0, routine.curve * 2.4, -routine.curve * direction * 1.2], restart: restart.type })
        this.state.restart = null
        this.restartPlaced = false
        this.boundaryLocked = false
        this.state.playState = 'open-play'
        this.state.lastDecision = 'play-on'
        this.emit('restart-taken', `${restartLabel(restart.type)} taken`, context.matchMinute, { team: restart.team, restart })
      }
    } else if (!this.state.varReview && !this.state.advantage && context.running) this.state.playState = 'open-play'

    const stoppage = this.state.telemetry.reviewCount * 35 + this.state.telemetry.restartCount * 8 + this.state.cards.length * 18
    this.state.telemetry.stoppageSeconds = stoppage
    this.state.addedTimeMinutes = Math.min(8, Math.ceil(stoppage / 60))

    const events = this.queuedEvents.splice(0)
    const directives = this.queuedDirectives.splice(0)
    return { events, directives, changed: events.length > 0 || directives.length > 0 }
  }
}
