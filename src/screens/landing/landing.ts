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
import {
  createBackButton,
  createContributorDialog,
  createEdgeButton,
  createTitle,
} from './elements.ts'
import {
  LOCALE_TILT_DEGREES,
  OVERVIEW,
  type GlobeTarget,
  type LandingGlobe,
  type LandingMarker,
} from './landingGlobe.ts'
import { createRegionCard, LOAD_FAILED_MESSAGE } from './regionCard.ts'
import { createRegionList } from './regionList.ts'
import wordmarkUrl from '../../../design/landshift-wordmark.svg'
import '../../ui/ui.css'
import './landing.css'

/** Full glow holds this long after the wordmark appears, or after the pointer last moved. */
const GLOW_HOLD_MS = 3000
const GLOW_RISE_MS = 280
const GLOW_FALL_MS = 820

const TAGLINE = 'How does our Earth develop?'
const TEAM = ['Rikesh Subedi', 'Marian Hurta', 'David Tilser'] as const
const EXPLORE_HINT = 'Drag the globe and choose a region'
/** three-render-objects leaves the camera at Three's default vertical field of view. */
const CAMERA_FOV_DEGREES = 50
/** Clear space kept between Explore and the earth's limb. */
const EARTH_BUTTON_GAP = 24

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

function createWordmark(): HTMLHeadingElement {
  const title = document.createElement('h1')
  title.className = 'landing-headline'
  const image = document.createElement('img')
  image.className = 'landing-wordmark'
  image.src = wordmarkUrl
  image.alt = 'LandShift'
  title.append(image)
  return title
}

/** Screen disc of the earth. Altitude is radii above the surface, so camera distance is one more. */
function earthDisc(cell: HTMLElement): {
  x: number
  y: number
  radius: number
} {
  const rect = cell.getBoundingClientRect()
  const sinLimb = 1 / (1 + OVERVIEW.altitude)
  const projected =
    sinLimb /
    Math.sqrt(1 - sinLimb * sinLimb) /
    Math.tan((CAMERA_FOV_DEGREES * Math.PI) / 360)
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    radius: (rect.height / 2) * projected,
  }
}

/** Keeps the whole wordmark, glow included, inside the screen. */
function placeWordmark(headline: HTMLElement, cell: HTMLElement): void {
  const earth = earthDisc(cell)
  const frame =
    headline.offsetParent instanceof HTMLElement
      ? headline.offsetParent.getBoundingClientRect()
      : cell.getBoundingClientRect()
  const image = headline.querySelector('img')
  if (!(image instanceof HTMLImageElement)) return
  const aspect = 1060.198 / 587.641
  const margin = 20
  const maxWidth = frame.width - margin * 2
  const maxHeight = frame.height - margin * 2
  let width = Math.min(earth.radius * 1.85, maxWidth)
  if (width / aspect > maxHeight) width = maxHeight * aspect
  const height = width / aspect
  image.style.left = `${margin}px`
  image.style.top = `${margin}px`
  image.style.width = `${width}px`
  const view = headline.parentElement
  const tagline = view?.querySelector('.landing-tagline')
  if (tagline instanceof HTMLElement) {
    const belowEarth = earth.y - frame.top + earth.radius + 18
    const maxTop = frame.height - tagline.offsetHeight - 12
    tagline.style.left = `${earth.x - frame.left}px`
    tagline.style.top = `${Math.min(belowEarth, maxTop)}px`
  }
  const buttons = view
    ? [...view.querySelectorAll<HTMLElement>('.landing-edge-button')]
    : []
  if (buttons.length > 0) {
    placeEdgeBars(
      buttons,
      frame.left + margin + width / 2,
      margin + height + 12,
      frame,
      earth,
    )
  }
  headline.style.setProperty('--cut-x', `${earth.x - frame.left}px`)
  headline.style.setProperty('--cut-y', `${earth.y - frame.top}px`)
  headline.style.setProperty('--earth-r', `${earth.radius}px`)
  const paint = (): void => {
    requestAnimationFrame(() => pixelateWordmark(image))
  }
  if (image.complete && image.naturalWidth > 0) paint()
  else image.addEventListener('load', paint, { once: true })
}

/** Shared right edge for the bars, shifted left when any of them would crowd the earth. */
function placeEdgeBars(
  buttons: HTMLElement[],
  idealCenter: number,
  top: number,
  frame: DOMRect,
  earth: { x: number; y: number; radius: number },
): void {
  for (const button of buttons) button.style.width = 'auto'
  const widest = Math.max(...buttons.map((button) => button.offsetWidth))
  const barHeight = buttons[0]?.offsetHeight ?? 0
  const gap = 8
  let right = Number.POSITIVE_INFINITY
  for (let index = 0; index < buttons.length; index += 1) {
    const screenTop = frame.top + top + index * (barHeight + gap)
    const minCenter = frame.left + widest / 2
    const center = Math.max(
      minCenter,
      centerClearOfEarth(idealCenter, screenTop, widest, barHeight, earth),
    )
    right = Math.min(right, center + widest / 2)
  }
  const left = frame.left - barHeight / 2 - 4
  buttons.forEach((button, index) => {
    button.style.left = `${left - frame.left}px`
    button.style.width = `${right - left}px`
    button.style.top = `${top + index * (barHeight + gap)}px`
  })
}

/** Button center, shifted left when that would crowd the earth. */
function centerClearOfEarth(
  ideal: number,
  top: number,
  width: number,
  height: number,
  earth: { x: number; y: number; radius: number },
): number {
  const halfW = width / 2
  const halfH = height / 2
  if (halfW < 1 || halfH < 1) return ideal
  const cy = top + halfH
  const clearance = (cx: number): number => {
    const nearX = Math.min(Math.max(earth.x, cx - halfW), cx + halfW)
    const nearY = Math.min(Math.max(earth.y, cy - halfH), cy + halfH)
    return Math.hypot(earth.x - nearX, earth.y - nearY) - earth.radius
  }
  if (clearance(ideal) >= EARTH_BUTTON_GAP) return ideal
  let lo = ideal - earth.radius - width - EARTH_BUTTON_GAP
  let hi = ideal
  if (clearance(lo) < EARTH_BUTTON_GAP) return lo
  for (let i = 0; i < 16; i += 1) {
    const mid = (lo + hi) / 2
    if (clearance(mid) < EARTH_BUTTON_GAP) hi = mid
    else lo = mid
  }
  return lo
}

/** Samples the painted wordmark down and back up. Block size shrinks as the glow brightens. */
function pixelateWordmark(image: HTMLImageElement): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  glowImage = image
  if (reduced) {
    paintWordmark(image, 1)
    return
  }
  if (!glowArmed) {
    glowShown = 1
    lastPointerAt = performance.now()
  }
  if (!paintWordmark(image, glowShown)) return
  if (!glowArmed) {
    glowShown = 1
    lastPointerAt = performance.now()
    glowArmed = true
  }
  watchPointer()
  if (glowFrame === 0) startWordmarkGlow()
}

let glowShown = 0
let lastGlowNow = 0
let lastPointerAt = Number.NEGATIVE_INFINITY
let glowFrame = 0
let glowImage: HTMLImageElement | null = null
let glowArmed = false
let stopPointerWatch: (() => void) | null = null
let sampleCanvas: HTMLCanvasElement | null = null

function watchPointer(): void {
  if (stopPointerWatch) return
  const onMove = (): void => {
    lastPointerAt = performance.now()
    if (glowFrame === 0 && glowImage) startWordmarkGlow()
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  stopPointerWatch = () => window.removeEventListener('pointermove', onMove)
}

function startWordmarkGlow(): void {
  if (glowFrame !== 0) return
  const tick = (now: number): void => {
    const image = glowImage
    if (!image?.isConnected) {
      stopWordmarkGlow()
      return
    }
    const dt = lastGlowNow === 0 ? 16 : Math.min(48, now - lastGlowNow)
    lastGlowNow = now
    const holding = now - lastPointerAt < GLOW_HOLD_MS
    const target = holding ? 1 : 0
    const tau = target > glowShown ? GLOW_RISE_MS : GLOW_FALL_MS
    glowShown += (target - glowShown) * (1 - Math.exp(-dt / tau))
    if (Math.abs(glowShown - target) < 0.004) glowShown = target
    paintWordmark(image, glowShown)
    if (glowShown === 0 && !holding) {
      glowFrame = 0
      lastGlowNow = 0
      return
    }
    glowFrame = requestAnimationFrame(tick)
  }
  glowFrame = requestAnimationFrame(tick)
}

function paintWordmark(image: HTMLImageElement, level: number): boolean {
  const host = image.parentElement
  if (!host) return false
  const liveWidth = image.clientWidth
  const liveHeight = image.clientHeight
  if (liveWidth < 8 || liveHeight < 8) return false
  let canvas = host.querySelector('canvas')
  if (!(canvas instanceof HTMLCanvasElement)) {
    canvas = document.createElement('canvas')
    canvas.className = 'landing-wordmark-pixels'
    canvas.setAttribute('aria-hidden', 'true')
    host.append(canvas)
  }
  canvas.style.left = image.style.left
  canvas.style.top = image.style.top
  canvas.style.width = `${liveWidth}px`
  canvas.style.height = `${liveHeight}px`
  const block = 1 + (1 - level) * 2.4
  const sample = sampleCanvas ?? document.createElement('canvas')
  sampleCanvas = sample
  sample.width = Math.max(1, Math.round(liveWidth / block))
  sample.height = Math.max(1, Math.round(liveHeight / block))
  const sampleContext = sample.getContext('2d')
  const context = canvas.getContext('2d')
  if (!sampleContext || !context) return false
  sampleContext.drawImage(image, 0, 0, sample.width, sample.height)
  canvas.width = Math.round(liveWidth)
  canvas.height = Math.round(liveHeight)
  context.imageSmoothingEnabled = false
  context.filter = `brightness(${0.84 + level * 0.51})`
  context.drawImage(sample, 0, 0, canvas.width, canvas.height)
  image.style.opacity = '0'
  return true
}

function stopWordmarkGlow(): void {
  cancelAnimationFrame(glowFrame)
  glowFrame = 0
  glowImage = null
  glowArmed = false
  glowShown = 0
  lastGlowNow = 0
  lastPointerAt = Number.NEGATIVE_INFINITY
  stopPointerWatch?.()
  stopPointerWatch = null
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
 * highlight, scenario pins, interactivity, and any pause landing applied; during handoff it leaves the
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

  let stopWordmarkFit: () => void = () => {}

  function showView(...children: HTMLElement[]): void {
    stopWordmarkFit()
    stopWordmarkGlow()
    stopWordmarkFit = () => {}
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
    const explore = createEdgeButton('Explore', () => {
      store.dispatch({ type: 'explore' })
    })
    const teamDialog = createContributorDialog(TEAM)
    const team = createEdgeButton('Our team', () => {
      teamDialog.showModal()
    })
    teamDialog.addEventListener('close', () => {
      team.focus()
    })
    const wordmark = createWordmark()
    const tagline = document.createElement('p')
    tagline.className = 'landing-tagline'
    tagline.textContent = TAGLINE
    showView(wordmark, tagline, explore, team, teamDialog)
    const fit = (): void => placeWordmark(wordmark, globeCell)
    const observer = new ResizeObserver(fit)
    observer.observe(globeCell)
    fit()
    stopWordmarkFit = () => observer.disconnect()
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
    stopWordmarkFit()
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
