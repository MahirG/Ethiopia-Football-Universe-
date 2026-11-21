/**
 * EFU Device Lab: browser-observed rendering frame timings.
 * Counts are observational diagnostics, never physics/gameplay inputs.
 * Window metrics are from recent samples; elapsedSeconds covers the session.
 */
export interface FrameRendererCounters {
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  dpr: number
}

export interface FrameHealthSnapshot extends FrameRendererCounters {
  elapsedSeconds: number
  windowSeconds: number
  sampledFrames: number
  averageFps: number
  p95FrameMs: number
  p99FrameMs: number
  slowFramePercent: number
}

export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))
  return sorted[index]
}

export class FrameHealthMonitor {
  private durations: number[] = []
  private head = 0
  private size = 0
  private totalSeconds = 0
  private lastPublishedAt = -Infinity

  constructor(private readonly capacity = 2400) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Frame sample capacity must be positive')
  }

  reset() {
    this.durations = []
    this.head = 0
    this.size = 0
    this.totalSeconds = 0
    this.lastPublishedAt = -Infinity
  }

  addFrame(deltaSeconds: number) {
    // Ignore invalid deltas and app background/resume stalls > 2 seconds.
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || deltaSeconds > 2) return
    const milliseconds = deltaSeconds * 1000
    this.totalSeconds += deltaSeconds
    if (this.size < this.capacity) {
      this.durations.push(milliseconds)
      this.size++
    } else {
      this.durations[this.head] = milliseconds
      this.head = (this.head + 1) % this.capacity
    }
  }

  shouldPublish(nowMs: number, everyMs = 1000) {
    if (this.size === 0 || !Number.isFinite(nowMs)) return false
    if (nowMs - this.lastPublishedAt < everyMs) return false
    this.lastPublishedAt = nowMs
    return true
  }

  snapshot(renderer: Partial<FrameRendererCounters> = {}): FrameHealthSnapshot {
    const sampled = this.durations.slice(0, this.size)
    const ordered = sampled.slice().sort((a, b) => a - b)
    const totalWindowMs = sampled.reduce((total, value) => total + value, 0)
    const fallback = (value: number | undefined) => Number.isFinite(value) ? Math.max(0, value!) : 0
    return {
      elapsedSeconds: Math.round(this.totalSeconds * 10) / 10,
      windowSeconds: Math.round(totalWindowMs / 100) / 10,
      sampledFrames: sampled.length,
      averageFps: totalWindowMs > 0 ? Math.round(sampled.length / totalWindowMs * 100000) / 100 : 0,
      p95FrameMs: Math.round(percentile(ordered, 0.95) * 10) / 10,
      p99FrameMs: Math.round(percentile(ordered, 0.99) * 10) / 10,
      slowFramePercent: sampled.length ? Math.round(sampled.filter(ms => ms > 33.33).length / sampled.length * 1000) / 10 : 0,
      drawCalls: fallback(renderer.drawCalls),
      triangles: fallback(renderer.triangles),
      geometries: fallback(renderer.geometries),
      textures: fallback(renderer.textures),
      dpr: fallback(renderer.dpr),
    }
  }
}
