import './intervention-ui.css'
import {
  nextPoloIntervention,
  paintPoloIntervention,
  POLO_INTERVENTIONS,
} from './interventions.ts'
import type {
  Intervention,
  InterventionDecisions,
  InterventionId,
} from './interventions.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'
import type { PoloScene } from './scene.ts'

interface Moment {
  item: Intervention
  mode: 'offer' | 'paint' | 'result'
  cells: number[]
}
interface Motion {
  progress: number
  phase: PoloPhase
}
const make = (tag: string, text = '', className = ''): HTMLElement => {
  const node = document.createElement(tag)
  node.textContent = text
  node.className = className
  return node
}

/** Optional decisions with a paused construction clock; no timed input or score penalty. */
export function setupPoloInterventions(
  root: HTMLElement,
  getScene: () => PoloScene | undefined,
  apply: (id: InterventionId) => void,
): {
  observe(state: PoloSceneState, motion: Motion): void
  pending(): boolean
  refresh(): void
  reset(): void
  replay(phase: PoloPhase): void
  destroy(): void
} {
  const studio = root.querySelector('.polo-studio') ?? root
  const map = root.querySelector('#map')
  if (!(map instanceof HTMLElement))
    throw new Error('Interventions need the map')
  const panel = make('aside', '', 'polo-intervention-panel')
  panel.setAttribute('aria-label', 'Optional construction intervention')
  panel.hidden = true
  const targets = make('div', '', 'polo-intervention-targets')
  targets.hidden = true
  targets.setAttribute('role', 'group')
  targets.setAttribute('aria-label', 'Paint sections on the map')
  studio.append(panel)
  map.append(targets)
  let active: Moment | undefined
  let decisions: InterventionDecisions = {}
  let drawing: number | undefined
  let previous: readonly [number, number] | undefined
  let animation = 0
  let destroyed = false
  const isPainting = (): boolean => active?.mode === 'paint'

  function release(): void {
    const pointer = drawing
    drawing = undefined
    previous = undefined
    if (pointer !== undefined && targets.hasPointerCapture(pointer))
      targets.releasePointerCapture(pointer)
  }
  function refresh(): void {
    if (active) root.dataset['poloIntervention'] = active.mode
    else delete root.dataset['poloIntervention']
    for (const control of root.querySelectorAll<HTMLButtonElement>(
      '.polo-timeline button, #polo-next, [data-polo-action="back"], [data-polo-action="replay"], [data-polo-action="skip"]',
    ))
      control.disabled =
        Boolean(active) || root.dataset['poloProtestPending'] === 'true'
  }
  function dismiss(): void {
    release()
    active = undefined
    panel.hidden = true
    targets.replaceChildren()
    targets.hidden = true
    getScene()?.paintIntervention(null)
    getScene()?.setInterventionInput(false)
    refresh()
  }
  function resume(skipped = false): void {
    if (!active) return
    if (skipped) decisions[active.item.id] = 'skipped'
    dismiss()
    getScene()?.resumeConstruction()
  }
  function paint(index: number): void {
    if (!active || active.mode !== 'paint' || active.cells.includes(index))
      return
    active.cells = paintPoloIntervention(active.item, active.cells, index)
    getScene()?.paintIntervention({ id: active.item.id, cells: active.cells })
    for (const [i, button] of [...targets.children].entries()) {
      const filled = active.cells.includes(i)
      button.classList.toggle('is-painted', filled)
      button.setAttribute('aria-pressed', String(filled))
      button.textContent = filled ? '✓' : String(i + 1)
    }
    const progress = panel.querySelector('output')
    if (progress)
      progress.textContent = `${String(active.cells.length)} / ${String(active.item.cells.length)} sections`
    if (active.cells.length !== active.item.cells.length) return
    const item = active.item
    decisions[item.id] = 'done'
    active.mode = 'result'
    release()
    getScene()?.setInterventionInput(false)
    apply(item.id)
    getScene()?.paintIntervention(null)
    render()
  }
  function render(): void {
    panel.replaceChildren()
    targets.replaceChildren()
    refresh()
    if (!active) {
      panel.hidden = true
      return
    }
    const { item, mode } = active
    targets.hidden = mode !== 'paint'
    panel.hidden = false
    panel.append(
      make(
        'span',
        mode === 'result'
          ? 'YOU CHANGED THE PLAN'
          : 'CONSTRUCTION PAUSED · OPTIONAL',
        'polo-intervention-kicker',
      ),
      make('h2', item.title),
    )
    const copy = make(
      'p',
      mode === 'offer'
        ? item.problem
        : mode === 'paint'
          ? item.instruction
          : item.benefit,
    )
    copy.setAttribute('role', 'status')
    panel.append(copy)
    const actions = make('div', '', 'polo-intervention-actions')
    const action = (
      text: string,
      callback: () => void,
      primary = false,
    ): void => {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = text
      button.className = primary ? 'is-primary' : ''
      button.addEventListener('click', callback)
      actions.append(button)
    }
    if (mode === 'offer') {
      panel.append(
        make('small', `Improves: ${item.benefit}`),
        make('small', `Trade-off: ${item.tradeoff}`),
      )
      action(
        'Try improving it',
        () => {
          if (!active) return
          active.mode = 'paint'
          getScene()?.setInterventionInput(true)
          render()
        },
        true,
      )
      action('Continue as planned', () => {
        resume(true)
      })
    } else if (mode === 'paint') {
      const progress = document.createElement('output')
      progress.textContent = `0 / ${String(item.cells.length)} sections`
      panel.append(
        progress,
        make(
          'small',
          'Drag across dots, or tap each one. Keyboard: Tab + Enter.',
        ),
      )
      for (const [index] of item.cells.entries()) {
        const dot = document.createElement('button')
        dot.type = 'button'
        dot.className = 'polo-paint-dot'
        dot.textContent = String(index + 1)
        dot.dataset['cell'] = String(index)
        dot.setAttribute(
          'aria-label',
          `${item.title}: section ${String(index + 1)}`,
        )
        dot.setAttribute('aria-pressed', 'false')
        dot.addEventListener('click', () => {
          paint(index)
        })
        targets.append(dot)
      }
      action('Continue as planned', () => {
        resume(true)
      })
    } else {
      panel.append(
        make('small', `Trade-off: ${item.tradeoff}`),
        make('blockquote', item.reaction),
        make('small', item.speaker),
      )
      action(
        'Resume construction →',
        () => {
          resume()
        },
        true,
      )
    }
    panel.append(actions)
    // Focus only when changing modes, never on animation frames or paint strokes.
    const focusGroup = mode === 'paint' ? targets : actions
    focusGroup
      .querySelector<HTMLButtonElement>('button')
      ?.focus({ preventScroll: true })
  }
  const onDown = (event: PointerEvent): void => {
    if (
      !active ||
      active.mode !== 'paint' ||
      event.button !== 0 ||
      !event.isPrimary ||
      !(event.target instanceof Element)
    )
      return
    const dot = event.target.closest<HTMLElement>('[data-cell]')
    if (!dot) return
    event.preventDefault()
    event.stopPropagation()
    drawing = event.pointerId
    previous = [event.clientX, event.clientY]
    targets.setPointerCapture(event.pointerId)
    paint(Number(dot.dataset['cell']))
  }
  const onMove = (event: PointerEvent): void => {
    if (event.pointerId !== drawing || !previous || active?.mode !== 'paint')
      return
    event.preventDefault()
    const [ax, ay] = previous,
      bx = event.clientX,
      by = event.clientY
    previous = [bx, by]
    for (const dot of [...targets.children]) {
      const rect = dot.getBoundingClientRect()
      const x = rect.left + rect.width / 2,
        y = rect.top + rect.height / 2
      const length = (bx - ax) ** 2 + (by - ay) ** 2
      const t = length
        ? Math.max(
            0,
            Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / length),
          )
        : 0
      if (
        dot instanceof HTMLElement &&
        Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)) <= 25
      )
        paint(Number(dot.dataset['cell']))
      if (!isPainting()) break
    }
  }
  targets.addEventListener('pointerdown', onDown)
  targets.addEventListener('pointermove', onMove)
  targets.addEventListener('pointerup', release)
  targets.addEventListener('pointercancel', release)
  targets.addEventListener('lostpointercapture', release)
  const tick = (): void => {
    if (destroyed) return
    if (active?.mode === 'paint') {
      for (const [index, target] of [...targets.children].entries()) {
        const cell = active.item.cells[index]
        const point =
          cell &&
          getScene()?.projectInterventionPoint(
            cell[0],
            cell[1],
            active.item.id === 'foundation' ? 4 : 3,
          )
        if (!(target instanceof HTMLElement)) continue
        const dot = target
        dot.hidden = !point
        if (point) {
          dot.style.left = `${String(point.x)}px`
          dot.style.top = `${String(point.y)}px`
        }
      }
    }
    animation = requestAnimationFrame(tick)
  }
  animation = requestAnimationFrame(tick)
  return {
    observe(state, motion): void {
      if (destroyed) return
      if (active && (!state.confirmed || state.phase !== active.item.phase))
        dismiss()
      if (active || motion.phase !== state.phase) return
      const item = nextPoloIntervention(state, motion.progress, decisions)
      if (!item) return
      active = { item, mode: 'offer', cells: [] }
      getScene()?.pauseConstructionAt(item.at)
      getScene()?.setEnvironmentalLayer(null)
      getScene()?.focus('site')
      render()
    },
    pending: () => Boolean(active),
    refresh,
    reset(): void {
      decisions = {}
      dismiss()
    },
    replay(phase): void {
      const retained: InterventionDecisions = {}
      for (const item of POLO_INTERVENTIONS) {
        const decision = decisions[item.id]
        if (decision && !(item.phase === phase && decision === 'skipped'))
          retained[item.id] = decision
      }
      decisions = retained
      // The phase clock decides when eligible moments appear again.
    },
    destroy(): void {
      destroyed = true
      cancelAnimationFrame(animation)
      dismiss()
      panel.remove()
      targets.remove()
    },
  }
}
