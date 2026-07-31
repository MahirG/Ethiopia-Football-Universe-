interface NavigatorRuntimeBudget extends Navigator {
  deviceMemory?: number
}

const AUDIO_SETTINGS_KEY = 'efu-audio-settings-v2'
const GRAPHICS_QUALITY_KEY = 'efu-graphics-quality'
const CAMERA_SHAKE_KEY = 'efu-camera-shake'
const CRASH_DIAGNOSTIC_KEY = 'efu-last-client-crash'

function recordClientFailure(source: string, reason: unknown) {
  try {
    const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason)
    window.localStorage.setItem(CRASH_DIAGNOSTIC_KEY, JSON.stringify({
      source,
      message,
      time: new Date().toISOString(),
      userAgent: navigator.userAgent,
    }))
  } catch {
    // Diagnostics must never interfere with the game runtime.
  }
}

function isConstrainedTouchRuntime() {
  const runtimeNavigator = navigator as NavigatorRuntimeBudget
  const userAgent = runtimeNavigator.userAgent.toLowerCase()
  const android = userAgent.includes('android')
  const embeddedWebView = userAgent.includes('; wv)') || userAgent.includes('version/4.0')
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const lowMemory = typeof runtimeNavigator.deviceMemory === 'number' && runtimeNavigator.deviceMemory <= 6
  const lowCpu = typeof runtimeNavigator.hardwareConcurrency === 'number' && runtimeNavigator.hardwareConcurrency <= 6
  const phoneViewport = Math.min(window.innerWidth, window.innerHeight) <= 900
  return coarsePointer && (android || embeddedWebView || lowMemory || lowCpu || phoneViewport)
}

function installMobileRuntimeBudget() {
  if (!isConstrainedTouchRuntime()) return
  try {
    window.localStorage.setItem(GRAPHICS_QUALITY_KEY, JSON.stringify('performance'))
    window.localStorage.setItem(CAMERA_SHAKE_KEY, JSON.stringify(false))
  } catch (error) {
    recordClientFailure('mobile-runtime-budget', error)
  }

  try {
    const stored = window.localStorage.getItem(AUDIO_SETTINGS_KEY)
    const current = stored ? JSON.parse(stored) as Record<string, unknown> : {}
    window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({
      ...current,
      quality: 'low',
      commentaryEnabled: false,
      announcerEnabled: false,
      subtitles: true,
      closedCaptions: true,
      visualIndicators: true,
    }))
  } catch (error) {
    recordClientFailure('mobile-audio-budget', error)
  }
}

function installCrashDiagnostics() {
  window.addEventListener('error', (event) => {
    recordClientFailure('window-error', event.error ?? event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    recordClientFailure('unhandled-rejection', event.reason)
  })
}

export function installKickoffSafety() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return
  installCrashDiagnostics()
  installMobileRuntimeBudget()
}
