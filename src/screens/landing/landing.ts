import type { LandingState, LandingStore } from '../../app/state.ts'
import { findRegion, leafRegions, type Region } from '../../regions/regions.ts'
import { findScenario, type Scenario } from '../../scenarios/scenarios.ts'
import { mountCreditsPanel } from '../../ui/creditsPanel.ts'
import { createBackButton, createButton, createTitle } from './elements.ts'
import {
  OVERVIEW,
  type LandingGlobe,
  type LandingMarker,
} from './landingGlobe.ts'
import { createRegionCard, LOAD_FAILED_MESSAGE } from './regionCard.ts'
import { createRegionList } from './regionList.ts'
import '../../ui/ui.css'
import './landing.css'

const HEADLINE = 'Landshift: how our Earth is changing'
const EXPLORE_HINT = 'Drag the globe and choose a region'

let mountCount = 0

export interface LandingOptions {
  /** Caller-owned globe host; landing moves it into the globe cell and never replaces its contents. */
  globeHost: HTMLElement
  globe: LandingGlobe
  /** Called on `startGame`; the caller swaps in the game or dispatches `handoffFailed`. */
  onHandoff: (regionId: string, scenarioId: string) => void
}

type PanelLayout = 'hero' | 'hint' | 'card'

function layoutFor(state: LandingState): PanelLayout {
  switch (state.screen) {
    case 'idle':
      return 'hero'
    case 'explore':
      return 'hint'
    case 'regionFocused':
    case 'handoff':
      return 'card'
  }
}

function requireRegion(id: string): Region {
  const region = findRegion(id)
  if (!region) throw new Error(`Unknown region: ${id}`)
  return region
}

function requireScenario(id: string): Scenario {
  const scenario = findScenario(id)
  if (!scenario) throw new Error(`Unknown scenario: ${id}`)
  return scenario
}

function toMarker(region: Region): LandingMarker {
  return {
    id: region.id,
    lat: region.center.lat,
    lng: region.center.lng,
    label: region.label,
    enabled: region.enabled,
  }
}

/**
 * Renders the landing overlay into `root`, moves `options.globeHost` into its globe cell,
 * and keeps both in sync with `store`. Returns a cleanup function that resets the pills,
 * highlight, interactivity, and any pause landing applied; during handoff it leaves the
 * globe untouched because the caller owns it from then on.
 */
export function mountLanding(
  root: HTMLElement,
  store: LandingStore,
  options: LandingOptions,
): () => void {
  const { globe } = options
  mountCount += 1
  const idPrefix = `landing-${String(mountCount)}`

  const globeCell = document.createElement('div')
  globeCell.className = 'landing-globe'
  globeCell.append(options.globeHost)

  const panel = document.createElement('main')
  panel.className = 'landing-panel'

  const creditsSlot = document.createElement('div')
  creditsSlot.className = 'landing-credits'

  // Persistent so screen readers register it before any message is written.
  const alertRegion = document.createElement('div')
  alertRegion.className = 'ui-visually-hidden'
  alertRegion.setAttribute('role', 'alert')

  const container = document.createElement('div')
  container.className = 'landing'
  container.append(globeCell, panel, creditsSlot, alertRegion)
  root.replaceChildren(container)

  const removeCredits = mountCreditsPanel(creditsSlot)
  const markers = leafRegions.map(toMarker)

  // Region the keyboard list opened, so Back can return focus to the same option.
  let listSelection: string | null = null

  // The store ignores selections the current screen does not allow, including idle.
  const removeMarkerListener = globe.onMarkerClick((regionId) => {
    listSelection = null
    store.dispatch({ type: 'selectRegion', regionId })
  })

  let current: LandingState | null = null
  let pausedByLanding = false
  let markersShown = false
  let interactive: boolean | null = null
  let disposed = false

  function showView(...children: HTMLElement[]): void {
    const view = document.createElement('div')
    view.className = 'landing-view'
    view.append(...children)
    panel.replaceChildren(view)
  }

  function back(): void {
    store.dispatch({ type: 'back' })
  }

  function startScenario(scenarioId: string): void {
    store.dispatch({ type: 'startGame', scenarioId })
  }

  function setPaused(paused: boolean): void {
    if (paused === pausedByLanding) return
    pausedByLanding = paused
    if (paused) {
      globe.pause()
    } else {
      globe.resume()
    }
  }

  function setMarkersShown(shown: boolean): void {
    if (shown === markersShown) return
    markersShown = shown
    globe.setMarkers(shown ? markers : [])
  }

  function setInteractive(enabled: boolean): void {
    if (enabled === interactive) return
    interactive = enabled
    globe.setInteractive(enabled)
  }

  function showIdle(
    state: Extract<LandingState, { screen: 'idle' }>,
    previous: LandingState | null,
  ): void {
    const explore = createButton(
      'Explore',
      'ui-button ui-button-primary',
      () => {
        store.dispatch({ type: 'explore' })
      },
    )
    showView(createTitle(HEADLINE, 'landing-headline'), explore)
    globe.highlightMarker(null)
    if (!previous) return
    explore.focus()
    // Drags may have moved the camera anywhere, so every return to idle flies home first.
    void globe.flyTo(OVERVIEW).then(() => {
      // Identity check: a later return to idle creates a new state object and owns rotation.
      if (!disposed && store.get() === state) globe.setAutoRotate(true)
    })
  }

  function showExplore(previous: LandingState | null): void {
    const hint = createTitle(EXPLORE_HINT, 'landing-hint')
    hint.tabIndex = -1
    const keyboardHint = document.createElement('span')
    keyboardHint.className = 'ui-visually-hidden'
    keyboardHint.textContent = ', or press Tab to list regions'
    hint.append(keyboardHint)
    const bar = document.createElement('div')
    bar.className = 'landing-hint-bar'
    bar.append(createBackButton(back), hint)
    const regionList = createRegionList(idPrefix, (regionId) => {
      listSelection = regionId
      store.dispatch({ type: 'selectRegion', regionId })
    })
    showView(bar, regionList.element)
    globe.highlightMarker(null)
    // A still globe keeps pills from drifting under the pointer while choosing.
    globe.setAutoRotate(false)
    if (!previous) return
    if (previous.screen === 'regionFocused') {
      void globe.flyTo(OVERVIEW)
      if (
        listSelection === previous.regionId &&
        regionList.focus(listSelection)
      ) {
        return
      }
    }
    hint.focus()
  }

  function showRegion(
    state: Extract<LandingState, { screen: 'regionFocused' }>,
    previous: LandingState | null,
  ): void {
    const region = requireRegion(state.regionId)
    const failedScenarioId =
      previous?.screen === 'handoff' ? previous.scenarioId : null
    const card = createRegionCard({
      region,
      idPrefix,
      failedScenarioId,
      onBack: back,
      onStart: startScenario,
    })
    showView(...card.parts)
    globe.highlightMarker(region.id)
    if (failedScenarioId !== null) {
      alertRegion.textContent = LOAD_FAILED_MESSAGE
      card.focusTarget.focus()
      return
    }
    void globe.flyTo({ ...region.center, altitude: region.altitude })
    if (previous) card.focusTarget.focus()
  }

  function showHandoff(
    state: Extract<LandingState, { screen: 'handoff' }>,
  ): void {
    const scenario = requireScenario(state.scenarioId)
    const status = document.createElement('p')
    status.className = 'landing-status'
    status.tabIndex = -1
    status.textContent = `Loading ${scenario.label}…`
    showView(
      createTitle(requireRegion(state.regionId).label, 'landing-title'),
      status,
    )
    status.focus()
    try {
      options.onHandoff(state.regionId, state.scenarioId)
    } catch (error: unknown) {
      console.error('Game handoff failed', error)
      store.dispatch({ type: 'handoffFailed' })
    }
  }

  function render(next: LandingState): void {
    const previous = current
    current = next

    alertRegion.textContent = ''
    panel.className = `landing-panel landing-panel-${layoutFor(next)}`
    setPaused(next.screen === 'handoff')
    setMarkersShown(next.screen !== 'idle')
    setInteractive(next.screen === 'explore' || next.screen === 'regionFocused')
    switch (next.screen) {
      case 'idle':
        showIdle(next, previous)
        break
      case 'explore':
        showExplore(previous)
        break
      case 'regionFocused':
        showRegion(next, previous)
        break
      case 'handoff':
        showHandoff(next)
        break
    }
  }

  const unsubscribe = store.subscribe(render)
  render(store.get())

  return () => {
    if (disposed) return
    disposed = true
    unsubscribe()
    removeMarkerListener()
    removeCredits()
    if (store.get().screen !== 'handoff') {
      globe.setMarkers([])
      globe.highlightMarker(null)
      globe.setInteractive(true)
      if (pausedByLanding) globe.resume()
    }
    container.remove()
  }
}
