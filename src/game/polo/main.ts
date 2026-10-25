import emblemUrl from '../../../design/un-emblem-white.svg'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import '../../../design/shared.css'
import '../style.css'
import './style.css'
import './motion-overlay.css'
import './private-chat.css'
import './more-menu.css'
import { loadDataPack } from '../data.ts'
import { loadElevationGrid } from '../terrain.ts'
import type { LngLat } from '../geometry.ts'
import { PoloScene } from './scene.ts'
import { PoloCommunity } from './community.ts'
import { POLO_BASELINE } from './baseline.ts'
import { renderPoloCopySteps } from './copy-steps.ts'
import type { PoloCopyEntry } from './copy-steps.ts'
import { setupPoloEducation } from './education-ui.ts'
import { setupPoloProjectIntro } from './project-setup.ts'
import { setupPoloMapShortcuts } from './map-shortcuts.ts'
import { setupPoloLearning } from './learning-ui.ts'
import { activePoloLearnings } from './learnings.ts'
import { activePoloImprovements } from './interventions.ts'
import { POLO_TALK_PEOPLE, setupPoloTalkPicker } from './talk-picker.ts'
import {
  lockPoloForProtest,
  poloExploreAfterProtest,
  setupPoloProtest,
} from './protest.ts'
import { poloDisplayPhase } from './display.ts'
import { poloPlanningText } from './planning-copy.ts'
import { usAcres, usFeet } from './us-units.ts'
import {
  INITIAL_POLO_STATE,
  POLO_PHASES,
  POLO_PROPOSALS,
  POLO_PROPOSAL_NAMES,
} from './model.ts'
import type { PoloPhase, PoloProposal, PoloSceneState } from './model.ts'
import {
  movePoloCampus,
  nudgePoloPlacement,
  poloPhaseAt,
  poloPlacementValid,
} from './placement.ts'
import '../system-chrome.css'

document.documentElement.classList.add('ls-system-dark')

const PHASE_LABELS: Record<PoloPhase, string> = {
  M0: 'Today',
  M1: 'Foundations',
  M4: 'Structure',
  M5: 'Commissioning',
  M6: 'Operating',
}
const PHASE_COPY: Record<PoloPhase, { summary: string; tradeoff: string }> = {
  M0: {
    summary: 'A shared field. A place to play and meet.',
    tradeoff: 'Its water sources and energy use need checking.',
  },
  M1: {
    summary: 'Shape the ground. Then pour the foundations.',
    tradeoff: 'The field changes before the building rises.',
  },
  M4: {
    summary: 'Raise the steel. Add the roof.',
    tradeoff: 'On-site water and concrete water are counted separately.',
  },
  M5: {
    summary: 'Fit equipment. Finish the grounds. Test the systems.',
    tradeoff: 'A rain tank helps with one storm. Utility capacity is unknown.',
  },
  M6: {
    summary: 'Follow the power and water. Try a different approach.',
    tradeoff: 'Some cooling water evaporates. Some becomes wastewater.',
  },
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
      'Follow server heat through two pipes to a proposed neighborhood pool.',
    tradeoff: 'Heat needs a recipient and equipment. Backup cooling stays.',
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
    throw new Error('Missing Polo control: ' + selector)
  return found
}

/** A separate research-led walkthrough; the Heroes’ Grove sandbox keeps its own rules. */
export async function startPoloDemo(): Promise<void> {
  const root = get('#game', HTMLDivElement)
  root.dataset['poloSetup'] = 'intro'
  root.innerHTML = `
    <main class="studio polo-studio">
      <div id="map" aria-label="Interactive 3D map of the Polo Fields"></div>
      <header class="polo-topbar">
        <a class="polo-brand" href="./" aria-label="Landshift onboarding"><img class="polo-brand-emblem" src="${emblemUrl}" alt="" /> <strong>landshift.</strong></a>
      <nav class="polo-camera" aria-label="Map views">
        <button type="button" data-polo-action="site">Your site</button>
        <button type="button" data-polo-action="access">Access route</button>
        <button type="button" data-polo-action="connection">Follow the idea</button>
        <button type="button" data-polo-action="park">Whole park</button>
        <button type="button" data-polo-action="quick-today" title="Temporary testing shortcut">Today ↗</button>
        <span></span>
        <button type="button" data-polo-action="zoom-in" aria-label="Zoom in">＋</button>
        <button type="button" data-polo-action="zoom-out" aria-label="Zoom out">−</button>
        <span id="polo-rotation-divider"></span>
        <div class="polo-rotation" role="group" aria-label="Rotate the campus"><button type="button" data-polo-action="rotate-left" aria-label="Rotate campus left 5 degrees" title="Rotate campus left">↶</button><output id="polo-bearing" aria-label="Campus bearing">0°</output><button type="button" data-polo-action="rotate-right" aria-label="Rotate campus right 5 degrees" title="Rotate campus right">↷</button></div>
      </nav>
        <nav class="top-actions" aria-label="Project actions">
          <button type="button" data-polo-action="menu" class="polo-more-toggle" aria-expanded="false" aria-controls="polo-more">More</button>
          <div class="polo-more" id="polo-more">
          <button type="button" data-polo-action="evidence" class="polo-small-button" aria-label="Open sources and assumptions">ⓘ<span class="polo-menu-label"> Sources</span></button>
          <button type="button" data-polo-action="reset" class="polo-small-button" aria-label="Restart from campus placement" title="Restart from campus placement">↺<span class="polo-menu-label"> Reset</span></button>
          </div>
        </nav>
      </header>

      <nav class="polo-people" aria-label="Private community chats"></nav>
      <section class="polo-deck" aria-label="Polo Fields story and proposals">
        <div class="polo-guide"><img src="/avatars/maya.png" alt="" width="56" height="56"><div><strong>Your place. Your perspective.</strong><span>Explore one change at a time.</span></div></div>
        <div class="polo-deck-head"><span id="polo-kicker"></span><button type="button" data-polo-action="replay" class="polo-replay">↻ Replay</button></div>
        <h1 id="polo-title" tabindex="-1"></h1>
        <p class="polo-summary" id="polo-summary"></p>
        <div class="polo-motion" id="polo-motion" hidden><div class="polo-motion-heading"><span id="polo-motion-caption" role="status"></span><button type="button" data-polo-action="skip">Skip ↗</button></div><div class="polo-motion-track" id="polo-motion-track" role="progressbar" aria-label="Construction progress" aria-valuemin="0" aria-valuemax="100"><span id="polo-motion-fill"></span></div><small>Construction sequence</small></div>
        <div class="polo-placement" id="polo-placement" role="group" aria-label="Adjust the campus location">
          <p>Put it on the field, then confirm to lock the location.</p>
          <div class="polo-nudges"><button type="button" data-polo-action="nudge-west" aria-label="Move campus west ${usFeet(5)}">←</button><button type="button" data-polo-action="nudge-north" aria-label="Move campus north ${usFeet(5)}">↑</button><span>Nudge</span><button type="button" data-polo-action="nudge-south" aria-label="Move campus south ${usFeet(5)}">↓</button><button type="button" data-polo-action="nudge-east" aria-label="Move campus east ${usFeet(5)}">→</button></div>
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
        <button type="button" data-polo-action="learning" class="polo-next polo-learning-launcher" id="polo-learning-open" hidden>Use what you learned →</button>
        <div class="polo-deck-bottom"><button type="button" data-polo-action="back" class="polo-back">← Back</button><button type="button" data-polo-action="next" class="polo-next" id="polo-next">Continue →</button></div>
      </section>
      <nav class="polo-timeline" aria-label="Story milestones"></nav>
      <div class="polo-toast" id="polo-toast" role="status" hidden></div>
      <div class="polo-loading" id="polo-loading"><span>◉</span><h2>Your city. Your choices.</h2><p>Opening San Francisco…</p></div>
      <dialog class="polo-evidence" id="polo-evidence" aria-labelledby="polo-evidence-title"><button type="button" data-polo-action="close-evidence" class="polo-dialog-close" aria-label="Close sources">×</button><span class="polo-eyebrow">BEHIND THIS STORY</span><h2 id="polo-evidence-title">Real place. Clear assumptions.</h2><div id="polo-evidence-copy"></div></dialog>
      <div id="cesium-credits"></div>
    </main>
  `
  let state: PoloSceneState = {
    ...INITIAL_POLO_STATE,
    center: [...INITIAL_POLO_STATE.center],
  }
  let scene: PoloScene | undefined
  const learning = setupPoloLearning(
    root,
    () => state,
    (next) => {
      scene?.setEnvironmentalLayer(null)
      setState(next)
      scene?.skip()
    },
    () => scene?.focus('comparison'),
  )
  const intro = setupPoloProjectIntro(
    root,
    (areaHa, arrived) => {
      setState({ ...state, areaHa })
      scene?.flyToPlacement(arrived)
    },
    (areaHa) => {
      quickViewToday(areaHa)
    },
  )
  const shortcuts = setupPoloMapShortcuts(
    root,
    (inward) => {
      scene?.zoom(inward)
    },
    (horizontal, vertical) => {
      scene?.pan(horizontal, vertical)
    },
  )
  const education = setupPoloEducation(
    root,
    () => state,
    (topic) => {
      scene?.setEnvironmentalLayer(topic)
    },
  )
  // Keep animation controls on the map so playback never changes card height.
  get('.polo-studio', HTMLElement).append(get('#polo-motion', HTMLDivElement))
  const protest = setupPoloProtest(root, (progress) => {
    if (disposed || !state.confirmed || state.phase !== 'M0') return
    scene?.setProtestActive(false)
    setState(poloExploreAfterProtest(state, progress))
    scene?.focus('site')
    get('.polo-deck', HTMLElement).classList.add('is-revealing')
    get('#polo-title', HTMLHeadingElement).focus({ preventScroll: true })
  })
  let community: PoloCommunity | undefined
  const talkPicker = setupPoloTalkPicker(
    root,
    get('.polo-people', HTMLElement),
    () => state,
    (id) => community?.open(id),
  )
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
    get('#polo-learning-open', HTMLButtonElement).disabled =
      active && state.phase === 'M6'
    for (const stop of root.querySelectorAll<HTMLButtonElement>('[data-phase]'))
      stop.classList.toggle(
        'is-playing',
        active && stop.dataset['phase'] === state.phase,
      )
  }

  function message(text: string): void {
    if (disposed) return
    const toast = get('#polo-toast', HTMLDivElement)
    renderPoloCopySteps(toast, [{ text }], 'Notice steps')
    toast.hidden = false
    clearTimeout(toastTimer)
    if (text.length <= 70)
      toastTimer = setTimeout(() => {
        toast.hidden = true
      }, 4300)
    else {
      const close = element('button', 'polo-notice-close', 'Dismiss')
      close.type = 'button'
      close.addEventListener('click', () => {
        toast.hidden = true
      })
      toast.append(close)
    }
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
    if (state.confirmed || !poloPlacementValid(center)) return false
    setState(movePoloCampus(state, center), false)
    scheduleCommunitySync()
    return true
  }
  function rotateLocation(value: number): boolean {
    if (state.confirmed || !Number.isFinite(value)) return false
    setState(movePoloCampus(state, state.center, value), false)
    scheduleCommunitySync()
    return true
  }
  function confirmLocation(): void {
    if (
      root.dataset['poloSetup'] !== 'placement' ||
      state.confirmed ||
      !poloPlacementValid(state.center)
    )
      return
    scene?.cancelPlacementDrag()
    scene?.setEnvironmentalLayer(null)
    protest.begin()
    setState(lockPoloForProtest(state))
    scene?.setProtestActive(true)
    scene?.focusProtest()
  }
  // Temporary shortcuts keep repeated Today testing one click away.
  function quickViewToday(areaHa = state.areaHa): void {
    if (disposed || !scene) return
    intro.dismiss()
    protest.reset()
    scene.setProtestActive(false)
    scene.cancelPlacementDrag()
    scene.setEnvironmentalLayer(null)
    if (get('.polo-studio', HTMLElement).classList.contains('community-open'))
      root.querySelector<HTMLButtonElement>('.community-launch')?.click()
    for (const dialog of root.querySelectorAll<HTMLDialogElement>(
      'dialog[open]',
    ))
      dialog.close()
    clearTimeout(toastTimer)
    get('#polo-toast', HTMLDivElement).hidden = true
    get('.polo-deck', HTMLElement).classList.remove('is-revealing')
    setState({
      ...INITIAL_POLO_STATE,
      areaHa,
      center: [...state.center],
      bearing: state.bearing,
      confirmed: true,
      phase: 'M0',
    })
    education.resetToday()
    scene.skip()
    scene.flyToPlacement(() => {
      get('#polo-title', HTMLHeadingElement).focus({ preventScroll: true })
    }, 0)
  }
  function setPhase(phase: PoloPhase): void {
    if (!state.confirmed || protest.pending()) return
    const previous = POLO_PHASES.indexOf(state.phase)
    const next = POLO_PHASES.indexOf(phase)
    setState(poloPhaseAt(state, phase))
    if (phase === 'M1') scene?.focusFoundations()
    if (next < previous)
      message('Earlier snapshot · compare how the place changed.')
    else if (next > previous + 1)
      message('Jumped ahead. Replay shows this step being done.')
    if (phase === 'M6') scene?.focus('site')
  }
  function renderPeople(): void {
    get('.polo-people', HTMLElement).hidden = !state.confirmed
    talkPicker.sync()
  }
  function render(): void {
    const phase = poloDisplayPhase(state)
    const inOperation = state.confirmed && state.phase === 'M6'
    const proposed = inOperation && state.proposal !== null && state.preview
    const revised = activePoloLearnings(state)
    const improved = activePoloImprovements(state).length > 0
    const proposal = state.proposal ? PROPOSAL_COPY[state.proposal] : undefined
    root.dataset['poloPhase'] = state.phase
    root.dataset['poloConfirmed'] = String(state.confirmed)
    root.dataset['poloRevised'] = String(revised.length > 0)
    renderPeople()
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
      : revised.length
        ? 'Your improved plan'
        : proposed && proposal
          ? proposal.hook
          : phase.title
    get('#polo-summary', HTMLParagraphElement).textContent = !state.confirmed
      ? 'Drag to place. Use ← / → to rotate. Then confirm.'
      : proposed && proposal
        ? proposal.explanation
        : PHASE_COPY[state.phase].summary
    get('.polo-deck', HTMLElement).hidden = !state.confirmed
    get('.polo-guide strong', HTMLElement).textContent =
      state.phase === 'M0'
        ? 'Learn more about this place.'
        : state.phase === 'M1'
          ? 'Your proposed impact.'
          : 'Your place. Your perspective.'
    get('.polo-guide span', HTMLSpanElement).textContent =
      `Your site plan · ${usAcres(state.areaHa * 10_000)}`
    get('#polo-placement', HTMLDivElement).hidden = state.confirmed
    get('.polo-rotation', HTMLDivElement).hidden = state.confirmed
    get('#polo-rotation-divider', HTMLSpanElement).hidden = state.confirmed
    get('.polo-timeline', HTMLElement).hidden = !state.confirmed
    const replay = root.querySelector<HTMLButtonElement>(
      '[data-polo-action="replay"]',
    )
    if (replay) replay.hidden = !state.confirmed
    for (const skip of root.querySelectorAll<HTMLButtonElement>(
      '[data-polo-action="skip"]',
    ))
      skip.hidden = !state.confirmed || protest.pending()
    const cases = get('#polo-proposals', HTMLDivElement)
    cases.hidden = true
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
          element('small', '', 'Explore option'),
        )
        choice.append(art, copy, element('span', 'polo-proposal-arrow', '↗'))
        cases.append(choice)
      }
    const compare = get('#polo-compare', HTMLDivElement)
    compare.hidden = true
    const baseline = compare.querySelector<HTMLButtonElement>(
      '[data-polo-action="baseline"]',
    )
    if (baseline) {
      baseline.textContent = improved ? 'Your build' : 'Original plan'
      baseline.setAttribute('aria-pressed', String(!state.preview))
    }
    compare
      .querySelector('[data-polo-action="proposed"]')
      ?.setAttribute('aria-pressed', String(state.preview))
    const concept = get('#polo-concept', HTMLDivElement)
    concept.hidden = !proposed && revised.length === 0
    concept.replaceChildren()
    if (revised.length)
      concept.append(
        element(
          'p',
          '',
          revised.map((item) => item.icon + ' ' + item.title).join(' · '),
        ),
        element(
          'small',
          '',
          'Planned from the start at the same site. Savings need assessment; the playing field is still lost.',
        ),
      )
    if (proposed && proposal) {
      concept.append(
        element(
          'span',
          'polo-concept-tag',
          'DESIGN OPTION · PERFORMANCE TO ASSESS',
        ),
        element('p', '', proposal.tradeoff),
      )
    }
    const metrics = get('#polo-metrics', HTMLDivElement)
    metrics.replaceChildren()
    metrics.hidden =
      proposed || !state.confirmed || improved || revised.length > 0
    if (!proposed && state.confirmed && !improved)
      for (const metric of phase.metrics.slice(0, 3)) {
        const item = element('button', 'polo-metric')
        item.type = 'button'
        const topic = /water|rain|drainage|irrigation/i.test(metric.label)
          ? 'water'
          : /electricity|diesel|demand/i.test(metric.label)
            ? 'electricity'
            : 'land'
        item.setAttribute('aria-label', metric.label + ': explore ' + topic)
        item.addEventListener('click', () => {
          education.open(topic)
        })
        item.append(
          element('strong', '', metric.value),
          element('span', '', metric.label),
        )
        metrics.append(item)
      }
    const experiment = get('#polo-experiment', HTMLDivElement)
    experiment.replaceChildren()
    if (improved)
      experiment.append(
        element(
          'p',
          'polo-tip',
          'Resource estimates need updating for your changes.',
        ),
      )
    if (!state.confirmed) {
      experiment.append(
        element(
          'p',
          'polo-tip',
          'People use this place. Tap a person to hear their view.',
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
      experiment.append(
        element('p', 'polo-tip', PHASE_COPY[state.phase].tradeoff),
      )
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
    const detailEntries: PoloCopyEntry[] = []
    if (!state.confirmed) {
      detailEntries.push({
        text: 'The site boundary and building layout need surveying. Confirming a location selects your plan; it does not grant planning approval.',
      })
    } else if (proposed) {
      detailEntries.push({
        text: 'The proposed pool, connections and equipment need detailed design. Flow paths explain how the systems could work; their volumes and temperatures need assessment.',
      })
      if (state.proposal === 'heat_reuse_neighbors')
        detailEntries.push({
          text: 'Heat needs a recipient, new equipment and extra electricity. Backup cooling stays.',
        })
    } else {
      detailEntries.push(
        { text: phase.summary },
        { text: phase.tradeoff },
        ...phase.details.map((text) => ({ text })),
        ...phase.metrics.map((metric) => ({
          text: metric.label + ' · ' + metric.value + ': ' + metric.detail,
        })),
        {
          text: 'Independent research snapshots. Work budgets cover their whole named stage; they are not extra consumption on replay or separate foundation and structure estimates. Rain is the same 86.4 mm event, not an annual total or a flood forecast.',
        },
      )
      detailEntries.push({
        text: 'Research snapshots below use the original 4 ha reference.',
      })
      for (const snapshot of POLO_BASELINE.researchPhases.slice(0, 6)) {
        const data = snapshot.data
        detailEntries.push({
          text:
            snapshot.title +
            ' · ' +
            (data.workdays === null
              ? 'No selected work duration'
              : String(data.workdays) + ' selected workdays') +
            '; work-stage site water: ' +
            (data.stageWaterSuppliedM3 === null
              ? 'Not established'
              : data.stageWaterSuppliedM3.toLocaleString('en-US') + ' m³') +
            '; diesel: ' +
            (data.selectedDieselL === null
              ? 'Not established'
              : data.selectedDieselL.toLocaleString('en-US') + ' L') +
            '; rain runoff: ' +
            (data.rainRunoffM3 === null
              ? 'Not quantified'
              : data.rainRunoffM3.toLocaleString('en-US', {
                  maximumFractionDigits: 1,
                }) + ' m³') +
            '.',
        })
      }
    }
    renderPoloCopySteps(detail, detailEntries, 'Explanation steps')
    get('#polo-details', HTMLDetailsElement).open = false
    get('#polo-learning-open', HTMLButtonElement).hidden = !inOperation
    get('[data-polo-action="quick-today"]', HTMLButtonElement).hidden =
      state.confirmed
    for (const item of root.querySelectorAll<HTMLButtonElement>(
      '[data-phase]',
    )) {
      const selected = item.dataset['phase'] === state.phase
      item.disabled = !state.confirmed || protest.pending()
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
    get('[data-polo-action="access"]', HTMLButtonElement).hidden =
      !state.confirmed
    renderMotion()
    learning.sync()
    education.sync()
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
  const people = POLO_TALK_PEOPLE
  render()

  function openEvidence(): void {
    const entries: PoloCopyEntry[] = [
      {
        text: 'Evaluate your proposal using the sources below. Boundaries and utility routes need verification. This planning exercise does not represent an actual development application or a community survey.',
      },
    ]
    if (!state.confirmed) {
      entries.push({
        text: 'Place and rotate the campus before confirming. Confirmation locks its location; reset to choose another site. Location changes do not recalculate the site assessment.',
      })
    } else if (state.phase === 'M6' && state.preview) {
      entries.push({
        text: 'Compare heat reuse, recycled water and a green roof. Their benefits need assessment. The proposed pool connection needs a confirmed recipient, route and compatible demand.',
      })
    } else {
      entries.push(
        ...POLO_BASELINE.assumptions.map((text) => ({
          text: poloPlanningText(text),
        })),
      )
    }
    const content = get('#polo-evidence-copy', HTMLDivElement)
    const explanation = element('div', 'polo-evidence-reader')
    renderPoloCopySteps(explanation, entries, 'Evidence steps')
    const sources = element('details', 'polo-source-list')
    sources.append(element('summary', '', 'Research and sources'))
    const sourceReader = element('div', '')
    renderPoloCopySteps(
      sourceReader,
      POLO_BASELINE.sources.map((source) => ({
        text: source.title,
        href: source.url,
      })),
      'Source steps',
    )
    sources.append(sourceReader)
    content.replaceChildren(explanation, sources)
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
      message('Local aerial is ready. Add a Cesium token to enable 3D city.')
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
    const menuToggle = get('.polo-more-toggle', HTMLButtonElement)
    if (!event.target.closest('.polo-more, .polo-more-toggle')) {
      root.dataset['poloMenuOpen'] = 'false'
      menuToggle.setAttribute('aria-expanded', 'false')
    }
    const control =
      event.target.closest<HTMLButtonElement>('[data-polo-action]')
    if (!control || control.disabled) return
    if (control.dataset['poloAction'] === 'menu') {
      const open = menuToggle.getAttribute('aria-expanded') !== 'true'
      menuToggle.setAttribute('aria-expanded', String(open))
      root.dataset['poloMenuOpen'] = String(open)
      return
    }
    root.dataset['poloMenuOpen'] = 'false'
    menuToggle.setAttribute('aria-expanded', 'false')
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
        education.move(-1)
        break
      case 'confirm-location':
        confirmLocation()
        break
      case 'next':
        education.move(1)
        break
      case 'learning':
        learning.open()
        break
      case 'quick-today':
        quickViewToday()
        break
      case 'reset':
        protest.reset()
        scene?.setProtestActive(false)
        get('.polo-deck', HTMLElement).classList.remove('is-revealing')
        scene?.cancelPlacementDrag()
        scene?.setEnvironmentalLayer(null)
        setState({
          ...INITIAL_POLO_STATE,
          center: [...INITIAL_POLO_STATE.center],
        })
        scene?.resetPlacementControls()
        scene?.showCity()
        intro.open()
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
        if (!state.confirmed || protest.pending()) return
        scene?.replay()
        break
      case 'skip':
        if (!state.confirmed || protest.pending()) return
        scene?.skip()
        break
      case 'site':
      case 'access':
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
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.dataset['poloMenuOpen'] === 'true') {
      root.dataset['poloMenuOpen'] = 'false'
      const toggle = get('.polo-more-toggle', HTMLButtonElement)
      toggle.setAttribute('aria-expanded', 'false')
      if (!root.querySelector('dialog[open]')) toggle.focus()
    }
  })

  window.addEventListener(
    'pagehide',
    () => {
      disposed = true
      clearTimeout(toastTimer)
      clearTimeout(placementSyncTimer)
      education.destroy()
      shortcuts.destroy()
      intro.destroy()
      protest.destroy()
      learning.destroy()
      talkPicker.destroy()
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
      },
      communityRequested: (id) => {
        if (protest.pending()) protest.talk()
        else community?.open(id)
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
        talkPicker.dismiss()
      },
      reactionsChanged: (reactions) => {
        talkPicker.setReactions(reactions)
        scene?.setConversationReactions(reactions)
      },
    })
    talkPicker.attachChatFocus()
    community.sync()
    scene.setState({ ...state })
    get('#polo-loading', HTMLDivElement).hidden = true
    intro.open()
    const configured: unknown = import.meta.env['VITE_CESIUM_ION_TOKEN']
    let hasToken = typeof configured === 'string' && Boolean(configured.trim())
    try {
      hasToken ||= Boolean(sessionStorage.getItem('landshift.cesium.token'))
    } catch {
      /* Photorealistic connection is optional. */
    }
    if (hasToken) void connect()
  } catch {
    const loading = get('#polo-loading', HTMLDivElement)
    loading.replaceChildren(
      element('span', '', '◉'),
      element('h2', '', 'The map needs its local data.'),
      element(
        'p',
        '',
        'The prepared map could not open. Please reload and try again.',
      ),
    )
    const back = element('a', 'polo-recovery-link', 'Open Heroes’ Grove ↗')
    back.href = './game.html?scenario=golden-gate-park'
    loading.append(back)
  }
}
