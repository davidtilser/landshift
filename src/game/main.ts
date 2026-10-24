import 'cesium/Build/Cesium/Widgets/widgets.css'
import './style.css'
import { readGameLaunch } from '../shared/game-launch.ts'
import { getScenario, SAN_JOSE_SCENARIO_ID } from '../shared/scenarios.ts'
import { loadDataPack } from './data.ts'
import { GameScene } from './map.ts'
import type { OnlineState } from './map.ts'
import { loadElevationGrid } from './terrain.ts'
import { campus, insideBounds } from './geometry.ts'
import type { LngLat } from './geometry.ts'
import { Gameplay } from './gameplay.ts'

function el<T extends HTMLElement>(
  selector: string,
  expected: { new (): T },
): T {
  const value = document.querySelector(selector)
  if (!(value instanceof expected))
    throw new Error(`Missing interface element: ${selector}`)
  return value
}

const paths: Record<string, string> = {
  leaf: '<path d="M19 4C10 3 4 6 4 13a6 6 0 0 0 6 6c7 0 10-6 9-15Z"/><path d="m5 19 9-9M10 14v-4m0 4h4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  move: '<path d="M12 3v18M3 12h18m-12-6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  compass: '<path d="m15 9-2 4-4 2 2-4 4-2Z"/><circle cx="12" cy="12" r="9"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5m-9 5L3 7m9 5v10"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
}
function icon(name: string, size = 20): string {
  return `<svg width="${String(size)}" height="${String(size)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ''}</svg>`
}
function tool(id: string, name: string, label: string): string {
  return `<button id="${id}" class="icon-button" title="${label}" aria-label="${label}">${icon(name)}</button>`
}

const root = el('#game', HTMLDivElement)
const launch = readGameLaunch(new URL(window.location.href))
const scenario = getScenario(launch?.scenarioId ?? SAN_JOSE_SCENARIO_ID)
root.innerHTML = `
  <main class="studio">
    <div id="map" aria-label="Interactive 3D map of North San José"></div>
    <header class="topbar">
      <a class="brand" href="./" aria-label="Landshift onboarding"><span class="brand-icon">${icon('leaf', 24)}</span>landshift<span class="brand-dot">.</span></a>
      <div class="breadcrumbs"><span>California</span><span class="crumb-divider">/</span><span>San José</span><span class="edition">CESIUM 3D</span></div>
      <nav class="top-actions" aria-label="Studio actions"><span class="offline-badge"><span></span> <span id="connection-label">Local aerial</span></span>${tool('credits', 'info', 'Data sources and limitations')}<button id="map-layers-toggle" class="text-button" aria-expanded="false">Map layers</button><button id="reset-plan" class="text-button">Reset design ${icon('reset', 15)}</button></nav>
    </header>
    <section class="project-panel" aria-label="Move and rotate the campus">
      <h1 id="project-title" hidden>Build a better neighbor.</h1>
      <div hidden><button id="mode-explore">Explore</button><button id="mode-design">Design</button><span id="footprint"></span></div>
      <section class="design-section" aria-label="Campus tools">
        <button id="place" class="primary-button" aria-pressed="false">${icon('move', 17)} Move</button>
        <details class="rotation-tool"><summary title="Rotate the campus" aria-label="Rotate the campus">${icon('reset', 20)}</summary><div class="rotation-popover"><label class="rotation-label" for="rotation"><span>Rotate</span><output id="rotation-value">28°</output></label><input id="rotation" type="range" min="0" max="359" value="28" aria-label="Campus orientation in degrees"></div></details>
        <p id="placement-hint" class="field-note">Grab the green handle and move it.</p>
      </section>
    </section>
    <aside class="layers-panel panel" aria-labelledby="layers-title">
      <div class="section-heading"><h2 id="layers-title">Read the landscape</h2>${icon('layers', 17)}</div>
      <button id="reality" class="reality-button" aria-pressed="false"><span class="reality-orb"></span><span><strong>Photorealistic 3D</strong><small>Explore the real city</small></span>${icon('arrow', 16)}</button><div class="basemap-picker" role="group" aria-label="Local basemap"><button id="landscape" aria-pressed="false"><span class="map-swatch landscape-swatch"></span>Landscape</button><button id="aerial" class="active" aria-pressed="true"><span class="map-swatch aerial-swatch"></span>Aerial</button></div>
      <div class="layer-list">
        <label><span><i class="legend-square buildings-key"></i>3D buildings</span><input type="checkbox" data-layer="buildings" checked></label>
        <label><span><i class="legend-circle trees-key"></i>Street trees</span><input type="checkbox" data-layer="trees" checked></label>
        <label><span><i class="legend-line parcels-key"></i>Parcel boundaries</span><input type="checkbox" data-layer="parcels"></label>
        <label><span><i class="legend-square zoning-key"></i>Zoning context</span><input type="checkbox" data-layer="zoning"></label>
        <label><span><i class="legend-square flood-key"></i>Special flood-hazard areas</span><input type="checkbox" data-layer="flood"></label>
      </div>
      <div class="map-key"><span class="reference-line"></span>Official project outline</div>
      <button id="layer-credits" class="source-link">Real geography. Transparent assumptions. ${icon('arrow', 13)}</button>
    </aside>
    <div class="view-controls panel" role="group" aria-label="Map navigation">${tool('zoom-in', 'plus', 'Zoom in')}${tool('zoom-out', 'minus', 'Zoom out')}<span class="control-divider"></span>${tool('north', 'compass', 'Face north')}<button id="perspective" class="icon-button view-label" aria-label="Switch to top-down view" aria-pressed="true">3D</button>${tool('home-view', 'expand', 'Frame project site')}</div>
    <nav class="camera-presets panel" aria-label="Camera views"><button data-camera="neighborhood">Neighborhood</button><button data-camera="site" class="active">Project site</button><button data-camera="street">Close-up</button></nav><div id="cesium-credits"></div><div class="location-chip">${icon('pin', 14)} <span id="coordinates">37.3786° N · 121.9332° W</span><span class="location-divider"></span><span id="zoom-label">CESIUM 3D</span></div>
    <footer class="bottom-bar"><div class="navigation-hint"><span>${icon('move', 15)} Drag to pan</span><span><kbd>Scroll</kbd> Zoom</span><span><kbd>Right drag</kbd> Orbit & tilt</span><button id="help">More controls</button></div><div class="attribution">CesiumJS · City of San José · Local data + streamed 3D</div></footer>
    <div id="toast" role="status" aria-live="polite" hidden></div>
    <div id="loading" class="loading-screen"><div class="loading-card"><span class="loading-mark">${icon('leaf', 34)}</span><h2>Welcome to the neighborhood.</h2><p id="loading-message">Opening the 3D planning scene…</p><div class="loading-line"></div></div></div>
    <dialog id="connect-dialog"><div class="dialog-top"><span class="eyebrow">GOOGLE PHOTOREALISTIC 3D · CESIUM ION</span><button id="close-connect" class="icon-button" aria-label="Close connection settings">${icon('close')}</button></div><h2>A real city.<br>In a new dimension.</h2><p>Connect your Cesium ion account to explore San José with photorealistic buildings, trees and terrain. This view uses an internet connection and your account quota.</p><form id="connect-form"><label for="ion-token">Cesium ion access token</label><input id="ion-token" type="password" autocomplete="off" spellcheck="false" placeholder="Your browser-safe, read-only token" required><p class="field-note">Kept in this tab’s session, never committed to the repository. You can also configure VITE_CESIUM_ION_TOKEN in .env.local.</p><button id="connect-submit" class="primary-button" type="submit">Connect photorealistic 3D ${icon('arrow', 17)}</button><p id="connect-message" role="status"></p></form><a class="account-link" href="https://ion.cesium.com/tokens" target="_blank" rel="noopener noreferrer">Open Cesium ion access tokens ↗</a></dialog>
    <dialog id="info-dialog"><div class="dialog-top"><span class="eyebrow">BEHIND THE LANDSCAPE</span>${tool('close-dialog', 'close', 'Close information')}</div><h2>A real place.<br>A clearly labeled possibility.</h2><p>This is a local planning sketch around the real San José Data Center 04 proposal. The movable campus is an illustrative alternative, not the applicant’s engineering design.</p><div id="pack-summary"></div><p>Photorealistic mode streams Google 3D Tiles through your Cesium ion account and requires internet. Aerial and landscape views use the local pack. Building heights in local views may be approximations.</p><h3>Move through the neighborhood</h3><div class="keyboard-guide"><span>Pan</span><strong>Drag · arrow keys · W A S D</strong><span>Zoom</span><strong>Scroll · + / −</strong><span>Orbit & tilt</span><strong>Right drag · Shift + arrows</strong><span>Place campus</span><strong>Drag green handle · Move campus, then click</strong><span>Move focused handle</span><strong>Arrow keys · Shift for larger steps</strong><span>Cancel placement</span><strong>Esc</strong></div><h3>Know what the data can tell you</h3><ul id="limitations"></ul><p class="dialog-footnote">Local views use downloaded assets. Photorealistic mode streams Google 3D Tiles with provider attribution; it is not stored in the offline pack. The game uses simplified environmental and social rules. Open “Game estimates” for all assumptions and sources.</p></dialog>
  </main>
`

function toast(message: string): void {
  const target = el('#toast', HTMLDivElement)
  target.textContent = message
  target.hidden = false
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    target.hidden = true
  }, 3800)
}
let toastTimer = 0
const dialog = el('#info-dialog', HTMLDialogElement)
for (const id of ['credits', 'layer-credits', 'help'])
  el(`#${id}`, HTMLButtonElement).addEventListener('click', () => {
    dialog.showModal()
  })
el('#close-dialog', HTMLButtonElement).addEventListener('click', () => {
  dialog.close()
})
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close()
})

async function start(): Promise<void> {
  if (!scenario)
    throw new Error(
      'This scenario is not available. Return to onboarding and choose San José Data Center 04.',
    )
  const pack = await loadDataPack()
  const grid = await loadElevationGrid(pack.baseUrl)
  let center: LngLat = [...pack.manifest.center]
  let bearing = 28
  let placing = false
  let placementOrigin: LngLat | undefined
  let is3D = true
  const handle = document.createElement('button')
  handle.className = 'campus-handle'
  handle.type = 'button'
  handle.innerHTML = `${icon('move', 17)}<span>YOUR CAMPUS</span>`
  handle.setAttribute(
    'aria-label',
    'Move concept campus. Drag, or focus and use arrow keys.',
  )
  const rotation = el('#rotation', HTMLInputElement)
  const placeButton = el('#place', HTMLButtonElement)
  const hint = el('#placement-hint', HTMLParagraphElement)
  const connectDialog = el('#connect-dialog', HTMLDialogElement)
  const connectionMessage = el('#connect-message', HTMLParagraphElement)
  const tokenField = el('#ion-token', HTMLInputElement)
  const connectSubmit = el('#connect-submit', HTMLButtonElement)
  const configuredToken: unknown = import.meta.env['VITE_CESIUM_ION_TOKEN']
  let token = typeof configuredToken === 'string' ? configuredToken.trim() : ''
  try {
    token = sessionStorage.getItem('landshift.cesium.token') || token
  } catch {
    /* Session storage may be disabled. */
  }

  function setBasemapButtons(selected: string): void {
    for (const id of ['aerial', 'landscape', 'reality']) {
      const button = el(`#${id}`, HTMLButtonElement)
      button.classList.toggle('active', id === selected)
      button.setAttribute('aria-pressed', String(id === selected))
    }
  }
  function onlineState(state: OnlineState): void {
    const labels: Record<OnlineState, string> = {
      local: 'Local aerial',
      connecting: 'Connecting 3D…',
      online: 'Photorealistic 3D',
      error: 'Local fallback',
    }
    el('#connection-label', HTMLSpanElement).textContent = labels[state]
    el('.offline-badge', HTMLSpanElement).dataset['connection'] = state
    el('#reality', HTMLButtonElement).classList.toggle(
      'connecting',
      state === 'connecting',
    )
    const buildingToggle = document
      .querySelector<HTMLInputElement>('[data-layer="buildings"]')
      ?.closest('label')
    if (buildingToggle instanceof HTMLElement)
      buildingToggle.hidden = state === 'online'
    if (state === 'online') {
      setBasemapButtons('reality')
      connectionMessage.textContent =
        'Connected. Explore the photorealistic neighborhood.'
      connectDialog.close()
    }
    if (state === 'error') {
      setBasemapButtons('aerial')
      toast(
        'Photorealistic 3D could not connect. The local aerial map is still available.',
      )
    }
  }
  function refreshSignals(): void {
    gameplay.setSite(center, bearing)
  }
  function update(check = false): void {
    const proposal = campus(center, bearing)
    scene.updateCampus(proposal.volumes, center, bearing)
    el('#rotation-value', HTMLOutputElement).value = `${bearing.toFixed(0)}°`
    el('#footprint', HTMLElement).textContent =
      `${Math.round(proposal.area).toLocaleString()} m²`
    if (check) refreshSignals()
  }
  function move(next: LngLat, check: boolean): boolean {
    if (
      !insideBounds(campus(next, bearing).volumes, pack.manifest.playableBounds)
    ) {
      if (check)
        toast(
          'Keep the whole campus inside the study area. Choose the neighborhood view to see its boundary.',
        )
      return false
    }
    center = next
    update(check)
    return true
  }
  function setPlacing(value: boolean, committed = false): void {
    if (value && !placing) placementOrigin = [...center]
    if (!value && placementOrigin) {
      if (!committed) {
        center = placementOrigin
        update(true)
      }
      placementOrigin = undefined
    }
    placing = value
    scene.setPlacing(value)
    placeButton.classList.toggle('placing', value)
    placeButton.setAttribute('aria-pressed', String(value))
    hint.textContent = value
      ? 'Move the mouse to preview, then click to place. Esc to cancel.'
      : 'Drag the green handle, or choose a new spot on the map.'
  }
  const scene = new GameScene(pack, grid, handle, {
    cameraChanged: (camera) => {
      el('#coordinates', HTMLSpanElement).textContent =
        `${camera.lat.toFixed(4)}° N · ${Math.abs(camera.lng).toFixed(4)}° W`
      el('#zoom-label', HTMLSpanElement).textContent =
        `${Math.round(camera.height).toLocaleString()} m`
      el('#north', HTMLButtonElement).style.setProperty(
        '--bearing',
        `${(-camera.heading).toFixed(1)}deg`,
      )
      is3D = camera.is3D
      const button = el('#perspective', HTMLButtonElement)
      button.textContent = is3D ? '3D' : '2D'
      button.setAttribute(
        'aria-label',
        is3D ? 'Switch to top-down view' : 'Switch to 3D view',
      )
      button.setAttribute('aria-pressed', String(is3D))
    },
    positionRequested: (position) => {
      if (move(position, true)) setPlacing(false, true)
    },
    positionPreviewed: (position) => {
      hint.textContent = move(position, false)
        ? 'Click to place here. Esc to cancel.'
        : 'Outside the study area. Move back inside to place.'
    },
    dragged: (position, finished) => {
      move(position, finished)
    },
    onlineChanged: onlineState,
    mapError: toast,
  })
  const gameplay = new Gameplay(pack, {
    stageChanged: (stage) => {
      scene.setFocus(stage)
    },
    revealFuture: () => {
      scene.setCamera('site', 0.8)
    },
    beforeExperiment: () => {
      setPlacing(false)
      scene.cancelDrag()
    },
    landscapeChanged: (choices, year, weather) => {
      scene.setLandscape(choices, year, weather)
    },
    restoreSite: (position, orientation) => {
      setPlacing(false)
      center = position
      bearing = orientation
      rotation.value = String(orientation)
      update(true)
    },
    message: toast,
  })
  const mapLayers = el('.layers-panel', HTMLElement)
  const mapLayersToggle = el('#map-layers-toggle', HTMLButtonElement)
  mapLayers.hidden = true
  mapLayersToggle.addEventListener('click', () => {
    mapLayers.hidden = !mapLayers.hidden
    const gamePanel = el('.gameplay-panel', HTMLElement)
    gamePanel.hidden = !mapLayers.hidden
    mapLayersToggle.setAttribute('aria-expanded', String(!mapLayers.hidden))
    mapLayersToggle.textContent = mapLayers.hidden
      ? 'Map layers'
      : 'Game choices'
  })
  update(true)
  el('#loading', HTMLDivElement).hidden = true

  const summary = document.createElement('p')
  summary.className = 'pack-facts'
  summary.textContent = `Local imagery: ${pack.manifest.imageryDate} · Source resolution: 60 cm · Local pack: ${(pack.manifest.totalBytes / 1024 / 1024).toFixed(1)} MiB. Photorealistic mode uses a separate streamed dataset whose imagery dates vary.`
  el('#pack-summary', HTMLDivElement).append(summary)
  for (const text of pack.manifest.limitations) {
    if (text.startsWith('No environmental, employment')) continue
    const item = document.createElement('li')
    item.textContent = text
    el('#limitations', HTMLUListElement).append(item)
  }
  async function connect(): Promise<void> {
    if (!token) {
      connectDialog.showModal()
      tokenField.focus()
      return
    }
    connectSubmit.disabled = true
    connectionMessage.textContent = 'Connecting to Cesium ion…'
    try {
      await scene.connectPhotorealistic(token)
      try {
        sessionStorage.setItem('landshift.cesium.token', token)
      } catch {
        /* Session storage is optional. */
      }
    } catch (error: unknown) {
      connectionMessage.textContent =
        error instanceof Error
          ? error.message
          : 'Could not connect to 3D imagery.'
    } finally {
      connectSubmit.disabled = false
    }
  }
  el('#reality', HTMLButtonElement).addEventListener('click', () => {
    void connect()
  })
  el('#connect-form', HTMLFormElement).addEventListener('submit', (event) => {
    event.preventDefault()
    token = tokenField.value.trim()
    void connect()
  })
  el('#close-connect', HTMLButtonElement).addEventListener('click', () => {
    connectDialog.close()
  })
  connectDialog.addEventListener('click', (event) => {
    if (event.target === connectDialog) connectDialog.close()
  })
  if (token) void connect()
  else
    toast(
      'Cesium 3D is ready. Connect your ion account for photorealistic surroundings.',
    )

  handle.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 0.0002 : 0.00004
    const deltas: Record<string, LngLat> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    }
    const delta = deltas[event.key]
    if (!delta) return
    event.preventDefault()
    event.stopPropagation()
    move([center[0] + delta[0], center[1] + delta[1]], true)
  })
  rotation.addEventListener('input', () => {
    const next = Number(rotation.value)
    if (
      !insideBounds(campus(center, next).volumes, pack.manifest.playableBounds)
    ) {
      rotation.value = String(bearing)
      toast(
        'That rotation crosses the study boundary. Move the campus farther inside first.',
      )
      return
    }
    bearing = next
    update()
  })
  rotation.addEventListener('change', refreshSignals)
  placeButton.addEventListener('click', () => {
    setPlacing(!placing)
  })
  function setMode(design: boolean): void {
    scene.setDesignMode(design)
    el('.design-section', HTMLElement).hidden = !design
    for (const [id, active] of [
      ['mode-design', design],
      ['mode-explore', !design],
    ] as const) {
      el(`#${id}`, HTMLButtonElement).classList.toggle('selected', active)
      el(`#${id}`, HTMLButtonElement).setAttribute(
        'aria-pressed',
        String(active),
      )
    }
    setPlacing(false)
  }
  el('#mode-design', HTMLButtonElement).addEventListener('click', () => {
    setMode(true)
  })
  el('#mode-explore', HTMLButtonElement).addEventListener('click', () => {
    setMode(false)
  })
  for (const input of document.querySelectorAll<HTMLInputElement>(
    '[data-layer]',
  ))
    input.addEventListener('change', () => {
      const layer = input.dataset['layer']
      if (layer) scene.setLayer(layer, input.checked)
    })
  for (const id of ['aerial', 'landscape'] as const)
    el(`#${id}`, HTMLButtonElement).addEventListener('click', () => {
      scene.setLocalStyle(id)
      setBasemapButtons(id)
      el('#connection-label', HTMLSpanElement).textContent =
        id === 'aerial' ? 'Local aerial' : 'Local landscape'
    })
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    '[data-camera]',
  ))
    button.addEventListener('click', () => {
      const preset = button.dataset['camera']
      if (preset !== 'site' && preset !== 'street' && preset !== 'neighborhood')
        return
      scene.setCamera(preset)
      for (const item of document.querySelectorAll('[data-camera]'))
        item.classList.toggle('active', item === button)
    })
  el('#zoom-in', HTMLButtonElement).addEventListener('click', () => {
    scene.zoom(true)
  })
  el('#zoom-out', HTMLButtonElement).addEventListener('click', () => {
    scene.zoom(false)
  })
  el('#north', HTMLButtonElement).addEventListener('click', () => {
    scene.faceNorth()
  })
  el('#home-view', HTMLButtonElement).addEventListener('click', () => {
    scene.setCamera('site')
  })
  el('#perspective', HTMLButtonElement).addEventListener('click', () => {
    scene.topDown(is3D)
  })
  el('#reset-plan', HTMLButtonElement).addEventListener('click', () => {
    setPlacing(false)
    center = [...pack.manifest.center]
    bearing = 28
    rotation.value = '28'
    update(true)
    setMode(true)
    gameplay.reset()
    toast('Concept campus returned to its starting position.')
  })
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setPlacing(false)
      scene.cancelDrag()
    }
    if (
      document.querySelector('dialog[open]') ||
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLButtonElement ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return
    const deltas: Record<string, [number, number]> = {
      w: [0, -65],
      a: [-65, 0],
      s: [0, 65],
      d: [65, 0],
    }
    const delta = deltas[event.key.toLowerCase()]
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-65, 0],
      ArrowRight: [65, 0],
      ArrowUp: [0, -65],
      ArrowDown: [0, 65],
    }
    const arrow = arrows[event.key]
    if (arrow) {
      event.preventDefault()
      if (event.shiftKey) scene.orbit(arrow[0] / 10, -arrow[1] / 10)
      else scene.pan(...arrow)
      return
    }
    if (!delta) return
    event.preventDefault()
    scene.pan(...delta)
  })
  window.addEventListener(
    'pagehide',
    () => {
      gameplay.destroy()
      scene.destroy()
    },
    { once: true },
  )
}

void start().catch((error: unknown) => {
  el('#loading-message', HTMLParagraphElement).textContent =
    error instanceof Error ? error.message : 'The 3D scene could not start.'
  el('.loading-card h2', HTMLElement).textContent =
    'The scene needs a little preparation.'
  el('.loading-line', HTMLElement).hidden = true
})
