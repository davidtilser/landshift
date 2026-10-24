import type { GlobeInstance } from 'globe.gl'
import type { LatLngAlt } from './types.ts'

const AUTO_ROTATE_SPEED = 0.35
const RESUME_DELAY_MS = 5000
const DEFAULT_FLY_DURATION_MS = 1500

export interface CameraController {
  flyTo(target: LatLngAlt, durationMs?: number): Promise<void>
  setAutoRotate(enabled: boolean): void
  setReducedMotion(reduced: boolean): void
  destroy(): void
}

interface PendingFlight {
  timer: number
  resolve: () => void
}

export function createCameraController(globe: GlobeInstance): CameraController {
  const controls = globe.controls()
  let autoRotateEnabled = true
  let reducedMotion = false
  let interacting = false
  let heldByInteraction = false
  let resumeTimer: number | undefined
  let pendingFlight: PendingFlight | undefined

  const applyAutoRotate = (): void => {
    controls.autoRotate =
      autoRotateEnabled && !reducedMotion && !heldByInteraction
  }

  const clearResumeTimer = (): void => {
    clearTimeout(resumeTimer)
    resumeTimer = undefined
  }

  const settleFlight = (): void => {
    if (pendingFlight === undefined) {
      return
    }
    clearTimeout(pendingFlight.timer)
    pendingFlight.resolve()
    pendingFlight = undefined
  }

  // Ending globe.gl's tween jumps to its old target, so re-pin the current view in the same task.
  const freezeCamera = (): void => {
    settleFlight()
    globe.pointOfView(globe.pointOfView())
  }

  const setAutoRotate = (enabled: boolean): void => {
    autoRotateEnabled = enabled
    if (!interacting) {
      clearResumeTimer()
      heldByInteraction = false
    }
    applyAutoRotate()
  }

  const onInteractionStart = (): void => {
    interacting = true
    heldByInteraction = true
    clearResumeTimer()
    freezeCamera()
    applyAutoRotate()
  }

  const onInteractionEnd = (): void => {
    interacting = false
    clearResumeTimer()
    resumeTimer = setTimeout(() => {
      resumeTimer = undefined
      heldByInteraction = false
      applyAutoRotate()
    }, RESUME_DELAY_MS)
  }

  controls.autoRotateSpeed = AUTO_ROTATE_SPEED
  controls.addEventListener('start', onInteractionStart)
  controls.addEventListener('end', onInteractionEnd)
  applyAutoRotate()

  return {
    flyTo(target, durationMs = DEFAULT_FLY_DURATION_MS) {
      setAutoRotate(false)
      freezeCamera()
      const duration = reducedMotion ? 0 : Math.max(0, durationMs)
      globe.pointOfView(target, duration)
      if (duration <= 0) {
        return Promise.resolve()
      }
      return new Promise((resolve) => {
        pendingFlight = {
          timer: setTimeout(settleFlight, duration),
          resolve: () => {
            resolve()
          },
        }
      })
    },
    setAutoRotate,
    setReducedMotion(reduced) {
      reducedMotion = reduced
      applyAutoRotate()
    },
    destroy() {
      clearResumeTimer()
      settleFlight()
      controls.removeEventListener('start', onInteractionStart)
      controls.removeEventListener('end', onInteractionEnd)
      controls.autoRotate = false
    },
  }
}
