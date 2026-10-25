import './protest.css'
import { insertBeforeMapCredits } from '../map-credits.ts'
import type { PoloSceneState } from './model.ts'
import { confirmPoloPlacement, poloPhaseAt } from './placement.ts'

export const POLO_PROTEST_STEPS = [
  {
    question: 'People are protesting. Why?',
    answer:
      'Players, neighbors and park users would lose this shared public playing field. Efficiency cannot replace it. We oppose this site.',
    next: 'Ask about nature →',
  },
  {
    question: 'What would happen to nature?',
    answer:
      'Construction would remove living turf and disturb the soil. Roof plants cannot replace this ground or its existing uses.',
    next: 'Ask about resources →',
  },
  {
    question: 'What about water and electricity?',
    answer:
      'Cooling and computing still need water and electricity. Real supply and utility capacity would need checking.',
    next: 'Explore →',
  },
] as const

export interface PoloProtestProgress {
  stage: 'idle' | 'gathering' | 'invitation' | 'conversation' | 'finished'
  step: number
  outcome: 'heard' | 'skipped' | null
}
export type PoloProtestEvent =
  | 'confirm'
  | 'crowd-ready'
  | 'talk'
  | 'back'
  | 'next'
  | 'skip'
  | 'reset'
  | 'close'
export const INITIAL_POLO_PROTEST: PoloProtestProgress = {
  stage: 'idle',
  step: 0,
  outcome: null,
}

/** The story cannot advance while people gather or while the player is talking. */
export function poloProtestTransition(
  progress: PoloProtestProgress,
  event: PoloProtestEvent,
): PoloProtestProgress {
  if (event === 'reset') return { ...INITIAL_POLO_PROTEST }
  if (event === 'confirm' && progress.stage === 'idle')
    return { stage: 'gathering', step: 0, outcome: null }
  if (event === 'crowd-ready' && progress.stage === 'gathering')
    return { ...progress, stage: 'invitation' }
  if (event === 'talk' && progress.stage === 'invitation')
    return { ...progress, stage: 'conversation' }
  if (
    event === 'skip' &&
    (progress.stage === 'invitation' || progress.stage === 'conversation')
  )
    return { ...progress, stage: 'finished', outcome: 'skipped' }
  if (event === 'close' && progress.stage === 'conversation')
    return { ...progress, stage: 'invitation' }
  if (progress.stage !== 'conversation') return progress
  if (event === 'back')
    return { ...progress, step: Math.max(0, progress.step - 1) }
  if (event === 'next')
    return progress.step === POLO_PROTEST_STEPS.length - 1
      ? { ...progress, stage: 'finished', outcome: 'heard' }
      : { ...progress, step: progress.step + 1 }
  return progress
}

/** Completion is emitted once, after UI subscribers observe the finished state. */
export class PoloProtestFlow {
  private progress: PoloProtestProgress = { ...INITIAL_POLO_PROTEST }
  private readonly onChange: (progress: PoloProtestProgress) => void
  private readonly onComplete: (progress: PoloProtestProgress) => void
  private destroyed = false

  constructor(
    onChange: (progress: PoloProtestProgress) => void,
    onComplete: (progress: PoloProtestProgress) => void,
  ) {
    this.onChange = onChange
    this.onComplete = onComplete
  }
  dispatch(event: PoloProtestEvent): void {
    if (this.destroyed) return
    const before = this.progress
    this.progress = poloProtestTransition(before, event)
    this.onChange(this.progress)
    if (before.stage !== 'finished' && this.progress.stage === 'finished')
      this.onComplete(this.progress)
  }
  destroy(): void {
    this.destroyed = true
  }
}

/** Lock the chosen footprint without ever sending M1 to the scene early. */
export function lockPoloForProtest(state: PoloSceneState): PoloSceneState {
  if (state.confirmed) throw new Error('This location is already locked.')
  return { ...confirmPoloPlacement(state), phase: 'M0', proposal: null }
}

export function poloExploreAfterProtest(
  state: PoloSceneState,
  progress: PoloProtestProgress,
): PoloSceneState {
  if (
    !state.confirmed ||
    state.phase !== 'M0' ||
    progress.stage !== 'finished' ||
    !progress.outcome
  )
    throw new Error('Hear or skip the protest before exploring Today.')
  return poloPhaseAt(state, 'M0')
}

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text = '',
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  element.className = className
  element.textContent = text
  return element
}
function action(text: string, className = ''): HTMLButtonElement {
  const button = node('button', className, text)
  button.type = 'button'
  return button
}

export function setupPoloProtest(
  root: HTMLElement,
  onComplete: (progress: PoloProtestProgress) => void,
): {
  begin(): void
  talk(): void
  reset(): void
  pending(): boolean
  destroy(): void
} {
  const host = root.querySelector('.polo-studio') ?? root
  const invitation = node('section', 'polo-protest-invitation')
  invitation.hidden = true
  invitation.setAttribute('aria-labelledby', 'polo-protest-invitation-title')
  const identity = (): HTMLElement => {
    const header = node('div', 'polo-protest-person')
    const portrait = node('img', '')
    portrait.src = '/avatars/maya.png'
    portrait.alt = ''
    portrait.width = portrait.height = 60
    const name = node('div', '')
    name.append(node('strong', '', 'Maya · protest leader'))
    header.append(portrait, name)
    return header
  }
  const title = node(
    'h2',
    '',
    'People don’t like this idea. They are protesting, hear their concerns.',
  )
  title.id = 'polo-protest-invitation-title'
  const talk = action('Talk to Maya →', 'polo-protest-primary')
  const skip = action('Skip conversation', 'polo-protest-skip')
  const choices = node('div', 'polo-protest-choices')
  choices.append(talk, skip)
  invitation.append(identity(), title, choices)

  const dialog = node('dialog', 'polo-protest-dialog')
  dialog.setAttribute('aria-labelledby', 'polo-protest-question')
  const exit = action('Skip conversation', 'polo-protest-skip')
  const question = node('h2', '')
  question.id = 'polo-protest-question'
  const speaker = node('div', 'polo-protest-speaker')
  speaker.append(identity())
  const reply = node('div', 'polo-protest-reply')
  reply.setAttribute('aria-live', 'polite')
  const answer = node('p', 'polo-protest-answer')
  reply.append(answer)
  const footer = node('nav', 'polo-protest-navigation')
  footer.setAttribute('aria-label', 'Protest conversation steps')
  const back = action('← Back')
  const next = action('', 'polo-protest-primary')
  const count = node('span', 'polo-protest-progress')
  footer.append(back, count, next)
  dialog.append(question, speaker, reply, footer, exit)
  host.append(invitation)
  insertBeforeMapCredits(host, dialog)

  let progress = { ...INITIAL_POLO_PROTEST }
  let gatheringTimer: ReturnType<typeof setTimeout> | undefined
  let destroyed = false
  const pending = (): boolean =>
    progress.stage !== 'idle' && progress.stage !== 'finished'
  const render = (): void => {
    root.dataset['poloProtestPending'] = String(pending())
    root.dataset['poloProtest'] = progress.stage
    invitation.hidden =
      progress.stage !== 'gathering' && progress.stage !== 'invitation'
    const gathering = progress.stage === 'gathering'
    talk.disabled = skip.disabled = gathering
    if (progress.stage === 'conversation') {
      const step = POLO_PROTEST_STEPS[progress.step]
      if (!step) return
      question.textContent = step.question
      answer.textContent = step.answer
      count.textContent = `${String(progress.step + 1)} of ${String(POLO_PROTEST_STEPS.length)}`
      back.disabled = progress.step === 0
      next.textContent = step.next
      exit.hidden = progress.step === POLO_PROTEST_STEPS.length - 1
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) dialog.close()
  }
  const flow = new PoloProtestFlow((next) => {
    progress = next
    render()
  }, onComplete)
  const dispatch = (event: PoloProtestEvent): void => {
    flow.dispatch(event)
  }
  talk.addEventListener('click', () => {
    dispatch('talk')
  })
  for (const button of [skip, exit])
    button.addEventListener('click', () => {
      dispatch('skip')
    })
  back.addEventListener('click', () => {
    dispatch('back')
  })
  next.addEventListener('click', () => {
    dispatch('next')
  })
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    dispatch('skip')
  })
  // Programmatic close cannot quietly release the construction gate.
  dialog.addEventListener('close', () => {
    if (!destroyed && progress.stage === 'conversation') {
      dispatch('close')
      talk.focus()
    }
  })
  render()
  return {
    begin: () => {
      if (destroyed || progress.stage !== 'idle') return
      dispatch('confirm')
      gatheringTimer = setTimeout(() => {
        dispatch('crowd-ready')
      }, 1100)
    },
    talk: () => {
      dispatch('talk')
    },
    reset: () => {
      clearTimeout(gatheringTimer)
      dispatch('reset')
    },
    pending,
    destroy: () => {
      if (destroyed) return
      destroyed = true
      flow.destroy()
      clearTimeout(gatheringTimer)
      dialog.close()
      dialog.remove()
      invitation.remove()
      delete root.dataset['poloProtestPending']
      delete root.dataset['poloProtest']
    },
  }
}
