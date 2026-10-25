import './learning-ui.css'
import {
  POLO_LEARNINGS,
  applyPoloLearnings,
  selectedPoloLearnings,
  selectedCustomPoloLearnings,
} from './learnings.ts'
import {
  POLO_CUSTOM_LEARNING_LIMIT,
  POLO_CUSTOM_LEARNING_LENGTH,
} from './model.ts'
import type {
  PoloLearnings,
  PoloSceneState,
  PoloCustomLearning,
} from './model.ts'

export function setupPoloLearning(
  root: HTMLElement,
  getState: () => PoloSceneState,
  change: (state: PoloSceneState) => void,
  focus: () => void,
): { open(): void; sync(): void; destroy(): void } {
  const host = root.querySelector('.polo-studio') ?? root
  const panel = document.createElement('aside')
  panel.className = 'polo-learning'
  panel.hidden = true
  panel.setAttribute('aria-label', 'Use what you learned')
  const caption = document.createElement('div')
  caption.className = 'polo-learning-map-label'
  caption.hidden = true
  caption.setAttribute('role', 'status')
  host.append(panel, caption)
  let mode: 'choose' | 'compare' = 'choose'
  let draft: PoloLearnings = {}
  let customDraft: PoloCustomLearning[] = []
  let customText = ''
  let key = ''

  const make = (tag: string, text = '', className = ''): HTMLElement => {
    const node = document.createElement(tag)
    node.textContent = text
    node.className = className
    return node
  }
  function button(
    text: string,
    action: () => void,
    primary = false,
  ): HTMLButtonElement {
    const node = document.createElement('button')
    node.type = 'button'
    node.textContent = text
    if (primary) node.className = 'is-primary'
    node.addEventListener('click', action)
    return node
  }
  function close(): void {
    panel.hidden = caption.hidden = true
    delete root.dataset['poloLearning']
    root
      .querySelector<HTMLButtonElement>('#polo-learning-open')
      ?.focus({ preventScroll: true })
  }
  function render(): void {
    const state = getState()
    root.dataset['poloLearning'] = mode
    panel.replaceChildren()
    const header = make('div', '', 'polo-learning-heading')
    const closeButton = button('×', close)
    closeButton.setAttribute('aria-label', 'Close learning comparison')
    header.append(
      make('span', 'YOUR NEXT DESIGN', 'polo-learning-eyebrow'),
      closeButton,
    )
    const title = make(
      'h2',
      mode === 'choose'
        ? 'What would you change?'
        : selectedPoloLearnings(state).length
          ? 'Same site. Better ideas.'
          : 'Same site. Your ideas.',
    )
    title.tabIndex = -1
    panel.append(header, title)
    if (mode === 'choose') {
      caption.hidden = true
      panel.append(make('p', 'Choose what you would include from the start.'))
      const all =
        POLO_LEARNINGS.every((item) => draft[item.id]) &&
        customDraft.every((item) => item.selected)
      const selectAll = button(all ? 'Clear selection' : 'Select all', () => {
        draft = all ? {} : { soil: true, water: true, heat: true, roof: true }
        customDraft = customDraft.map((item) => ({ ...item, selected: !all }))
        render()
        panel
          .querySelector<HTMLButtonElement>('.polo-learning-select-all')
          ?.focus()
      })
      selectAll.className = 'polo-learning-select-all'
      panel.append(selectAll)
      const cards = make('div', '', 'polo-learning-cards')
      for (const item of POLO_LEARNINGS) {
        const selected = Boolean(draft[item.id])
        const card = button('', () => {
          draft = { ...draft, [item.id]: !draft[item.id] }
          render()
          panel
            .querySelector<HTMLButtonElement>(`[data-learning="${item.id}"]`)
            ?.focus()
        })
        card.className = 'polo-learning-choice'
        card.title = item.action
        card.dataset['learning'] = item.id
        card.setAttribute('aria-pressed', String(selected))
        card.style.setProperty('--learning-color', item.color)
        const top = make('span', '', 'polo-learning-choice-top')
        top.append(
          make('span', item.icon),
          make('strong', item.title),
          make('span', selected ? '✓' : '+', 'polo-learning-check'),
        )
        card.append(
          top,
          make('span', item.lesson),
          make(
            'small',
            'Trade-off: ' + item.tradeoff,
            'polo-learning-tradeoff',
          ),
        )
        cards.append(card)
      }
      for (const item of customDraft) {
        const row = make('div', '', 'polo-custom-learning')
        const choice = button('✎ ' + item.text, () => {
          customDraft = customDraft.map((entry) =>
            entry.id === item.id
              ? { ...entry, selected: !entry.selected }
              : entry,
          )
          render()
          panel
            .querySelector<HTMLButtonElement>(
              `[data-custom-learning="${item.id}"]`,
            )
            ?.focus()
        })
        choice.dataset['customLearning'] = item.id
        choice.setAttribute('aria-pressed', String(item.selected))
        const remove = button('×', () => {
          customDraft = customDraft.filter((entry) => entry.id !== item.id)
          render()
          panel
            .querySelector<HTMLTextAreaElement>('#polo-custom-learning')
            ?.focus()
        })
        remove.setAttribute('aria-label', 'Remove idea: ' + item.text)
        row.append(choice, remove)
        cards.append(row)
      }
      const customForm = document.createElement('form')
      customForm.className = 'polo-custom-learning-form'
      const label = document.createElement('label')
      label.htmlFor = 'polo-custom-learning'
      label.textContent = 'Your own learning or idea'
      const input = document.createElement('textarea')
      input.id = label.htmlFor
      input.rows = 2
      input.maxLength = POLO_CUSTOM_LEARNING_LENGTH
      input.placeholder = 'What else would you change?'
      input.value = customText
      const full = customDraft.length >= POLO_CUSTOM_LEARNING_LIMIT
      input.disabled = full
      const add = button('Add my idea +', () => {})
      add.type = 'submit'
      add.disabled = full || !customText.trim()
      input.addEventListener('input', () => {
        customText = input.value
        add.disabled = full || !customText.trim()
      })
      customForm.addEventListener('submit', (event) => {
        event.preventDefault()
        const text = customText.trim().slice(0, POLO_CUSTOM_LEARNING_LENGTH)
        if (!text || customDraft.length >= POLO_CUSTOM_LEARNING_LIMIT) return
        customDraft = [
          ...customDraft,
          { id: crypto.randomUUID(), text, selected: true },
        ]
        customText = ''
        render()
        panel
          .querySelector<HTMLTextAreaElement>('#polo-custom-learning')
          ?.focus()
      })
      customForm.append(
        label,
        input,
        add,
        make(
          'small',
          full
            ? 'Five ideas added. Remove one to add another.'
            : 'Custom ideas are saved proposals. Map changes need a design.',
        ),
      )
      const count =
        POLO_LEARNINGS.filter((item) => draft[item.id]).length +
        customDraft.filter((item) => item.selected).length
      const canApply =
        count > 0 ||
        selectedPoloLearnings(state).length > 0 ||
        selectedCustomPoloLearnings(state).length > 0 ||
        JSON.stringify(customDraft) !==
          JSON.stringify(state.customLearnings ?? [])
      const compare = button(
        count
          ? `Compare my plans · ${String(count)} selected →`
          : canApply
            ? 'Use original plan'
            : 'Choose at least one change',
        () => {
          if (!count) {
            change({
              ...applyPoloLearnings(getState(), draft, customDraft),
              preview: false,
            })
            close()
            return
          }
          mode = 'compare'
          change(applyPoloLearnings(getState(), draft, customDraft))
          render()
          focus()
          panel
            .querySelector<HTMLHeadingElement>('h2')
            ?.focus({ preventScroll: true })
        },
        true,
      )
      compare.disabled = !canApply
      panel.append(cards, customForm, compare)
    } else {
      caption.hidden = false
      caption.textContent = state.preview
        ? selectedPoloLearnings(state).length
          ? 'AFTER · YOUR IMPROVED PLAN'
          : 'AFTER · YOUR PROPOSED PLAN'
        : 'BEFORE · ORIGINAL PLAN'
      caption.dataset['view'] = state.preview ? 'improved' : 'original'
      panel.append(
        make('p', 'What if these choices were part of the original design?'),
      )
      const views = make('div', '', 'polo-learning-views')
      views.setAttribute('role', 'group')
      views.setAttribute('aria-label', 'Compare the same campus')
      for (const [preview, label] of [
        [false, 'Original plan'],
        [true, 'Improved plan'],
      ] as const) {
        const view = button(label, () => {
          change({ ...getState(), preview })
          render()
          panel
            .querySelector<HTMLButtonElement>(
              `[data-view="${String(preview)}"]`,
            )
            ?.focus()
        })
        view.dataset['view'] = String(preview)
        view.setAttribute('aria-pressed', String(state.preview === preview))
        views.append(view)
      }
      panel.append(views)
      const changes = make('div', '', 'polo-learning-changes')
      for (const item of selectedPoloLearnings(state)) {
        const row = make('div', '', 'polo-learning-change')
        row.title = 'Trade-off: ' + item.tradeoff
        row.style.setProperty('--learning-color', item.color)
        row.append(
          make('strong', item.icon + ' ' + item.title),
          make('span', state.preview ? item.after : item.before),
        )
        changes.append(row)
      }
      for (const item of selectedCustomPoloLearnings(state)) {
        const row = make('div', '', 'polo-learning-change')
        row.style.setProperty('--learning-color', '#9a70cf')
        row.append(
          make('strong', '✎ ' + item.text),
          make(
            'span',
            state.preview
              ? 'Your proposal · not mapped yet'
              : 'Not included in the original plan',
          ),
        )
        changes.append(row)
      }
      panel.append(
        changes,
        make('p', 'The playing field is still lost.', 'polo-learning-conflict'),
        make(
          'small',
          'Design comparison · water, energy and heat savings need assessment.',
        ),
      )
      const actions = make('div', '', 'polo-learning-footer')
      actions.append(
        button('Edit my choices', () => {
          draft = { ...getState().learnings }
          customDraft =
            getState().customLearnings?.map((item) => ({ ...item })) ?? []
          mode = 'choose'
          render()
        }),
        button('Back to map →', close, true),
      )
      panel.append(actions)
    }
    key = JSON.stringify([
      state.phase,
      state.preview,
      state.learnings,
      state.customLearnings,
    ])
  }
  return {
    open(): void {
      const state = getState()
      if (!state.confirmed || state.phase !== 'M6') return
      draft = { ...state.learnings }
      customDraft = state.customLearnings?.map((item) => ({ ...item })) ?? []
      mode =
        selectedPoloLearnings(state).length ||
        selectedCustomPoloLearnings(state).length
          ? 'compare'
          : 'choose'
      panel.hidden = false
      render()
      panel
        .querySelector<HTMLHeadingElement>('h2')
        ?.focus({ preventScroll: true })
    },
    sync(): void {
      const state = getState()
      if (panel.hidden) return
      if (!state.confirmed || state.phase !== 'M6') close()
      else if (
        key !==
        JSON.stringify([
          state.phase,
          state.preview,
          state.learnings,
          state.customLearnings,
        ])
      )
        render()
    },
    destroy(): void {
      delete root.dataset['poloLearning']
      panel.remove()
      caption.remove()
    },
  }
}
