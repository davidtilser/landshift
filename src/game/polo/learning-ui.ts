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
import { appendPoloSummary } from './summary-ui.ts'
import { appendPoloLearningChoiceContent } from './learning-choice.ts'
import { appendPoloHeatComparison } from './heat-comparison.ts'
import { setupPoloMapComparison } from './map-comparison-ui.ts'

export function setupPoloLearning(
  root: HTMLElement,
  getState: () => PoloSceneState,
  change: (state: PoloSceneState) => void,
  focus: () => void,
  onProposalApplied?: () => void,
): { openSummary(): void; dismiss(): void; sync(): void; destroy(): void } {
  const host = root.querySelector<HTMLElement>('.polo-studio') ?? root
  const workspace = document.createElement('div')
  workspace.className = 'polo-learning-workspace'
  workspace.hidden = true
  const summaryPanel = document.createElement('aside')
  summaryPanel.className = 'polo-learning is-summary'
  summaryPanel.setAttribute('aria-label', 'Project summary')
  const panel = document.createElement('aside')
  panel.className = 'polo-learning polo-learning-proposal'
  panel.hidden = true
  panel.setAttribute('aria-label', 'Propose changes')
  workspace.append(summaryPanel, panel)
  host.append(workspace)
  const detailDialog = document.createElement('dialog')
  detailDialog.className = 'polo-plan-detail-dialog'
  host.append(detailDialog)
  let mode: 'summary' | 'choose' | 'compare' | 'map' = 'summary'
  let active = false
  const mapComparison = setupPoloMapComparison(
    host,
    getState,
    (preview) => {
      change({ ...getState(), preview })
      render()
    },
    () => {
      mode = 'compare'
      change({ ...getState(), preview: false })
      render()
      panel
        .querySelector<HTMLHeadingElement>('h2')
        ?.focus({ preventScroll: true })
    },
  )
  let draft: PoloLearnings = {}
  let customDraft: PoloCustomLearning[] = []
  let customText = ''
  let key = ''
  let summaryArea: number | undefined

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
  function showDetail(title: string, content: HTMLElement): void {
    const heading = make('h2', title)
    heading.id = 'polo-plan-detail-title'
    const close = button('×', () => {
      detailDialog.close()
    })
    close.setAttribute('aria-label', 'Close ' + title.toLowerCase())
    const header = make('header', '', 'polo-learning-heading')
    header.append(heading, close)
    detailDialog.setAttribute('aria-labelledby', heading.id)
    detailDialog.replaceChildren(header, content)
    detailDialog.showModal()
  }
  function syncTimeline(): void {
    const summaryOpen = active
    root
      .querySelector('[data-polo-action="summary"].polo-stop')
      ?.setAttribute('aria-current', summaryOpen ? 'step' : 'false')
    for (const stop of root.querySelectorAll<HTMLButtonElement>('[data-phase]'))
      stop.setAttribute(
        'aria-current',
        !summaryOpen && stop.dataset['phase'] === getState().phase
          ? 'step'
          : 'false',
      )
  }
  function dismiss(): void {
    const wasOpen = active
    active = false
    mode = 'summary'
    workspace.hidden = panel.hidden = true
    detailDialog.close()
    mapComparison.setVisible(false)
    delete root.dataset['poloLearning']
    if (wasOpen && getState().preview) change({ ...getState(), preview: false })
    syncTimeline()
    if (wasOpen && getState().confirmed)
      root
        .querySelector<HTMLButtonElement>('.polo-summary-stop')
        ?.focus({ preventScroll: true })
  }
  function close(): void {
    if (mode === 'summary') dismiss()
    else {
      mode = 'summary'
      render()
      summaryPanel
        .querySelector<HTMLButtonElement>('.polo-summary-footer button')
        ?.focus({ preventScroll: true })
    }
  }
  function renderSummary(state: PoloSceneState): void {
    if (summaryArea === state.areaHa && summaryPanel.childElementCount) return
    const content = summaryPanel.querySelector('.polo-summary-content')
    const scrollTop = content?.scrollTop ?? 0
    summaryPanel.replaceChildren()
    const closeButton = button('×', dismiss)
    closeButton.setAttribute('aria-label', 'Close project summary and changes')
    appendPoloSummary(
      summaryPanel,
      state,
      () => {
        if (mode === 'choose') {
          panel
            .querySelector<HTMLHeadingElement>('h2')
            ?.focus({ preventScroll: true })
          return
        }
        draft = { ...getState().learnings }
        customDraft =
          getState().customLearnings?.map((item) => ({ ...item })) ?? []
        mode = 'choose'
        render()
        panel
          .querySelector<HTMLHeadingElement>('h2')
          ?.focus({ preventScroll: true })
      },
      closeButton,
    )
    const heading = summaryPanel.querySelector('h2')
    if (heading) {
      const title = make('div', '', 'polo-summary-title')
      heading.replaceWith(title)
      title.append(heading, make('small', 'Today → Original campus'))
    }
    const nextContent = summaryPanel.querySelector('.polo-summary-content')
    if (nextContent) nextContent.scrollTop = scrollTop
    const details = summaryPanel.querySelector<HTMLDetailsElement>('details')
    if (details) {
      const body = make('div')
      body.append(
        ...[...details.children].filter((child) => child.tagName !== 'SUMMARY'),
      )
      const sources = button('How these numbers compare ↗', () => {
        showDetail('How these numbers compare', body)
      })
      sources.className = 'polo-plan-detail-link'
      sources.setAttribute('aria-haspopup', 'dialog')
      details.replaceWith(sources)
    }
    summaryArea = state.areaHa
  }
  function render(): void {
    const state = getState()
    root.dataset['poloLearning'] = mode
    workspace.hidden = mode === 'map'
    mapComparison.setVisible(mode === 'map')
    syncTimeline()
    if (mode === 'map') {
      key = stateKey()
      return
    }
    const scrollTop =
      panel.dataset['mode'] === mode
        ? (panel.querySelector('.polo-learning-content')?.scrollTop ?? 0)
        : 0
    workspace.dataset['mode'] = mode
    panel.dataset['mode'] = mode
    panel.hidden = mode === 'summary'
    panel.setAttribute(
      'aria-label',
      mode === 'compare' ? 'Proposed impact' : 'Propose changes',
    )
    renderSummary(state)
    if (mode === 'summary') {
      key = stateKey()
      return
    }
    panel.replaceChildren()
    const header = make('div', '', 'polo-learning-heading')
    const closeButton = button('×', close)
    closeButton.setAttribute(
      'aria-label',
      'Close changes and return to summary',
    )
    const title = make(
      'h2',
      mode === 'choose'
        ? 'What would you change?'
        : selectedPoloLearnings(state).length === 1 &&
            state.learnings?.heat &&
            selectedCustomPoloLearnings(state).length === 0
          ? 'Waste heat'
          : 'Proposed impact',
    )
    title.tabIndex = -1
    header.append(title, closeButton)
    const content = make('div', '', 'polo-learning-content')
    const footer = make('div', '', 'polo-learning-footer')
    panel.append(header, content, footer)
    if (mode === 'choose') {
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
      const toolbar = make('div', '', 'polo-learning-toolbar')
      toolbar.append(selectAll)
      content.append(toolbar)
      const cards = make('div', '', 'polo-learning-cards')
      const customChoices = make('div', '', 'polo-custom-idea-list')
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
        appendPoloLearningChoiceContent(card, item, selected)
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
          refreshCustomEditor()
          detailDialog
            .querySelector<HTMLButtonElement>(
              `[data-custom-learning="${item.id}"]`,
            )
            ?.focus()
        })
        choice.dataset['customLearning'] = item.id
        choice.setAttribute('aria-pressed', String(item.selected))
        const remove = button('×', () => {
          customDraft = customDraft.filter((entry) => entry.id !== item.id)
          refreshCustomEditor()
          detailDialog
            .querySelector<HTMLTextAreaElement>('#polo-custom-learning')
            ?.focus()
        })
        remove.setAttribute('aria-label', 'Remove idea: ' + item.text)
        row.append(choice, remove)
        customChoices.append(row)
      }
      const customForm = document.createElement('form')
      customForm.className = 'polo-custom-learning-form'
      const label = document.createElement('label')
      label.htmlFor = 'polo-custom-learning'
      label.textContent = 'Your own idea'
      const input = document.createElement('textarea')
      input.id = label.htmlFor
      input.rows = 2
      input.maxLength = POLO_CUSTOM_LEARNING_LENGTH
      input.placeholder = 'What else would you change?'
      input.value = customText
      const full = customDraft.length >= POLO_CUSTOM_LEARNING_LIMIT
      input.disabled = full
      const add = button('Add my idea +', () => {})
      add.className = 'polo-add-idea'
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
        detailDialog.close()
        render()
        panel.querySelector<HTMLButtonElement>('[data-custom-editor]')?.focus()
      })
      customForm.append(
        label,
        input,
        add,
        make(
          'small',
          full
            ? 'Five ideas added. Remove one to add another.'
            : 'Saved as a proposal; not mapped yet.',
        ),
      )
      const customEditor = make('div')
      customEditor.append(customChoices, customForm)
      const customButton = button(
        customDraft.length
          ? `Your own ideas · ${String(customDraft.length)} ↗`
          : 'Add your own idea ↗',
        () => {
          showDetail('Your own ideas', customEditor)
          input.focus()
        },
      )
      customButton.className = 'polo-plan-detail-link'
      customButton.dataset['customEditor'] = ''
      customButton.setAttribute('aria-haspopup', 'dialog')
      function refreshCustomEditor(): void {
        detailDialog.close()
        render()
        panel.querySelector<HTMLButtonElement>('[data-custom-editor]')?.click()
      }
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
          ? `View impact · ${String(count)} selected →`
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
          change({
            ...applyPoloLearnings(getState(), draft, customDraft),
            preview: false,
          })
          onProposalApplied?.()
          render()
          panel
            .querySelector<HTMLHeadingElement>('h2')
            ?.focus({ preventScroll: true })
        },
        true,
      )
      compare.disabled = !canApply
      content.append(cards, customButton)
      footer.append(compare)
    } else {
      const changes = make('div', '', 'polo-learning-changes')
      for (const item of selectedPoloLearnings(state)) {
        if (item.id === 'heat') continue
        const row = make('div', '', 'polo-learning-change')
        row.title = 'Trade-off: ' + item.tradeoff
        row.append(
          make('strong', item.icon + ' ' + item.title),
          make('span', item.after),
        )
        changes.append(row)
      }
      if (state.learnings?.heat) {
        const heat = make('div', '', 'polo-learning-change')
        const heatDetails = make('div')
        appendPoloHeatComparison(heatDetails, state)
        const inspect = button('Heat details ↗', () => {
          showDetail('Heat reuse benefits and trade-offs', heatDetails)
        })
        inspect.className = 'polo-plan-detail-link'
        inspect.setAttribute('aria-haspopup', 'dialog')
        heat.append(
          make('strong', '♨ Put waste heat to work'),
          make(
            'span',
            state.recipientAvailable
              ? 'Useful heating needs extra electricity and upfront investment. Backup systems remain.'
              : 'No useful heat without a heat user. Equipment costs and backup systems remain.',
          ),
          inspect,
        )
        changes.append(heat)
      }
      content.append(changes)
      const custom = selectedCustomPoloLearnings(state)
      if (custom.length) {
        const ideas = make('div')
        ideas.append(make('p', 'Your proposals · not mapped yet'))
        for (const item of custom) ideas.append(make('p', '✎ ' + item.text))
        const inspect = button(
          `Your own ideas · ${String(custom.length)} ↗`,
          () => {
            showDetail('Your proposed ideas', ideas)
          },
        )
        inspect.className = 'polo-plan-detail-link'
        inspect.setAttribute('aria-haspopup', 'dialog')
        content.append(inspect)
      }
      content.append(
        make('p', 'The playing field is still lost.', 'polo-learning-conflict'),
        make(
          'small',
          'Design comparison · water, energy and heat savings need assessment.',
        ),
      )
      footer.append(
        button(
          'View changes on map',
          () => {
            mode = 'map'
            change({ ...getState(), preview: true })
            render()
            focus()
            mapComparison.focus()
          },
          true,
        ),
      )
    }
    content.scrollTop = scrollTop
    key = stateKey()
  }
  function stateKey(): string {
    const state = getState()
    return JSON.stringify([
      state.phase,
      state.preview,
      state.recipientAvailable,
      state.learnings,
      state.customLearnings,
      state.areaHa,
      state.proposal,
      state.improvements,
    ])
  }
  return {
    openSummary(): void {
      const state = getState()
      if (!state.confirmed || state.phase !== 'M6') return
      active = true
      mode = 'summary'
      if (state.preview) change({ ...state, preview: false })
      render()
      summaryPanel
        .querySelector<HTMLHeadingElement>('h2')
        ?.focus({ preventScroll: true })
    },
    dismiss,
    sync(): void {
      const state = getState()
      if (!active) return
      if (!state.confirmed || state.phase !== 'M6') dismiss()
      else if (key !== stateKey()) render()
    },
    destroy(): void {
      active = false
      delete root.dataset['poloLearning']
      workspace.remove()
      detailDialog.remove()
      mapComparison.destroy()
    },
  }
}
