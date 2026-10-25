import type { LatLng, Region } from '../../regions/regions.ts'
import { isPlayableIn, scenariosForRegion } from '../../scenarios/scenarios.ts'
import {
  createBackButton,
  createButton,
  createOption,
  createTitle,
} from './elements.ts'

export const LOAD_FAILED_MESSAGE = 'The game could not load.'

export interface RegionCardOptions {
  region: Region
  idPrefix: string
  /** Scenario whose handoff just failed; the card then offers a retry. */
  failedScenarioId: string | null
  onBack: () => void
  onStart: (scenarioId: string) => void
  /** Fired while the pointer is over an enabled scenario row; `null` when it leaves. */
  onScenarioHover: (location: LatLng | null) => void
}

export interface RegionCard {
  parts: HTMLElement[]
  /** Where focus belongs when the card opens: the retry after a failure, otherwise the title. */
  focusTarget: HTMLElement
}

function createScenarioList(
  region: Region,
  idPrefix: string,
  labelledBy: string,
  onStart: (scenarioId: string) => void,
  onHover: (location: LatLng | null) => void,
): HTMLElement {
  const available = scenariosForRegion(region.id)
  if (available.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'landing-summary'
    empty.textContent = 'No scenarios yet for this region.'
    return empty
  }
  const list = document.createElement('ul')
  list.className = 'landing-options'
  list.setAttribute('aria-labelledby', labelledBy)
  for (const scenario of available) {
    const enabled = isPlayableIn(scenario, region.id)
    const option = createOption({
      idBase: `${idPrefix}-scenario-${scenario.id}`,
      label: scenario.label,
      description: scenario.summary,
      enabled,
      onActivate: () => {
        onStart(scenario.id)
      },
    })
    if (enabled) {
      option.button.addEventListener('pointerenter', () => {
        onHover(scenario.location)
      })
      option.button.addEventListener('pointerleave', () => {
        onHover(null)
      })
    }
    list.append(option.item)
  }
  return list
}

/** The brief shown when a region is selected: name, summary, and its scenarios. */
export function createRegionCard(options: RegionCardOptions): RegionCard {
  const { region, idPrefix, failedScenarioId, onStart, onScenarioHover } =
    options

  const title = createTitle(region.label, 'landing-title')
  title.tabIndex = -1
  const parts: HTMLElement[] = [createBackButton(options.onBack), title]

  if (region.summary !== null) {
    const summary = document.createElement('p')
    summary.className = 'landing-summary'
    summary.textContent = region.summary
    parts.push(summary)
  }

  let focusTarget: HTMLElement = title
  if (failedScenarioId !== null) {
    const message = document.createElement('p')
    message.className = 'landing-error'
    message.textContent = LOAD_FAILED_MESSAGE
    const retry = createButton(
      'Try again',
      'ui-button ui-button-primary',
      () => {
        onStart(failedScenarioId)
      },
    )
    const reload = createButton('Reload', 'ui-button', () => {
      window.location.reload()
    })
    const actions = document.createElement('div')
    actions.className = 'landing-actions'
    actions.append(retry, reload)
    parts.push(message, actions)
    focusTarget = retry
  }

  const heading = document.createElement('h2')
  heading.className = 'landing-subtitle'
  heading.id = `${idPrefix}-scenarios-title`
  heading.textContent = 'Choose a scenario'
  parts.push(
    heading,
    createScenarioList(region, idPrefix, heading.id, onStart, onScenarioHover),
  )

  return { parts, focusTarget }
}
