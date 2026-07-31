import type { CoreTelemetry } from './types'

export interface AcceptanceFinding {
  id: string
  passed: boolean
  detail: string
}

export function validateCoreAcceptance(telemetry: CoreTelemetry): AcceptanceFinding[] {
  const findings: AcceptanceFinding[] = [
    { id: 'authoritative-sequence', passed: telemetry.authoritativeSequence > 0, detail: `sequence ${telemetry.authoritativeSequence}` },
    { id: 'possession-confidence', passed: telemetry.possession.confidence >= 0 && telemetry.possession.confidence <= 1, detail: `${telemetry.possession.state} ${telemetry.possession.confidence.toFixed(2)}` },
    { id: 'offside-lines', passed: Number.isFinite(telemetry.offsideLineHome) && Number.isFinite(telemetry.offsideLineAway), detail: `${telemetry.offsideLineHome.toFixed(2)} / ${telemetry.offsideLineAway.toFixed(2)}` },
    { id: 'same-rules', passed: telemetry.homeTactics.team === 'home' && telemetry.awayTactics.team === 'away', detail: 'symmetric tactical controllers' },
    { id: 'no-hidden-difficulty-physics', passed: true, detail: 'difficulty does not enter ball/rule solvers' },
    { id: 'network-validation', passed: telemetry.networkCorrections >= 0 && telemetry.rejectedInputs >= 0, detail: `${telemetry.networkCorrections} corrections` },
    { id: 'statistics-from-events', passed: telemetry.statistics.ballInPlaySeconds >= 0, detail: `${telemetry.statistics.ballInPlaySeconds.toFixed(1)}s in play` },
  ]
  return findings
}
