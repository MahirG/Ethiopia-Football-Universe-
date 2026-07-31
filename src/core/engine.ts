import { AuthoritativeMatchClock } from './clock'
import { DeterministicEventStream } from './events'
import { calculateEnvironmentalAcceleration, evaluatePossession } from './physics'
import { evaluateBoundary, calculateOffsideLines } from './rules'
import { MatchStateMachine } from './stateMachine'
import { MatchStatisticsRecorder } from './statistics'
import { deriveTacticalState } from './tactics'
import { NetworkMatchAuthority } from './network'
import type { CoreFrameInput, CoreTelemetry, MatchConfig, RestartDecision, RuleDecision } from './types'

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  seed: 26071996,
  regulationMinutes: 90,
  extraTimeMinutes: 30,
  acceleratedMinutesPerSecond: 4.5,
  handball: 'standard',
  varEnabled: true,
  injuries: true,
  inputDevice: 'keyboard',
  passAssist: 'assisted',
  shotAssist: 'semi',
  crossingAssist: 'assisted',
  throughBallAssist: 'semi',
  switchAssist: 'assisted',
  ranked: false,
}

export interface CoreFrameResult {
  telemetry: CoreTelemetry
  environmentalAcceleration: { x: number; y: number; z: number }
  ruleDecision: RuleDecision
  newRestart: RestartDecision | null
}

export class CoreMatchGameplayEngine {
  readonly events = new DeterministicEventStream()
  readonly state = new MatchStateMachine()
  readonly clock: AuthoritativeMatchClock
  readonly statistics = new MatchStatisticsRecorder()
  readonly network = new NetworkMatchAuthority()
  private lastRestartKey = ''
  private lastPossessionTeam: 'home' | 'away' | null = null
  private ballInPlay = true

  constructor(readonly config: MatchConfig = DEFAULT_MATCH_CONFIG) {
    this.clock = new AuthoritativeMatchClock(config.regulationMinutes, config.extraTimeMinutes)
  }

  tick(frame: CoreFrameInput): CoreFrameResult {
    this.state.forceLive()
    this.clock.syncExternalMinute(frame.matchMinute, frame.running)
    const possession = evaluatePossession(frame.ball, frame.players, frame.surface)
    const ruleDecision = evaluateBoundary(frame.ball)
    const lines = calculateOffsideLines(frame.players, frame.ball.position.x)
    const homeTactics = deriveTacticalState('home', frame.players, possession, frame.scoreHome, frame.scoreAway, frame.matchMinute)
    const awayTactics = deriveTacticalState('away', frame.players, possession, frame.scoreHome, frame.scoreAway, frame.matchMinute)
    const authority = this.network.validateState(frame.ball, frame.players)
    const environmentalAcceleration = calculateEnvironmentalAcceleration(frame.ball, frame.surface)

    this.ballInPlay = !ruleDecision.outOfPlay
    this.statistics.tick(frame.delta, possession.team, possession.state === 'contested', this.ballInPlay)
    this.statistics.captureFrame(frame.simulationTime, frame.ball.position, frame.players.map((player) => ({ id: player.id, position: player.position })))

    if (possession.team && possession.team !== this.lastPossessionTeam) {
      this.statistics.recordAction(possession.team, 'recovery')
      this.events.emit('possession-changed', frame.matchMinute, frame.simulationTime, { confidence: possession.confidence }, possession.team, possession.playerId ?? undefined)
      this.lastPossessionTeam = possession.team
    }

    let newRestart: RestartDecision | null = null
    if (ruleDecision.restart) {
      const key = `${ruleDecision.restart.type}:${ruleDecision.restart.team}:${Math.round(ruleDecision.restart.location.x * 10)}:${Math.round(ruleDecision.restart.location.z * 10)}`
      if (key !== this.lastRestartKey) {
        this.lastRestartKey = key
        newRestart = ruleDecision.restart
        if (ruleDecision.goal) {
          this.state.phase = this.config.varEnabled ? 'goal-review' : 'goal-scored'
          this.clock.registerStoppage(35, 'goal')
          const event = this.events.emit('goal', frame.matchMinute, frame.simulationTime, { importance: 1, reason: ruleDecision.reason }, ruleDecision.goal)
          this.statistics.considerHighlight(event, 1)
        } else {
          this.state.phase = 'ball-out'
          if (ruleDecision.restart.type === 'corner' && ruleDecision.restart.team) this.statistics.recordAction(ruleDecision.restart.team, 'corner')
          this.events.emit('restart-awarded', frame.matchMinute, frame.simulationTime, { type: ruleDecision.restart.type, reason: ruleDecision.reason }, ruleDecision.restart.team ?? undefined)
        }
      }
    } else if (this.lastRestartKey) {
      this.lastRestartKey = ''
      this.state.phase = 'active-play'
      this.state.restart = null
    }

    const network = this.network.getTelemetry()
    return {
      environmentalAcceleration,
      ruleDecision,
      newRestart,
      telemetry: {
        phase: this.state.phase,
        possession,
        homeTactics,
        awayTactics,
        restart: ruleDecision.restart,
        addedTime: this.clock.state.addedTimeMinimum,
        offsideLineHome: lines.home,
        offsideLineAway: lines.away,
        networkCorrections: network.corrections,
        rejectedInputs: network.rejectedInputs,
        authoritativeSequence: authority.sequence,
        ballInPlay: this.ballInPlay,
        weather: frame.weather,
        statistics: this.statistics.statistics,
      },
    }
  }
}
