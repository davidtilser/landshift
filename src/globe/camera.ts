import type { GlobeInstance } from 'globe.gl'
import { PerspectiveCamera } from 'three'
import { frameLocale } from './localeFrame.ts'
import type { LatLngAlt } from './types.ts'

const AUTO_ROTATE_SPEED = 0.35
const RESUME_DELAY_MS = 5000
const DEFAULT_FLY_DURATION_MS = 1500
const MIN_LOCALE_ALTITUDE = 100 / 6371

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

interface Geo {
  lat: number
  lng: number
  altitude: number
}

export function createCameraController(globe: GlobeInstance): CameraController {
  const controls = globe.controls()
  const camera = globe.camera()
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
    window.clearTimeout(resumeTimer)
    resumeTimer = undefined
  }

  const settleFlight = (): void => {
    if (pendingFlight === undefined) return
    window.clearTimeout(pendingFlight.timer)
    const resolve = pendingFlight.resolve
    pendingFlight = undefined
    resolve()
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
    resumeTimer = window.setTimeout(() => {
      resumeTimer = undefined
      heldByInteraction = false
      applyAutoRotate()
    }, RESUME_DELAY_MS)
  }

  controls.autoRotateSpeed = AUTO_ROTATE_SPEED
  controls.addEventListener('start', onInteractionStart)
  controls.addEventListener('end', onInteractionEnd)
  applyAutoRotate()

  const localePose = (target: LatLngAlt): Geo | null => {
    const locale = target.locale
    const tilt = target.tiltDegrees
    if (locale === undefined || tilt === undefined || tilt <= 0) return null
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 50
    const framed = frameLocale({
      extent: locale,
      tiltDegrees: tilt,
      fov,
      width: globe.width(),
      height: globe.height(),
      inset: locale.inset,
      ...(locale.pin === undefined ? {} : { pin: locale.pin }),
    })
    return framed
  }

  return {
    flyTo(target, durationMs = DEFAULT_FLY_DURATION_MS) {
      setAutoRotate(false)
      freezeCamera()
      const duration = reducedMotion ? 0 : Math.max(0, durationMs)
      // Orbit controls clamp distance every frame, so a lower target would end the flight with a jump.
      const minAltitude = Math.max(
        MIN_LOCALE_ALTITUDE,
        controls.minDistance / globe.getGlobeRadius() - 1,
      )
      const framed = localePose(target)
      const pose: Geo = framed ?? {
        lat: target.lat,
        lng: target.lng,
        altitude: target.altitude,
      }
      globe.pointOfView(
        {
          lat: pose.lat,
          lng: pose.lng,
          altitude: Math.max(pose.altitude, minAltitude),
        },
        duration,
      )
      if (duration <= 0) return Promise.resolve()
      return new Promise((resolve) => {
        pendingFlight = {
          timer: window.setTimeout(settleFlight, duration),
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
