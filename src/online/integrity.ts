import type { IntegrityInput, IntegrityRecord, IntegrityVerdict } from './types'

const MAX_INPUT_RATE = 90
const MAX_CLOCK_DRIFT_MS = 850
const MAX_POSITION = 80
const MAX_MAGNITUDE = 1.35
const MIN_SHOT_INTERVAL_MS = 180

export function fnv1a32(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function canonicalInput(input: IntegrityInput): string {
  return [
    input.sequence,
    Math.round(input.matchTimeMs),
    input.action,
    input.x.toFixed(3),
    input.z.toFixed(3),
    input.magnitude.toFixed(3),
    Math.round(input.clientTimeMs),
  ].join('|')
}

export function createIntegrityRecord(
  matchId: string,
  playerId: string,
  input: IntegrityInput,
  previousHash: string,
): IntegrityRecord {
  const hash = fnv1a32(`${matchId}|${playerId}|${previousHash}|${canonicalInput(input)}`)
  return { ...input, matchId, playerId, previousHash, hash }
}

export interface IntegrityWindow {
  lastSequence: number
  lastClientTimeMs: number
  lastShotTimeMs: number
  receivedInSecond: number
  secondBucket: number
  lastHash: string
}

export function createIntegrityWindow(): IntegrityWindow {
  return {
    lastSequence: -1,
    lastClientTimeMs: 0,
    lastShotTimeMs: -Infinity,
    receivedInSecond: 0,
    secondBucket: -1,
    lastHash: 'genesis',
  }
}

export function validateIntegrityInput(input: IntegrityInput, window: IntegrityWindow, serverTimeMs: number): IntegrityVerdict {
  const reasons: string[] = []
  const secondBucket = Math.floor(input.clientTimeMs / 1000)
  const rate = secondBucket === window.secondBucket ? window.receivedInSecond + 1 : 1

  if (input.sequence <= window.lastSequence) reasons.push('non-monotonic-sequence')
  if (Math.abs(serverTimeMs - input.clientTimeMs) > MAX_CLOCK_DRIFT_MS) reasons.push('clock-drift')
  if (Math.abs(input.x) > MAX_POSITION || Math.abs(input.z) > MAX_POSITION) reasons.push('position-out-of-bounds')
  if (!Number.isFinite(input.magnitude) || input.magnitude < 0 || input.magnitude > MAX_MAGNITUDE) reasons.push('invalid-input-magnitude')
  if (rate > MAX_INPUT_RATE) reasons.push('input-rate-limit')
  if (input.action === 'shoot' && input.matchTimeMs - window.lastShotTimeMs < MIN_SHOT_INTERVAL_MS) reasons.push('shot-cadence')
  if (!Number.isFinite(input.matchTimeMs) || input.matchTimeMs < 0) reasons.push('invalid-match-time')

  const riskScore = Math.min(100, reasons.length * 24 + (reasons.includes('input-rate-limit') ? 20 : 0))
  return {
    accepted: reasons.length === 0,
    reasons,
    riskScore,
    correctionRequired: reasons.some((reason) => ['position-out-of-bounds', 'non-monotonic-sequence', 'clock-drift'].includes(reason)),
  }
}

export function advanceIntegrityWindow(input: IntegrityInput, record: IntegrityRecord, window: IntegrityWindow): IntegrityWindow {
  const secondBucket = Math.floor(input.clientTimeMs / 1000)
  return {
    lastSequence: input.sequence,
    lastClientTimeMs: input.clientTimeMs,
    lastShotTimeMs: input.action === 'shoot' ? input.matchTimeMs : window.lastShotTimeMs,
    receivedInSecond: secondBucket === window.secondBucket ? window.receivedInSecond + 1 : 1,
    secondBucket,
    lastHash: record.hash,
  }
}

export function fairPlayBand(score: number): 'excellent' | 'good' | 'restricted' | 'suspended' {
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 40) return 'restricted'
  return 'suspended'
}
