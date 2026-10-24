import { createLandingStore } from '../../app/state.ts'
import { mountLanding } from '../../screens/landing/landing.ts'
import type {
  GlobeTarget,
  LandingGlobe,
  LandingMarker,
} from '../../screens/landing/landingGlobe.ts'
import './menu-preview.css'

interface FakeGlobe extends LandingGlobe {
  destroy(): void
}

function formatTarget(target: GlobeTarget | null): string {
  if (!target) return 'none'
  return `${target.lat.toFixed(2)}, ${target.lng.toFixed(2)} @ ${target.altitude.toFixed(2)}`
}

function line(text: string): HTMLDivElement {
  const element = document.createElement('div')
  element.textContent = text
  return element
}

function createFakeGlobe(host: HTMLElement): FakeGlobe {
  let highlighted: string | null = null
  let target: GlobeTarget | null = null
  let autoRotate = true
  let paused = false
  const clickListeners = new Set<(id: string) => void>()
  const markerButtons = new Map<string, HTMLButtonElement>()

  const info = document.createElement('div')
  info.className = 'fake-globe'
  const markerList = document.createElement('div')
  markerList.className = 'fake-globe-markers'
  const stage = document.createElement('div')
  stage.className = 'fake-globe-stage'
  stage.append(info, markerList)
  host.append(stage)

  function log(method: string, ...args: unknown[]): void {
    console.info(`[fake globe] ${method}`, ...args)
  }

  function draw(): void {
    info.replaceChildren(
      line(`highlighted: ${highlighted ?? 'none'}`),
      line(`target: ${formatTarget(target)}`),
      line(`auto-rotate: ${autoRotate ? 'on' : 'off'}`),
      line(`paused: ${paused ? 'yes' : 'no'}`),
    )
    for (const [id, button] of markerButtons) {
      button.toggleAttribute('data-highlighted', id === highlighted)
    }
  }

  function createMarkerButton(marker: LandingMarker): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = marker.enabled
      ? marker.label
      : `${marker.label} (disabled)`
    button.addEventListener('click', () => {
      log('marker click', marker.id)
      for (const listener of [...clickListeners]) listener(marker.id)
    })
    return button
  }

  draw()

  return {
    flyTo(next: GlobeTarget): Promise<void> {
      log('flyTo', next)
      target = next
      autoRotate = false
      draw()
      return new Promise((resolve) => {
        setTimeout(resolve, 600)
      })
    },
    setAutoRotate(enabled: boolean): void {
      log('setAutoRotate', enabled)
      autoRotate = enabled
      draw()
    },
    setMarkers(markers: readonly LandingMarker[]): void {
      log('setMarkers', markers)
      markerButtons.clear()
      for (const marker of markers) {
        markerButtons.set(marker.id, createMarkerButton(marker))
      }
      markerList.replaceChildren(...markerButtons.values())
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
  onHandoff: (regionId) => {
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
          mountGame(app, regionId)
        },
        (error: unknown) => {
          console.error('Could not load the game', error)
          store.dispatch({ type: 'handoffFailed' })
        },
      )
  },
})
