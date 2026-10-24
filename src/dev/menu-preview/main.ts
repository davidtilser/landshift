import { createLandingStore } from '../../app/state.ts'
import { mountLanding } from '../../screens/landing/landing.ts'
import {
  OVERVIEW,
  type GlobeTarget,
  type LandingGlobe,
  type LandingMarker,
} from '../../screens/landing/landingGlobe.ts'
import './menu-preview.css'

interface FakeGlobe extends LandingGlobe {
  destroy(): void
}

interface Pill {
  marker: LandingMarker
  button: HTMLButtonElement
}

const DEGREES_PER_PIXEL = 0.3
// Matches the real globe's default flyTo duration so the preview feels the same.
const FLY_DURATION_MS = 1500

function formatTarget(target: GlobeTarget | null): string {
  if (!target) return 'none'
  return `${target.lat.toFixed(2)}, ${target.lng.toFixed(2)} @ ${target.altitude.toFixed(2)}`
}

function line(text: string): HTMLDivElement {
  const element = document.createElement('div')
  element.textContent = text
  return element
}

/** Wraps a longitude difference into [-180, 180). */
function wrapDegrees(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function createFakeGlobe(host: HTMLElement): FakeGlobe {
  let highlighted: string | null = null
  let target: GlobeTarget | null = null
  let viewLng = OVERVIEW.lng
  let autoRotate = true
  let paused = false
  let interactive = true
  let dragStartX: number | null = null
  let flight = 0
  const clickListeners = new Set<(id: string) => void>()
  let pills: Pill[] = []

  const sphere = document.createElement('div')
  sphere.className = 'fake-globe'
  const status = document.createElement('div')
  status.className = 'fake-globe-status'
  const stage = document.createElement('div')
  stage.className = 'fake-globe-stage'
  stage.append(sphere, status)
  host.append(stage)

  function log(method: string, ...args: unknown[]): void {
    console.info(`[fake globe] ${method}`, ...args)
  }

  // Equirectangular-on-disk is enough to show which side of the planet faces the viewer.
  function placePills(): void {
    for (const { marker, button } of pills) {
      const offset = wrapDegrees(marker.lng - viewLng)
      button.hidden = Math.abs(offset) > 90
      const x =
        50 + 46 * Math.sin(toRadians(offset)) * Math.cos(toRadians(marker.lat))
      const y = 50 - 46 * Math.sin(toRadians(marker.lat))
      button.style.left = `${x.toFixed(2)}%`
      button.style.top = `${y.toFixed(2)}%`
      button.toggleAttribute('data-highlighted', marker.id === highlighted)
    }
  }

  function draw(): void {
    status.replaceChildren(
      line(`view: ${viewLng.toFixed(1)}° lng`),
      line(`highlighted: ${highlighted ?? 'none'}`),
      line(`target: ${formatTarget(target)}`),
      line(`auto-rotate: ${autoRotate ? 'on' : 'off'}`),
      line(`interactive: ${interactive ? 'on' : 'off'}`),
      line(`paused: ${paused ? 'yes' : 'no'}`),
    )
    stage.toggleAttribute('data-interactive', interactive)
    placePills()
  }

  function createPill(marker: LandingMarker): Pill {
    const button = document.createElement('button')
    button.type = 'button'
    button.tabIndex = -1
    button.className = marker.enabled
      ? 'fake-pill fake-pill-enabled'
      : 'fake-pill fake-pill-disabled'
    button.textContent = marker.enabled
      ? marker.label
      : `${marker.label} · Coming soon`
    if (!marker.enabled) button.setAttribute('aria-disabled', 'true')
    button.addEventListener('click', () => {
      if (!marker.enabled || !interactive) {
        log('pill click ignored', marker.id)
        return
      }
      log('pill click', marker.id)
      for (const listener of [...clickListeners]) listener(marker.id)
    })
    return { marker, button }
  }

  const onDragMove = (event: PointerEvent): void => {
    if (dragStartX === null) return
    viewLng = wrapDegrees(
      viewLng - (event.clientX - dragStartX) * DEGREES_PER_PIXEL,
    )
    dragStartX = event.clientX
    draw()
  }
  const endDrag = (): void => {
    window.removeEventListener('pointermove', onDragMove)
    window.removeEventListener('pointerup', endDrag)
    window.removeEventListener('pointercancel', endDrag)
    if (dragStartX === null) return
    dragStartX = null
    log('drag end', viewLng)
  }
  stage.addEventListener('pointerdown', (event) => {
    if (!interactive) return
    if (event.target instanceof Element && event.target.closest('button')) {
      return
    }
    dragStartX = event.clientX
    window.addEventListener('pointermove', onDragMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  })

  draw()

  return {
    flyTo(next: GlobeTarget): Promise<void> {
      log('flyTo', next)
      target = next
      autoRotate = false
      const startLng = viewLng
      const delta = wrapDegrees(next.lng - startLng)
      const startedAt = performance.now()
      cancelAnimationFrame(flight)
      return new Promise((resolve) => {
        const step = (now: number): void => {
          const t = Math.min(1, (now - startedAt) / FLY_DURATION_MS)
          const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
          viewLng = wrapDegrees(startLng + delta * eased)
          draw()
          if (t < 1) {
            flight = requestAnimationFrame(step)
          } else {
            resolve()
          }
        }
        flight = requestAnimationFrame(step)
      })
    },
    setAutoRotate(enabled: boolean): void {
      log('setAutoRotate', enabled)
      autoRotate = enabled
      draw()
    },
    setMarkers(markers: readonly LandingMarker[]): void {
      log('setMarkers', markers)
      pills = markers.map(createPill)
      sphere.replaceChildren(...pills.map((pill) => pill.button))
      draw()
    },
    highlightMarker(id: string | null): void {
      log('highlightMarker', id)
      highlighted = id
      draw()
    },
    onMarkerClick(listener: (id: string) => void): () => void {
      log('onMarkerClick')
      clickListeners.add(listener)
      return () => {
        clickListeners.delete(listener)
      }
    },
    setInteractive(enabled: boolean): void {
      log('setInteractive', enabled)
      interactive = enabled
      if (!enabled) dragStartX = null
      draw()
    },
    pause(): void {
      log('pause')
      paused = true
      draw()
    },
    resume(): void {
      log('resume')
      paused = false
      draw()
    },
    destroy(): void {
      log('destroy')
      clickListeners.clear()
      host.replaceChildren()
    },
  }
}

const app = document.querySelector('#app')
if (!(app instanceof HTMLElement)) {
  throw new Error('Missing #app container')
}

// `?fail-handoff` rejects after the real import so the landing error path can be exercised.
const simulateHandoffFailure = new URLSearchParams(window.location.search).has(
  'fail-handoff',
)

const store = createLandingStore({ screen: 'idle' })
const globeHost = document.createElement('div')
globeHost.className = 'fake-globe-host'
const globe = createFakeGlobe(globeHost)

const unmountLanding = mountLanding(app, store, {
  globeHost,
  globe,
  onHandoff: (regionId, scenarioId) => {
    import('../../screens/game/index.ts')
      .then((game) => {
        if (simulateHandoffFailure) {
          throw new Error('Simulated game load failure')
        }
        return game
      })
      .then(
        ({ mountGame }) => {
          unmountLanding()
          globe.destroy()
          mountGame(app, regionId, scenarioId)
        },
        (error: unknown) => {
          console.error('Could not load the game', error)
          store.dispatch({ type: 'handoffFailed' })
        },
      )
  },
})
