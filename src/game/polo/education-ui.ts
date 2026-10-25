import type { PoloTopic } from './education.ts'
import type { PoloSceneState } from './model.ts'
import { POLO_BASELINE } from './baseline.ts'
import { poloChapterCard, POLO_TODAY_TABS } from './today.ts'
import type { PoloTodayTab } from './today.ts'
import { poloUsText } from './us-units.ts'
import './today.css'
import { poloPlanningText } from './planning-copy.ts'

/** Inline topic tabs share one reader across the entire walkthrough. */
export function setupPoloEducation(
  root: HTMLElement,
  getState: () => PoloSceneState,
  onTopic: (topic: PoloTopic | null) => void,
): {
  open: (topic: PoloTopic) => void
  resetToday: () => void
  sync: () => void
  destroy: () => void
} {
  const deck = root.querySelector('.polo-deck')
  if (!deck) throw new Error('Missing Polo education host')
  const topics = document.createElement('div')
  topics.className = 'polo-topic-buttons'
  topics.setAttribute('role', 'tablist')
  topics.setAttribute('aria-label', 'Explore this chapter')
  const labels: Record<PoloTodayTab, string> = {
    general: 'General',
    water: 'Water',
    electricity: 'Electricity',
    land: 'Land & people',
  }
  const icons: Record<PoloTodayTab, string> = {
    general: '◎',
    water: '💧',
    electricity: '⚡',
    land: '🌱',
  }
  let activeTab: PoloTodayTab = 'general'
  let renderedKey = ''
  let previousPhase = getState().phase
  const panel = document.createElement('div')
  panel.className = 'polo-today-panel'
  panel.id = 'polo-today-panel'
  panel.setAttribute('role', 'tabpanel')
  panel.tabIndex = 0

  const paragraph = (text: string, className = ''): HTMLParagraphElement => {
    const item = document.createElement('p')
    item.className = className
    item.textContent = poloPlanningText(text)
    return item
  }
  const render = (): void => {
    const state = getState()
    if (state.phase !== previousPhase) {
      previousPhase = state.phase
      onTopic(
        state.phase === 'M0' || activeTab === 'general' ? null : activeTab,
      )
    }
    const restoreRainFocus =
      panel.contains(document.activeElement) &&
      document.activeElement instanceof HTMLButtonElement &&
      document.activeElement.dataset['poloAction'] === 'rain'
    const key = `${state.phase}/${String(state.preview)}/${state.proposal ?? ''}/${activeTab}`
    const sameCard = key === renderedKey
    const infoOpen =
      sameCard &&
      panel.querySelector<HTMLDetailsElement>('.polo-today-details')?.open ===
        true
    const rainOpen =
      sameCard &&
      panel.querySelector<HTMLDetailsElement>('.polo-rain-story')?.open === true
    renderedKey = key
    for (const button of topics.querySelectorAll('button')) {
      const selected = button.dataset['todayTab'] === activeTab
      button.setAttribute('aria-selected', String(selected))
      button.tabIndex = selected ? 0 : -1
    }
    panel.setAttribute('aria-labelledby', `polo-tab-${activeTab}`)
    panel.replaceChildren()
    const card = poloChapterCard(state, activeTab)
    if (state.phase === 'M1') {
      if (deck.firstElementChild !== topics) deck.prepend(topics)
    } else if (topics.nextElementSibling !== panel) {
      deck.insertBefore(topics, panel)
    }
    if (card.copy) {
      if (state.phase === 'M1') {
        const guide = document.createElement('div')
        guide.className = 'polo-foundations-story'
        const avatar = document.createElement('img')
        avatar.src = '/avatars/maya.png'
        avatar.alt = 'Maya'
        avatar.width = avatar.height = 48
        guide.append(avatar, paragraph(card.copy, 'polo-foundations-speech'))
        panel.append(guide)
      } else {
        panel.append(paragraph(card.copy, 'polo-today-copy'))
      }
    }
    if (card.metrics.length) {
      const metrics = document.createElement('div')
      metrics.className = 'polo-today-metrics'
      for (const metric of card.metrics) {
        const item = document.createElement('div')
        item.className = 'polo-metric'
        const value = document.createElement('strong')
        value.textContent = poloPlanningText(metric.value)
        const label = document.createElement('span')
        label.textContent = poloPlanningText(metric.label)
        item.append(value, label)
        if (metric.note) {
          const note = document.createElement('small')
          note.textContent = poloPlanningText(metric.note)
          item.append(note)
        }
        metrics.append(item)
      }
      panel.append(metrics)
    }
    if (card.comparison) {
      const comparison = document.createElement('div')
      comparison.className = 'polo-story-comparison'
      const value = document.createElement('strong')
      value.textContent = poloPlanningText(card.comparison.value)
      const label = document.createElement('span')
      label.textContent = poloPlanningText(card.comparison.label)
      comparison.append(value, label)
      panel.append(comparison)
    }
    if (card.rain) {
      const rain = document.createElement('details')
      rain.className = 'polo-rain-story'
      rain.open = rainOpen
      const summary = document.createElement('summary')
      summary.textContent = 'When it rains · a separate water story'
      rain.append(summary, paragraph(card.rain.copy))
      if (card.rain.value) {
        const value = document.createElement('strong')
        value.textContent = poloPlanningText(card.rain.value)
        rain.append(value)
      }
      rain.append(paragraph(card.rain.comparison))
      const replay = document.createElement('button')
      replay.type = 'button'
      replay.className = 'polo-rain-button'
      replay.dataset['poloAction'] = 'rain'
      replay.textContent = state.rain ? '☂ Stop rain' : '☂ Replay the same rain'
      replay.setAttribute('aria-pressed', String(state.rain))
      rain.append(replay)
      panel.append(rain)
    }
    const details = document.createElement('details')
    details.className = 'polo-today-details'
    details.open = infoOpen
    const summary = document.createElement('summary')
    summary.textContent = poloPlanningText(
      card.detailsTitle ?? 'More info & data sources',
    )
    details.append(summary)
    for (const text of [...card.details, ...(card.rain?.details ?? [])])
      details.append(paragraph(text))
    const sources = document.createElement('div')
    sources.className = 'polo-today-sources'
    for (const source of card.sources ??
      POLO_BASELINE.sources.map((source) => ({
        label: source.title,
        url: source.url,
      }))) {
      const link = document.createElement('a')
      link.textContent = poloPlanningText(source.label)
      link.href = source.url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      sources.append(link)
    }
    const sourceList = document.createElement('details')
    const sourceTitle = document.createElement('summary')
    sourceTitle.textContent = 'Research sources ↗'
    sourceList.append(sourceTitle, sources)
    details.append(sourceList)
    if (
      state.phase !== 'M0' &&
      !(state.phase === 'M6' && state.preview && state.proposal)
    ) {
      const research = document.createElement('details')
      const heading = document.createElement('summary')
      heading.textContent = 'Original work budgets & research snapshots'
      research.append(
        heading,
        paragraph(
          'Original 4 ha reference below, not recalculated results for a changed build. These inventories are not extra chapter budgets, and are not added on replay.',
        ),
      )
      for (const snapshot of POLO_BASELINE.researchPhases.slice(0, 6)) {
        const data = snapshot.data
        research.append(
          paragraph(
            poloUsText(
              `${snapshot.title}: site water ${data.stageWaterSuppliedM3 === null ? 'unknown' : String(data.stageWaterSuppliedM3) + ' m³'}; electricity ${data.selectedElectricityKWh === null ? 'unknown' : String(data.selectedElectricityKWh) + ' kWh'}; runoff ${data.rainRunoffM3 === null ? 'not quantified' : String(Math.round(data.rainRunoffM3)) + ' m³'}. ${snapshot.details.join(' ')}`,
            ),
          ),
        )
      }
      details.append(research)
    }
    panel.append(details)
    if (sameCard && restoreRainFocus)
      panel
        .querySelector<HTMLButtonElement>('[data-polo-action="rain"]')
        ?.focus({ preventScroll: true })
  }
  const select = (tab: PoloTodayTab): void => {
    activeTab = tab
    onTopic(getState().phase === 'M0' || tab === 'general' ? null : tab)
    render()
  }
  for (const topic of POLO_TODAY_TABS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.id = `polo-tab-${topic}`
    button.dataset['todayTab'] = topic
    button.setAttribute('role', 'tab')
    button.setAttribute('aria-controls', panel.id)
    const icon = document.createElement('span')
    icon.textContent = icons[topic]
    icon.setAttribute('aria-hidden', 'true')
    const label = document.createElement('span')
    label.textContent = labels[topic]
    button.append(icon, label)
    button.addEventListener('click', () => {
      select(topic)
    })
    topics.append(button)
  }
  topics.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const current = POLO_TODAY_TABS.indexOf(activeTab)
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? 3
          : (current + (event.key === 'ArrowRight' ? 1 : 3)) % 4
    const topic = POLO_TODAY_TABS[index]
    if (!topic) return
    select(topic)
    topics.querySelector<HTMLButtonElement>(`#polo-tab-${topic}`)?.focus()
  })
  deck.insertBefore(topics, deck.querySelector('.polo-motion'))
  deck.insertBefore(panel, deck.querySelector('.polo-motion'))
  render()
  return {
    open: select,
    resetToday: () => {
      select('general')
    },
    sync: render,
    destroy: () => {
      topics.remove()
      panel.remove()
    },
  }
}
