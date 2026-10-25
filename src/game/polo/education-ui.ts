import { poloEducation, POLO_TOPICS } from './education.ts'
import type { PoloTopic } from './education.ts'
import type { PoloSceneState } from './model.ts'
import { poloTodayCard, POLO_TODAY_TABS } from './today.ts'
import type { PoloTodayTab } from './today.ts'
import './today.css'

export function setupPoloEducation(
  root: HTMLElement,
  getState: () => PoloSceneState,
  onTopic: (topic: PoloTopic | null) => void,
  onClose: () => void,
): {
  open: (topic: PoloTopic) => void
  resetToday: () => void
  sync: () => void
  destroy: () => void
} {
  const studio = root.querySelector('.polo-studio')
  const deck = root.querySelector('.polo-deck')
  if (!studio || !deck) throw new Error('Missing Polo education host')
  const topics = document.createElement('div')
  topics.className = 'polo-topic-buttons'
  topics.setAttribute('role', 'group')
  topics.setAttribute('aria-label', 'Explore what changes')
  const labels: Record<PoloTopic, string> = {
    water: 'Water',
    electricity: 'Electricity',
    land: 'Land & people',
  }
  const icons: Record<PoloTopic, string> = {
    water: '💧',
    electricity: '⚡',
    land: '🌱',
  }
  let todayTab: PoloTodayTab = 'general'
  let previousPhase = getState().phase
  const todayPanel = document.createElement('div')
  todayPanel.className = 'polo-today-panel'
  todayPanel.id = 'polo-today-panel'
  todayPanel.setAttribute('role', 'tabpanel')
  const general = document.createElement('button')
  general.type = 'button'
  general.innerHTML = '<span aria-hidden="true">◎</span><span>General</span>'
  general.dataset['todayTab'] = 'general'
  general.id = 'polo-tab-general'
  const renderToday = (): void => {
    const state = getState()
    const today = state.phase === 'M0'
    if (previousPhase !== state.phase) todayTab = 'general'
    previousPhase = state.phase
    general.hidden = !today
    todayPanel.hidden = !today
    topics.setAttribute('role', today ? 'tablist' : 'group')
    topics.setAttribute(
      'aria-label',
      today ? 'Learn about this place' : 'Explore what changes',
    )
    for (const button of topics.querySelectorAll('button')) {
      if (today) {
        const selected = button.dataset['todayTab'] === todayTab
        button.setAttribute('role', 'tab')
        button.setAttribute('aria-selected', String(selected))
        button.setAttribute('aria-controls', todayPanel.id)
        button.tabIndex = selected ? 0 : -1
      } else {
        button.removeAttribute('role')
        button.removeAttribute('aria-selected')
        button.removeAttribute('aria-controls')
        button.tabIndex = 0
      }
    }
    if (!today) return
    todayPanel.setAttribute('aria-labelledby', `polo-tab-${todayTab}`)
    todayPanel.replaceChildren()
    const card = poloTodayCard(state, todayTab)
    const metrics = document.createElement('div')
    metrics.className = 'polo-today-metrics'
    for (const metric of card.metrics) {
      const item = document.createElement('div')
      item.className = 'polo-metric'
      const value = document.createElement('strong')
      value.textContent = metric.value
      const label = document.createElement('span')
      label.textContent = metric.label
      item.append(value, label)
      if (metric.note) {
        const note = document.createElement('small')
        note.textContent = metric.note
        item.append(note)
      }
      metrics.append(item)
    }
    todayPanel.append(metrics)
    if (card.copy) {
      const copy = document.createElement('p')
      copy.className = 'polo-today-copy'
      copy.textContent = card.copy
      todayPanel.append(copy)
    }
    if (todayTab === 'water') {
      const rain = document.createElement('button')
      rain.type = 'button'
      rain.className = 'polo-rain-button'
      rain.dataset['poloAction'] = 'rain'
      rain.textContent = state.rain ? '☂ Stop rain' : '☂ Replay the same rain'
      rain.setAttribute('aria-pressed', String(state.rain))
      todayPanel.append(rain)
    }
    const details = document.createElement('details')
    details.className = 'polo-today-details'
    const summary = document.createElement('summary')
    summary.textContent = card.detailsTitle ?? 'What’s behind these figures?'
    details.append(summary)
    for (const text of card.details) {
      const paragraph = document.createElement('p')
      paragraph.textContent = text
      details.append(paragraph)
    }
    if (card.sources) {
      const sources = document.createElement('div')
      sources.className = 'polo-today-sources'
      for (const source of card.sources) {
        const label = document.createElement('span')
        label.textContent = source.label
        label.title = source.url
        sources.append(label)
      }
      details.append(sources)
    }
    todayPanel.append(details)
  }
  const selectToday = (tab: PoloTodayTab): void => {
    todayTab = tab
    onTopic(null)
    renderToday()
  }
  general.addEventListener('click', () => {
    selectToday('general')
  })
  topics.append(general)
  topics.addEventListener('keydown', (event) => {
    if (
      getState().phase !== 'M0' ||
      !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
    )
      return
    event.preventDefault()
    const current = POLO_TODAY_TABS.indexOf(todayTab)
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? 3
          : (current + (event.key === 'ArrowRight' ? 1 : 3)) % 4
    const tab = POLO_TODAY_TABS[index]
    if (!tab) return
    selectToday(tab)
    topics.querySelector<HTMLButtonElement>(`#polo-tab-${tab}`)?.focus()
  })
  const dialog = document.createElement('dialog')
  dialog.className = 'polo-evidence polo-education'
  dialog.setAttribute('aria-labelledby', 'polo-education-title')
  dialog.innerHTML = `
    <button type="button" class="polo-dialog-close" aria-label="Close topic">×</button>
    <div class="polo-education-guide"><img src="/avatars/maya.png" alt="" width="64" height="64"><span>Let’s follow what changes.</span></div>
    <h2 id="polo-education-title"></h2>
    <div class="polo-education-progress"><span></span></div>
    <p class="polo-education-kind"></p>
    <h3 class="polo-education-heading"></h3>
    <div class="polo-education-value" hidden></div>
    <p class="polo-education-copy" aria-live="polite"></p>
    <div class="polo-reader-controls"><button type="button" class="polo-education-back">← Back</button><span></span><button type="button" class="polo-education-next">Next →</button></div>
    <button type="button" class="polo-education-sources">Sources & assumptions</button>
    <p class="polo-education-footnote">Fictional campus. Real place. Explore the assumptions.</p>
  `
  studio.append(dialog)
  dialog.addEventListener('close', onClose)
  let activeTopic: PoloTopic = 'water'
  let index = 0
  let education = poloEducation(getState(), activeTopic)
  const required = <T extends HTMLElement>(
    selector: string,
    type: { new (): T },
  ): T => {
    const node = dialog.querySelector(selector)
    if (!(node instanceof type))
      throw new Error('Missing education control: ' + selector)
    return node
  }
  const title = required('#polo-education-title', HTMLHeadingElement)
  const heading = required('.polo-education-heading', HTMLHeadingElement)
  const copy = required('.polo-education-copy', HTMLParagraphElement)
  const value = required('.polo-education-value', HTMLDivElement)
  const kind = required('.polo-education-kind', HTMLParagraphElement)
  const progress = required('.polo-education-progress span', HTMLSpanElement)
  const count = required('.polo-reader-controls span', HTMLSpanElement)
  const back = required('.polo-education-back', HTMLButtonElement)
  const next = required('.polo-education-next', HTMLButtonElement)
  const render = (): void => {
    const current = education.steps[index]
    if (!current) return
    title.textContent = education.title
    heading.textContent = current.title
    copy.textContent = current.text
    value.textContent = current.value ?? ''
    value.hidden = current.value === undefined
    kind.textContent = current.kind
    kind.dataset['kind'] = current.kind
    count.textContent = `${String(index + 1)} of ${String(education.steps.length)}`
    back.disabled = index === 0
    next.textContent =
      index === education.steps.length - 1 ? 'Done ✓' : 'Next →'
    progress.style.width = `${String(((index + 1) / education.steps.length) * 100)}%`
  }
  const open = (topic: PoloTopic): void => {
    if (!getState().confirmed || root.dataset['poloConfirming'] === 'true')
      return
    if (getState().phase === 'M0') {
      selectToday(topic)
      return
    }
    activeTopic = topic
    education = poloEducation(getState(), activeTopic)
    index = 0
    render()
    onTopic(topic)
    dialog.showModal()
  }
  back.addEventListener('click', () => {
    index = Math.max(0, index - 1)
    render()
  })
  next.addEventListener('click', () => {
    if (index === education.steps.length - 1) dialog.close()
    else {
      index += 1
      render()
    }
  })
  dialog.querySelector('.polo-dialog-close')?.addEventListener('click', () => {
    dialog.close()
  })
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return
    const box = dialog.getBoundingClientRect()
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      dialog.close()
  })
  dialog
    .querySelector('.polo-education-sources')
    ?.addEventListener('click', () => {
      dialog.close()
      root
        .querySelector<HTMLButtonElement>('[data-polo-action="evidence"]')
        ?.click()
    })
  for (const topic of POLO_TOPICS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.id = `polo-tab-${topic}`
    button.dataset['todayTab'] = topic
    const icon = document.createElement('span')
    icon.textContent = icons[topic]
    icon.setAttribute('aria-hidden', 'true')
    const label = document.createElement('span')
    label.textContent = labels[topic]
    button.append(icon, label)
    button.addEventListener('click', () => {
      open(topic)
    })
    topics.append(button)
  }
  deck.insertBefore(topics, deck.querySelector('.polo-motion'))
  deck.insertBefore(todayPanel, deck.querySelector('.polo-motion'))
  renderToday()
  return {
    open,
    resetToday: () => {
      selectToday('general')
    },
    sync: renderToday,
    destroy: () => {
      dialog.close()
      dialog.remove()
      topics.remove()
      todayPanel.remove()
    },
  }
}
