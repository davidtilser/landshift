import 'cesium/Build/Cesium/Widgets/widgets.css'
import '../style.css'
import './style.css'
import { loadDataPack } from '../data.ts'
import { loadElevationGrid } from '../terrain.ts'
import type { LngLat } from '../geometry.ts'
import { PoloScene } from './scene.ts'
import { PoloCommunity } from './community.ts'
import { POLO_BASELINE } from './baseline.ts'
import {
  INITIAL_POLO_STATE,
  POLO_PHASES,
  POLO_PROPOSALS,
  POLO_PROPOSAL_NAMES,
} from './model.ts'
import type { PoloPhase, PoloProposal, PoloSceneState } from './model.ts'
import {
  confirmPoloPlacement,
  movePoloCampus,
  nudgePoloPlacement,
  poloPhaseAt,
  poloPlacementValid,
} from './placement.ts'

const PHASE_LABELS: Record<PoloPhase, string> = {
  M0: 'Today',
  M1: 'Clear',
  M2: 'Grade',
  M3: 'Compact',
  M4: 'Build',
  M5: 'Open',
  M6: 'Operate',
}
const PROPOSAL_COPY: Record<
  PoloProposal,
  {
    icon: string
    hook: string
    explanation: string
    tradeoff: string
    tip: string
  }
> = {
  heat_reuse_neighbors: {
    icon: '♨',
    hook: 'Give waste heat a second job.',
    explanation:
      'Follow server heat through two pipes to a fictional model pool.',
    tradeoff:
      'Heat needs a recipient, new equipment and extra electricity. Backup cooling stays.',
    tip: 'Try turning the pool’s heating demand off.',
  },
  recycled_water: {
    icon: '💧',
    hook: 'A different source. The same cooling need.',
    explanation:
      'Follow a possible recycled supply through treatment to the coolers.',
    tradeoff:
      'Quality, supply and backup need checking. Water still evaporates.',
    tip: 'Compare the source, then follow where the water goes.',
  },
  green_roof: {
    icon: '🌿',
    hook: 'Let the roof hold a little life.',
    explanation: 'Add living roof layers. Try rain to follow the water.',
    tradeoff:
      'Plants need care and sometimes water. The public field is still lost.',
    tip: 'Try rain, then compare with the original roof.',
  },
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}
function button(
  label: string,
  action: string,
  className = '',
): HTMLButtonElement {
  const node = element('button', className, label)
  node.type = 'button'
  node.dataset['poloAction'] = action
  return node
}
function get<T extends HTMLElement>(selector: string, type: { new (): T }): T {
  const found = document.querySelector(selector)
  if (!(found instanceof type))
    throw new Error('Missing Polo demo control: ' + selector)
  return found
}

/** A separate research-led walkthrough; the Heroes’ Grove sandbox keeps its own rules. */
export async function startPoloDemo(): Promise<void> {
  const root = get('#game', HTMLDivElement)
  root.innerHTML = `
    <main class="studio polo-studio">
      <div id="map" aria-label="Interactive 3D map of the Polo Fields"></div>
      <header class="polo-topbar">
        <a class="polo-brand" href="./" aria-label="Landshift onboarding">◉ <strong>landshift.</strong></a>
        <span class="polo-place">Golden Gate Park <b>/</b> Polo Fields</span>
        <nav class="top-actions" aria-label="Demo actions">
          <a class="polo-location-link" href="./game.html?scenario=golden-gate-park">Heroes’ Grove ↗</a>
          <button type="button" data-polo-action="map-style" class="polo-small-button" id="polo-map-style">3D city</button>
          <button type="button" data-polo-action="evidence" class="polo-small-button" aria-label="Open sources and assumptions">ⓘ</button>
          <button type="button" data-polo-action="reset" class="polo-small-button" aria-label="Restart from campus placement" title="Restart from campus placement">↺</button>
        </nav>
      </header>
      <nav class="polo-camera" aria-label="Map views">
        <button type="button" data-polo-action="site">Your site</button>
        <button type="button" data-polo-action="connection">Follow the idea</button>
        <button type="button" data-polo-action="park">Whole park</button>
        <span></span>
        <button type="button" data-polo-action="zoom-in" aria-label="Zoom in">＋</button>
        <button type="button" data-polo-action="zoom-out" aria-label="Zoom out">−</button>
        <span></span>
        <div class="polo-rotation" role="group" aria-label="Rotate the campus"><button type="button" data-polo-action="rotate-left" aria-label="Rotate campus left 5 degrees" title="Rotate campus left">↶</button><output id="polo-bearing" aria-label="Campus bearing">0°</output><button type="button" data-polo-action="rotate-right" aria-label="Rotate campus right 5 degrees" title="Rotate campus right">↷</button></div>
      </nav>
      <div class="polo-scene-label"><span class="polo-live-dot"></span><span id="polo-scene-label">REAL PLACE · FICTIONAL PROJECT</span></div>
      <nav class="polo-people" aria-label="Private community chats"></nav>
      <section class="polo-deck" aria-label="Polo Fields story and proposals">
        <div class="polo-deck-head"><span id="polo-kicker"></span><button type="button" data-polo-action="replay" class="polo-replay">↻ Replay</button></div>
        <h1 id="polo-title"></h1>
        <p class="polo-summary" id="polo-summary"></p>
        <div class="polo-motion" id="polo-motion" hidden><div class="polo-motion-heading"><span id="polo-motion-caption" role="status"></span><button type="button" data-polo-action="skip">Skip ↗</button></div><div class="polo-motion-track" id="polo-motion-track" role="progressbar" aria-label="Phase animation" aria-valuemin="0" aria-valuemax="100"><span id="polo-motion-fill"></span></div><small>Time-compressed illustration</small></div>
        <div class="polo-placement" id="polo-placement" role="group" aria-label="Adjust the campus location">
          <p>Put it on the field, then confirm. You can move it again later.</p>
          <div class="polo-nudges"><button type="button" data-polo-action="nudge-west" aria-label="Move campus west 5 metres">←</button><button type="button" data-polo-action="nudge-north" aria-label="Move campus north 5 metres">↑</button><span>Nudge</span><button type="button" data-polo-action="nudge-south" aria-label="Move campus south 5 metres">↓</button><button type="button" data-polo-action="nudge-east" aria-label="Move campus east 5 metres">→</button></div>
        </div>
        <div class="polo-proposals" id="polo-proposals" role="group" aria-label="Try one proposal" hidden></div>
        <div class="polo-compare" id="polo-compare" role="group" aria-label="Compare the proposal" hidden>
          <button type="button" data-polo-action="baseline">Original plan</button>
          <button type="button" data-polo-action="proposed">With this idea</button>
        </div>
        <div class="polo-concept" id="polo-concept" hidden></div>
        <p class="polo-endpoint-label" id="polo-endpoint-label" hidden>After this step</p><div class="polo-metrics" id="polo-metrics"></div>
        <div class="polo-experiment" id="polo-experiment"></div>
        <details class="polo-details" id="polo-details"><summary>What’s behind this?</summary><div id="polo-detail-copy"></div></details>
        <div class="polo-deck-bottom"><button type="button" data-polo-action="back" class="polo-back">← Back</button><button type="button" data-polo-action="edit-location" class="polo-back" hidden>Move campus</button><button type="button" data-polo-action="next" class="polo-next" id="polo-next">Confirm location →</button></div>
      </section>
      <nav class="polo-timeline" aria-label="Story milestones"></nav>
      <div class="polo-map-help"><strong>Drag campus · ← / → rotate</strong><span>·</span> Scroll to zoom <span>·</span> Right-drag to tilt <button type="button" data-polo-action="skip">Skip animation</button></div>
      <div id="cesium-credits"></div>
      <div class="polo-toast" id="polo-toast" role="status" hidden></div>
      <div class="polo-loading" id="polo-loading"><span>◉</span><h2>A place worth thinking about.</h2><p>Opening the Polo Fields…</p></div>
      <dialog class="polo-evidence" id="polo-evidence" aria-labelledby="polo-evidence-title"><button type="button" data-polo-action="close-evidence" class="polo-dialog-close" aria-label="Close sources">×</button><span class="polo-eyebrow">BEHIND THIS STORY</span><h2 id="polo-evidence-title">Real place. Clear assumptions.</h2><div id="polo-evidence-copy"></div></dialog>
    </main>
  `
  let state: PoloSceneState = {
    ...INITIAL_POLO_STATE,
    center: [...INITIAL_POLO_STATE.center],
  }
  let scene: PoloScene | undefined
  let community: PoloCommunity | undefined
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  let placementSyncTimer: ReturnType<typeof setTimeout> | undefined
  let online = false
  let connecting = false
  let disposed = false
  let motion: {
    phase: PoloPhase
    progress: number
    playing: boolean
    caption: string
  } = { phase: 'M0', progress: 1, playing: false, caption: '' }
  const isDisposed = (): boolean => disposed

  function renderMotion(): void {
    const active =
      state.confirmed &&
      motion.phase === state.phase &&
      motion.playing &&
      !(state.proposal && state.preview)
    get('#polo-motion', HTMLDivElement).hidden = !active
    const caption = get('#polo-motion-caption', HTMLSpanElement)
    if (caption.textContent !== motion.caption)
      caption.textContent = motion.caption
    const progress = Math.round(Math.max(0, Math.min(1, motion.progress)) * 100)
    get('#polo-motion-track', HTMLDivElement).setAttribute(
      'aria-valuenow',
      String(progress),
    )
    get('#polo-motion-fill', HTMLSpanElement).style.width =
      String(progress) + '%'
    get('#polo-endpoint-label', HTMLParagraphElement).hidden = !active
    root.dataset['poloAnimating'] = String(active)
    for (const stop of root.querySelectorAll<HTMLButtonElement>('[data-phase]'))
      stop.classList.toggle(
        'is-playing',
        active && stop.dataset['phase'] === state.phase,
      )
  }

  function message(text: string): void {
    if (disposed) return
    const toast = get('#polo-toast', HTMLDivElement)
    toast.textContent = text
    toast.hidden = false
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.hidden = true
    }, 4300)
  }

  function setState(next: PoloSceneState, syncCommunity = true): void {
    state = { ...next, center: [...next.center] }
    scene?.setState({ ...state })
    if (syncCommunity) {
      clearTimeout(placementSyncTimer)
      community?.sync()
    }
    render()
  }
  function scheduleCommunitySync(): void {
    clearTimeout(placementSyncTimer)
    placementSyncTimer = setTimeout(() => {
      community?.sync()
    }, 450)
  }
  function moveLocation(center: LngLat): boolean {
    if (!poloPlacementValid(center)) return false
    setState(movePoloCampus(state, center), false)
    scheduleCommunitySync()
    return true
  }
  function rotateLocation(value: number): boolean {
    if (!Number.isFinite(value)) return false
    setState(movePoloCampus(state, state.center, value), false)
    scheduleCommunitySync()
    return true
  }
  function setPhase(phase: PoloPhase): void {
    if (!state.confirmed) return
    const previous = POLO_PHASES.indexOf(state.phase)
    const next = POLO_PHASES.indexOf(phase)
    setState(poloPhaseAt(state, phase))
    if (next < previous)
      message('Earlier snapshot · compare how the place changed.')
    else if (next > previous + 1)
      message('Jumped ahead. Replay shows this step being done.')
    if (phase === 'M6') scene?.focus('connection')
  }
  function render(): void {
    const phase = POLO_BASELINE.phases.find((item) => item.id === state.phase)
    if (!phase) throw new Error('Missing research milestone')
    const inOperation = state.confirmed && state.phase === 'M6'
    const proposed = inOperation && state.proposal !== null && state.preview
    const proposal = state.proposal ? PROPOSAL_COPY[state.proposal] : undefined
    root.dataset['poloPhase'] = state.phase
    root.dataset['poloConfirmed'] = String(state.confirmed)
    root.dataset['poloBearing'] = String(state.bearing)
    get('#polo-bearing', HTMLOutputElement).value =
      `${state.bearing.toFixed(0)}°`
    root.dataset['poloProposal'] = proposed
      ? (state.proposal ?? '')
      : 'baseline'
    get('#polo-kicker', HTMLSpanElement).textContent = !state.confirmed
      ? 'YOUR FIRST MOVE'
      : proposed
        ? 'OPERATION · TRY A POSSIBILITY'
        : phase.kicker
    const title = get('#polo-title', HTMLHeadingElement)
    title.hidden = !state.confirmed
    title.textContent = !state.confirmed
      ? ''
      : proposed && proposal
        ? proposal.hook
        : phase.title
    get('#polo-summary', HTMLParagraphElement).textContent = !state.confirmed
      ? 'Drag the campus onto the field. Use ← / → to rotate, then confirm to see what happens.'
      : proposed && proposal
        ? proposal.explanation
        : phase.summary
    get('#polo-placement', HTMLDivElement).hidden = state.confirmed
    get('.polo-timeline', HTMLElement).hidden = !state.confirmed
    const replay = root.querySelector<HTMLButtonElement>(
      '[data-polo-action="replay"]',
    )
    if (replay) replay.hidden = !state.confirmed
    for (const skip of root.querySelectorAll<HTMLButtonElement>(
      '[data-polo-action="skip"]',
    ))
      skip.hidden = !state.confirmed
    const cases = get('#polo-proposals', HTMLDivElement)
    cases.hidden = !inOperation
    cases.replaceChildren()
    if (inOperation)
      for (const id of POLO_PROPOSALS) {
        const choice = button('', 'proposal', 'polo-proposal')
        choice.dataset['proposal'] = id
        choice.setAttribute('aria-pressed', String(id === state.proposal))
        const art = element(
          'span',
          'polo-proposal-icon',
          PROPOSAL_COPY[id].icon,
        )
        art.setAttribute('aria-hidden', 'true')
        const copy = element('span', '')
        copy.append(
          element('strong', '', POLO_PROPOSAL_NAMES[id]),
          element('small', '', 'Visual concept'),
        )
        choice.append(art, copy, element('span', 'polo-proposal-arrow', '↗'))
        cases.append(choice)
      }
    const compare = get('#polo-compare', HTMLDivElement)
    compare.hidden = !inOperation
    compare
      .querySelector('[data-polo-action="baseline"]')
      ?.setAttribute('aria-pressed', String(!state.preview))
    compare
      .querySelector('[data-polo-action="proposed"]')
      ?.setAttribute('aria-pressed', String(state.preview))
    const concept = get('#polo-concept', HTMLDivElement)
    concept.hidden = !proposed
    concept.replaceChildren()
    if (proposed && proposal) {
      concept.append(
        element(
          'span',
          'polo-concept-tag',
          'VISUAL CONCEPT · NO CALCULATED SAVINGS',
        ),
        element('p', '', proposal.tradeoff),
      )
    }
    const metrics = get('#polo-metrics', HTMLDivElement)
    metrics.replaceChildren()
    metrics.hidden = proposed || !state.confirmed
    if (!proposed && state.confirmed)
      for (const metric of phase.metrics.slice(0, 3)) {
        const item = element('div', 'polo-metric')
        item.append(
          element('strong', '', metric.value),
          element('span', '', metric.label),
        )
        item.title = metric.detail
        metrics.append(item)
      }
    const experiment = get('#polo-experiment', HTMLDivElement)
    experiment.replaceChildren()
    if (!state.confirmed) {
      experiment.append(
        element(
          'p',
          'polo-tip',
          'People already use this place. Tap a speech bubble to hear their views.',
        ),
      )
    } else if (proposed && proposal) {
      experiment.append(element('p', 'polo-tip', '↳ ' + proposal.tip))
      if (state.proposal === 'heat_reuse_neighbors') {
        const demand = button(
          state.recipientAvailable
            ? '♨ Pool needs heat'
            : '◌ Pool needs no heat',
          'recipient',
          'polo-experiment-button',
        )
        demand.setAttribute('aria-pressed', String(state.recipientAvailable))
        experiment.append(demand)
      }
      if (state.proposal === 'green_roof') {
        const rain = button(
          state.rain ? '☂ Stop rain' : '☂ Try rain',
          'rain',
          'polo-experiment-button',
        )
        rain.setAttribute('aria-pressed', String(state.rain))
        experiment.append(rain)
      }
    } else {
      experiment.append(element('p', 'polo-tip', phase.tradeoff))
      if (state.phase !== 'M1') {
        const rain = button(
          state.rain ? '☂ Stop rain' : '☂ Replay the same rain',
          'rain',
          'polo-rain-button',
        )
        rain.setAttribute('aria-pressed', String(state.rain))
        experiment.append(rain)
      }
    }
    const detail = get('#polo-detail-copy', HTMLDivElement)
    detail.replaceChildren()
    if (!state.confirmed) {
      detail.append(
        element(
          'p',
          '',
          'This is a schematic campus on a real place, not a surveyed development parcel or approval to build. The walkthrough follows an authored field scenario even if you move the model elsewhere.',
        ),
      )
    } else if (proposed) {
      detail.append(
        element(
          'p',
          '',
          'An illustrative proposal, not an engineered design. The model pool, connection and equipment are fictional. Flow animations explain mechanisms; they do not show measured volumes or temperatures.',
        ),
      )
    } else {
      for (const text of phase.details) detail.append(element('p', '', text))
      for (const metric of phase.metrics)
        detail.append(
          element(
            'p',
            '',
            metric.label + ' · ' + metric.value + ': ' + metric.detail,
          ),
        )
    }
    get('#polo-details', HTMLDetailsElement).open = false
    const previous = root.querySelector<HTMLButtonElement>(
      '[data-polo-action="back"]',
    )
    if (previous) {
      previous.disabled = state.phase === 'M0'
      previous.hidden = !state.confirmed || state.phase === 'M0'
    }
    const editLocation = root.querySelector<HTMLButtonElement>(
      '[data-polo-action="edit-location"]',
    )
    if (editLocation) editLocation.hidden = !state.confirmed
    get('#polo-next', HTMLButtonElement).textContent = !state.confirmed
      ? 'Confirm location →'
      : inOperation
        ? 'Back to today ↺'
        : 'Continue →'
    for (const item of root.querySelectorAll<HTMLButtonElement>(
      '[data-phase]',
    )) {
      const selected = item.dataset['phase'] === state.phase
      item.disabled = !state.confirmed
      item.setAttribute('aria-current', selected ? 'step' : 'false')
      const phaseId = POLO_PHASES.find(
        (phase) => phase === item.dataset['phase'],
      )
      item.classList.toggle(
        'is-complete',
        phaseId !== undefined &&
          POLO_PHASES.indexOf(phaseId) < POLO_PHASES.indexOf(state.phase),
      )
    }
    get('#polo-scene-label', HTMLSpanElement).textContent = !state.confirmed
      ? 'CHOOSE A SPOT · SCHEMATIC FOOTPRINT'
      : proposed
        ? 'ILLUSTRATIVE CONNECTION · VISUAL CONCEPT'
        : 'REAL PLACE · FICTIONAL PROJECT'
    renderMotion()
  }

  const timeline = get('.polo-timeline', HTMLElement)
  for (const [index, id] of POLO_PHASES.entries()) {
    const stop = button('', 'phase', 'polo-stop')
    stop.dataset['phase'] = id
    stop.setAttribute('aria-label', PHASE_LABELS[id] + ' milestone')
    stop.append(
      element('span', 'polo-stop-dot', String(index + 1)),
      element('span', '', PHASE_LABELS[id]),
    )
    timeline.append(stop)
  }
  const people = [
    { id: 'neighbor', icon: '⚽', label: 'Park regular' },
    { id: 'nature', icon: '🌱', label: 'Soil volunteer' },
    { id: 'student', icon: '🎒', label: 'Young player' },
    { id: 'operator', icon: '⚡', label: 'Data-center designer' },
  ] as const
  const peopleControls = get('.polo-people', HTMLElement)
  peopleControls.append(element('span', 'polo-people-label', 'Talk'))
  for (const person of people) {
    const chat = button(person.icon, 'person', 'polo-person')
    chat.dataset['person'] = person.id
    chat.setAttribute('aria-label', 'Talk privately to ' + person.label)
    chat.title = 'Talk to ' + person.label
    peopleControls.append(chat)
  }
  render()

  function openEvidence(): void {
    const content = get('#polo-evidence-copy', HTMLDivElement)
    content.replaceChildren()
    content.append(
      element(
        'p',
        '',
        'This fictional project occupies a schematic portion of Polo Fields. It is not an announced development. The footprint and connections are illustrative, not surveyed routes. Existing tracks and surrounding trees are outside the authored intervention.',
      ),
    )
    if (!state.confirmed) {
      content.append(
        element('h3', '', 'First, choose a location'),
        element(
          'p',
          '',
          'Place the schematic campus on the playing field for this demo. You can move and rotate it throughout the story. Confirming starts the research walkthrough; it does not approve a real project or recalculate a new site assessment.',
        ),
      )
    } else if (state.phase === 'M6' && state.preview) {
      content.append(
        element('h3', '', 'These three proposals are visual concepts'),
        element(
          'p',
          '',
          'Heat reuse, recycled water and a green roof show possible mechanisms and trade-offs. None displays calculated savings. A connected model pool is fictional; no real building or water connection is asserted.',
        ),
      )
    } else {
      content.append(element('h3', '', 'Baseline research assumptions'))
      const list = element('ul', '')
      for (const text of POLO_BASELINE.assumptions)
        list.append(element('li', '', text))
      content.append(list)
    }
    content.append(element('h3', '', 'Research and sources'))
    const links = element('ul', 'polo-source-list')
    for (const source of POLO_BASELINE.sources) {
      const item = element('li', ''),
        link = element('a', '', source.title)
      link.href = source.url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      item.append(link)
      links.append(item)
    }
    content.append(links)
    get('#polo-evidence', HTMLDialogElement).showModal()
  }
  const evidence = get('#polo-evidence', HTMLDialogElement)
  evidence.addEventListener('click', (event) => {
    if (event.target !== evidence) return
    const box = evidence.getBoundingClientRect()
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      evidence.close()
  })
  async function connect(): Promise<void> {
    if (!scene || connecting || disposed) return
    if (online) {
      scene.setLocal()
      return
    }
    const configured: unknown = import.meta.env['VITE_CESIUM_ION_TOKEN']
    let token = typeof configured === 'string' ? configured.trim() : ''
    try {
      token = sessionStorage.getItem('landshift.cesium.token') || token
    } catch {
      /* Local mode remains available when browser storage is disabled. */
    }
    if (!token) {
      message(
        'Local aerial is ready. Add the Cesium token locally to enable photorealistic 3D.',
      )
      return
    }
    try {
      await scene.connectPhotorealistic(token)
    } catch {
      message(
        'The 3D city could not connect. Keep exploring with the local map.',
      )
    }
  }
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const control =
      event.target.closest<HTMLButtonElement>('[data-polo-action]')
    if (!control || control.disabled) return
    const index = POLO_PHASES.indexOf(state.phase)
    switch (control.dataset['poloAction']) {
      case 'person': {
        const person = people.find(
          (item) => item.id === control.dataset['person'],
        )
        if (person) community?.open(person.id)
        break
      }
      case 'phase': {
        const id = POLO_PHASES.find(
          (phase) => phase === control.dataset['phase'],
        )
        if (id) setPhase(id)
        break
      }
      case 'back':
        setPhase(POLO_PHASES[Math.max(0, index - 1)] ?? 'M0')
        break
      case 'next':
        if (!state.confirmed) {
          scene?.cancelPlacementDrag()
          if (poloPlacementValid(state.center)) {
            setState(confirmPoloPlacement(state))
            scene?.focus('site')
          }
        } else setPhase(POLO_PHASES[index + 1] ?? 'M0')
        break
      case 'reset':
        scene?.cancelPlacementDrag()
        setState({
          ...INITIAL_POLO_STATE,
          center: [...INITIAL_POLO_STATE.center],
        })
        scene?.focus('site')
        break
      case 'edit-location':
        scene?.focus('site')
        message('Drag the campus to move it. Use ← / → to rotate.')
        break
      case 'nudge-west':
        moveLocation(nudgePoloPlacement(state.center, -5, 0))
        break
      case 'nudge-east':
        moveLocation(nudgePoloPlacement(state.center, 5, 0))
        break
      case 'nudge-north':
        moveLocation(nudgePoloPlacement(state.center, 0, 5))
        break
      case 'nudge-south':
        moveLocation(nudgePoloPlacement(state.center, 0, -5))
        break
      case 'rotate-left':
        rotateLocation(state.bearing - 5)
        break
      case 'rotate-right':
        rotateLocation(state.bearing + 5)
        break
      case 'proposal': {
        if (!state.confirmed || state.phase !== 'M6') return
        const id = POLO_PROPOSALS.find(
          (proposal) => proposal === control.dataset['proposal'],
        )
        if (id) {
          setState({
            ...state,
            proposal: id,
            preview: true,
            recipientAvailable: true,
            rain: false,
          })
          scene?.focus(id === 'green_roof' ? 'site' : 'connection')
        }
        break
      }
      case 'baseline':
        if (!state.confirmed || state.phase !== 'M6') return
        setState({ ...state, preview: false, rain: false })
        break
      case 'proposed':
        if (!state.confirmed || state.phase !== 'M6') return
        setState({ ...state, preview: true, rain: false })
        break
      case 'recipient':
        if (!state.confirmed || state.phase !== 'M6') return
        setState({ ...state, recipientAvailable: !state.recipientAvailable })
        break
      case 'rain':
        if (!state.confirmed) return
        setState({ ...state, rain: !state.rain })
        break
      case 'replay':
        if (!state.confirmed) return
        scene?.replay()
        break
      case 'skip':
        if (!state.confirmed) return
        scene?.skip()
        break
      case 'site':
      case 'connection':
      case 'park':
        scene?.focus(control.dataset['poloAction'])
        break
      case 'zoom-in':
        scene?.zoom(true)
        break
      case 'zoom-out':
        scene?.zoom(false)
        break
      case 'map-style':
        void connect()
        break
      case 'evidence':
        openEvidence()
        break
      case 'close-evidence':
        evidence.close()
        break
      case undefined:
      default:
        break
    }
  })

  window.addEventListener(
    'pagehide',
    () => {
      disposed = true
      clearTimeout(toastTimer)
      clearTimeout(placementSyncTimer)
      community?.destroy()
      scene?.destroy()
    },
    { once: true },
  )
  try {
    const pack = await loadDataPack('golden-gate-park')
    const grid = await loadElevationGrid(pack.baseUrl)
    if (isDisposed()) return
    scene = new PoloScene(pack, grid, {
      message,
      transitionChanged: (status) => {
        if (disposed) return
        motion = status
        renderMotion()
      },
      onlineChanged: (status) => {
        if (disposed) return
        online = status === 'online'
        connecting = status === 'connecting'
        const style = get('#polo-map-style', HTMLButtonElement)
        style.disabled = connecting
        style.textContent = connecting
          ? 'Connecting…'
          : online
            ? 'Local aerial'
            : '3D city'
        style.setAttribute(
          'aria-label',
          online
            ? 'Switch to local aerial map'
            : 'Connect photorealistic 3D city',
        )
      },
      communityRequested: (id) => {
        community?.open(id)
      },
      positionRequested: (center) => moveLocation(center),
      rotationRequested: (bearing: number) => rotateLocation(bearing),
    })
    community = new PoloCommunity({
      getState: () => ({ ...state, center: [...state.center] }),
      focus: () => {
        scene?.focus('site')
      },
      beforeOpen: () => {
        scene?.cancelPlacementDrag()
        evidence.close()
      },
    })
    community.sync()
    scene.setState({ ...state })
    get('#polo-loading', HTMLDivElement).hidden = true
    const configured: unknown = import.meta.env['VITE_CESIUM_ION_TOKEN']
    let hasToken = typeof configured === 'string' && Boolean(configured.trim())
    try {
      hasToken ||= Boolean(sessionStorage.getItem('landshift.cesium.token'))
    } catch {
      /* Photorealistic connection is optional. */
    }
    if (hasToken) void connect()
  } catch (error) {
    const loading = get('#polo-loading', HTMLDivElement)
    loading.replaceChildren(
      element('span', '', '◉'),
      element('h2', '', 'The map needs its local data.'),
      element(
        'p',
        '',
        error instanceof Error
          ? error.message
          : 'The prepared map could not open.',
      ),
    )
    const back = element('a', 'polo-recovery-link', 'Open Heroes’ Grove ↗')
    back.href = './game.html?scenario=golden-gate-park'
    loading.append(back)
  }
}
