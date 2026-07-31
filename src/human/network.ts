import * as THREE from 'three'
import type { NetworkPlayerSnapshot, PlayerRuntimeState } from './types'

export class PlayerSnapshotBuffer {
  private snapshots: NetworkPlayerSnapshot[] = []
  private lastSequence = -1

  push(snapshot: NetworkPlayerSnapshot) {
    if (snapshot.sequence <= this.lastSequence) return false
    this.lastSequence = snapshot.sequence
    this.snapshots.push(snapshot)
    if (this.snapshots.length > 32) this.snapshots.shift()
    return true
  }

  sample(renderTime: number) {
    if (this.snapshots.length === 0) return null
    if (this.snapshots.length === 1) return this.snapshots[0]
    let older = this.snapshots[0]
    let newer = this.snapshots[this.snapshots.length - 1]
    for (let index = 0; index < this.snapshots.length - 1; index += 1) {
      const a = this.snapshots[index]
      const b = this.snapshots[index + 1]
      if (a.timestamp <= renderTime && b.timestamp >= renderTime) { older = a; newer = b; break }
    }
    const span = Math.max(1, newer.timestamp - older.timestamp)
    const alpha = THREE.MathUtils.clamp((renderTime - older.timestamp) / span, 0, 1)
    return {
      ...newer,
      position: [
        THREE.MathUtils.lerp(older.position[0], newer.position[0], alpha),
        THREE.MathUtils.lerp(older.position[1], newer.position[1], alpha),
        THREE.MathUtils.lerp(older.position[2], newer.position[2], alpha),
      ] as [number, number, number],
      velocity: [
        THREE.MathUtils.lerp(older.velocity[0], newer.velocity[0], alpha),
        THREE.MathUtils.lerp(older.velocity[1], newer.velocity[1], alpha),
        THREE.MathUtils.lerp(older.velocity[2], newer.velocity[2], alpha),
      ] as [number, number, number],
      facing: older.facing + Math.atan2(Math.sin(newer.facing - older.facing), Math.cos(newer.facing - older.facing)) * alpha,
    }
  }
}

export function createSnapshot(runtime: PlayerRuntimeState, sequence: number, timestamp: number): NetworkPlayerSnapshot {
  return {
    id: runtime.id,
    sequence,
    timestamp,
    position: [runtime.position.x, runtime.position.y, runtime.position.z],
    velocity: [runtime.velocity.x, runtime.velocity.y, runtime.velocity.z],
    facing: runtime.facing,
    action: runtime.action,
    actionTime: runtime.actionStartedAt,
    fatigue: runtime.physical.fatigue,
    balance: runtime.physical.balance,
  }
}

export function reconcilePredictedState(runtime: PlayerRuntimeState, authoritative: NetworkPlayerSnapshot, hardSnapDistance = 4) {
  const target = new THREE.Vector3(...authoritative.position)
  const error = target.distanceTo(runtime.position)
  if (error > hardSnapDistance) runtime.position.copy(target)
  else runtime.position.lerp(target, THREE.MathUtils.clamp(error / hardSnapDistance * 0.38, 0.08, 0.38))
  runtime.velocity.lerp(new THREE.Vector3(...authoritative.velocity), 0.3)
  runtime.facing += Math.atan2(Math.sin(authoritative.facing - runtime.facing), Math.cos(authoritative.facing - runtime.facing)) * 0.24
  runtime.action = authoritative.action
  runtime.physical.fatigue = THREE.MathUtils.lerp(runtime.physical.fatigue, authoritative.fatigue, 0.2)
  runtime.physical.balance = THREE.MathUtils.lerp(runtime.physical.balance, authoritative.balance, 0.25)
}

export class SemanticContactGuard {
  private recent = new Map<string, number>()
  accept(eventId: string, now: number, windowMs = 450) {
    const previous = this.recent.get(eventId) ?? -Infinity
    if (now - previous < windowMs) return false
    this.recent.set(eventId, now)
    if (this.recent.size > 512) {
      const cutoff = now - 5000
      for (const [key, timestamp] of this.recent) if (timestamp < cutoff) this.recent.delete(key)
    }
    return true
  }
}
