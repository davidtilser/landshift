import type { LandingState, LandingStore } from '../../app/state.ts'
import {
  findRegion,
  leafRegions,
  regions,
  type Region,
} from '../../regions/regions.ts'
import {
  findScenario,
  scenariosForRegion,
  type Scenario,
} from '../../scenarios/scenarios.ts'
import { mountCreditsPanel } from '../../ui/creditsPanel.ts'
import { createBackButton, createButton, createTitle } from './elements.ts'
import {
  LOCALE_TILT_DEGREES,
  OVERVIEW,
  type GlobeTarget,
  type LandingGlobe,
  type LandingMarker,
} from './landingGlobe.ts'
import { createRegionCard, LOAD_FAILED_MESSAGE } from './regionCard.ts'
import { createRegionList } from './regionList.ts'
import '../../ui/ui.css'
import './landing.css'

const HEADLINE = 'LandShift'
const TAGLINE = 'Learn how our Earth is developing'
const EXPLORE_HINT = 'Drag the globe and choose a region'

let mountCount = 0

export interface LandingOptions {
  /** Caller-owned globe host; landing moves it into the globe cell and never replaces its contents. */
  globeHost: HTMLElement
  /**
   * The real globe, or a promise for it. A promise lets the menu paint before that bundle parses;
   * calls made meanwhile are replayed when it resolves.
   */
  globe: LandingGlobe | Promise<LandingGlobe>
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

const groupByRegionId = new Map<string, string>()

function indexGroups(
  list: readonly Region[],
  parentLabel: string | null,
): void {
  for (const region of list) {
    if (parentLabel !== null) groupByRegionId.set(region.id, parentLabel)
    indexGroups(region.children, region.label)
  }
}

indexGroups(regions, null)

function toMarker(region: Region): LandingMarker {
  const group = groupByRegionId.get(region.id)
  if (group === undefined) {
    throw new Error(`Region ${region.id} has no parent group`)
  }
  return {
    id: region.id,
    lat: region.center.lat,
    lng: region.center.lng,
    label: region.label,
    enabled: region.enabled,
    group,
  }
}

function isGlobePromise(
  value: LandingGlobe | Promise<LandingGlobe>,
): value is Promise<LandingGlobe> {
  return 'then' in value && typeof value.then === 'function'
}

/** Forwards landing calls, and replays the latest ones if the globe arrives later. */
function relayGlobe(
  source: LandingGlobe | Promise<LandingGlobe>,
  isClosed: () => boolean,
): LandingGlobe {
  let inner: LandingGlobe | null = null
  const listeners = new Set<(id: string) => void>()
  const removers = new Map<(id: string) => void, () => void>()
  let flightResolvers: (() => void)[] = []
  let markers: readonly LandingMarker[] = []
  let highlighted: string | null = null
  let interactive = true
  let autoRotate: boolean | null = null
  let paused: boolean | null = null
  let flight: GlobeTarget | null = null
  let focusedRegion: string | null = null
  let focusKnown = false
  let hoverPoint: { lat: number; lng: number } | null = null
  let hoverKnown = false
  let scenarioPins: readonly { lat: number; lng: number }[] = []
  let pinsKnown = false

  const attach = (next: LandingGlobe): void => {
    if (isClosed()) return
    inner = next
    for (const listener of listeners) {
      removers.set(listener, next.onMarkerClick(listener))
    }
    next.setMarkers(markers)
    next.highlightMarker(highlighted)
    next.setInteractive(interactive)
    if (focusKnown) next.focusRegion(focusedRegion)
    if (pinsKnown) next.setScenarioPins(scenarioPins)
    if (hoverKnown) next.setHoverPoint(hoverPoint)
    if (paused === true) next.pause()
    else if (paused === false) next.resume()
    if (flight !== null) {
      const resolvers = flightResolvers
      flightResolvers = []
      void next.flyTo(flight).then(() => {
        for (const resolve of resolvers) resolve()
      })
      return
    }
    if (autoRotate !== null) next.setAutoRotate(autoRotate)
  }

  if (isGlobePromise(source)) {
    void source.then(attach, (error: unknown) => {
      console.error('Globe failed to load', error)
    })
  } else {
    attach(source)
  }

  return {
    flyTo(target) {
      flight = target
      for (const resolve of flightResolvers) resolve()
      flightResolvers = []
      if (inner) return inner.flyTo(target)
      return new Promise((resolve) => {
        flightResolvers.push(resolve)
      })
    },
    view() {
      return inner?.view() ?? { ...OVERVIEW }
    },
    setAutoRotate(enabled) {
      autoRotate = enabled
      inner?.setAutoRotate(enabled)
    },
    setMarkers(next) {
      markers = next
      inner?.setMarkers(next)
    },
    highlightMarker(id) {
      highlighted = id
      inner?.highlightMarker(id)
    },
    onMarkerClick(listener) {
      listeners.add(listener)
      if (inner) removers.set(listener, inner.onMarkerClick(listener))
      return () => {
        listeners.delete(listener)
        removers.get(listener)?.()
        removers.delete(listener)
      }
    },
    setInteractive(enabled) {
      interactive = enabled
      inner?.setInteractive(enabled)
    },
    focusRegion(regionId) {
      focusedRegion = regionId
      focusKnown = true
      inner?.focusRegion(regionId)
    },
    setScenarioPins(points) {
      scenarioPins = points.map((point) => ({
        lat: point.lat,
        lng: point.lng,
      }))
      pinsKnown = true
      inner?.setScenarioPins(scenarioPins)
    },
    setHoverPoint(point) {
      hoverPoint = point
      hoverKnown = true
      inner?.setHoverPoint(point)
    },
    pause() {
      paused = true
      inner?.pause()
    },
    resume() {
      paused = false
      inner?.resume()
    },
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
  let disposed = false
  const globe = relayGlobe(options.globe, () => disposed)
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
    const tagline = document.createElement('p')
    tagline.className = 'landing-tagline'
    tagline.textContent = TAGLINE
    const intro = document.createElement('div')
    intro.className = 'landing-intro'
    intro.append(tagline, explore)
    showView(createTitle(HEADLINE, 'landing-headline'), intro)
    globe.highlightMarker(null)
    if (!previous) return
    explore.focus()
    // Keep the facing from the regional view; only the zoom returns home.
    const facing = globe.view()
    void globe
      .flyTo({ lat: facing.lat, lng: facing.lng, altitude: OVERVIEW.altitude })
      .then(() => {
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
      const facing = globe.view()
      void globe.flyTo({
        lat: facing.lat,
        lng: facing.lng,
        altitude: OVERVIEW.altitude,
      })
      if (
        listSelection === previous.regionId &&
        regionList.focus(listSelection)
      ) {
        return
      }
    }
    hint.focus()
  }

  function panelInset(): {
    left: number
    top: number
    right: number
    bottom: number
  } {
    const rect = panel.getBoundingClientRect()
    const width = window.innerWidth
    const onLeft = rect.left < 48 && rect.right < width * 0.55
    if (onLeft) {
      return { left: rect.right, top: 12, right: 16, bottom: 16 }
    }
    return {
      left: 12,
      top: 12,
      right: 12,
      bottom: Math.max(16, window.innerHeight - rect.top),
    }
  }

  function localeFlight(
    region: Region,
    pin?: { lat: number; lng: number },
  ): GlobeTarget {
    const extent = region.extent
    return {
      ...region.center,
      altitude: region.altitude,
      tiltDegrees: LOCALE_TILT_DEGREES,
      ...(extent === undefined
        ? {}
        : {
            locale: {
              south: extent.south,
              north: extent.north,
              west: extent.west,
              east: extent.east,
              inset: panelInset(),
              ...(pin === undefined ? {} : { pin }),
            },
          }),
    }
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
      onScenarioHover(location) {
        globe.setHoverPoint(location)
        void globe.flyTo(localeFlight(region, location ?? undefined))
      },
    })
    showView(...card.parts)
    globe.highlightMarker(region.id)
    if (failedScenarioId !== null) {
      alertRegion.textContent = LOAD_FAILED_MESSAGE
      card.focusTarget.focus()
      return
    }
    void globe.flyTo(localeFlight(region))
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
    globeCell.classList.toggle('landing-globe-idle', next.screen === 'idle')
    setPaused(next.screen === 'handoff')
    // Locale view hides the globe pills. Explore still shows them; the keyboard list is separate.
    setMarkersShown(next.screen === 'explore')
    globe.setHoverPoint(null)
    globe.setScenarioPins(
      next.screen === 'regionFocused'
        ? scenariosForRegion(next.regionId).map((scenario) => ({
            lat: scenario.location.lat,
            lng: scenario.location.lng,
          }))
        : [],
    )
    setInteractive(next.screen === 'explore' || next.screen === 'regionFocused')
    globe.focusRegion(next.screen === 'regionFocused' ? next.regionId : null)
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
      globe.setHoverPoint(null)
      globe.setScenarioPins([])
      globe.focusRegion(null)
      globe.setInteractive(true)
      if (pausedByLanding) globe.resume()
    }
    container.remove()
  }
}
