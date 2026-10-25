import './heat-comparison.css'
import type { PoloSceneState } from './model.ts'
import { POLO_HEAT_IMPACT_EXAMPLE } from './learning-impact.ts'

type HeatOutcome = 'better' | 'worse' | 'unchanged'

export interface PoloHeatComparisonRow {
  id: string
  label: string
  outcome: HeatOutcome
  impact: string
}

/** Heat alone: do not attribute another selected idea's effects to this loop. */
export function poloHeatComparisonRows(
  state: PoloSceneState,
): PoloHeatComparisonRow[] {
  if (!state.learnings?.heat) return []
  return [
    {
      id: 'useful-heat',
      label: 'Useful heating',
      outcome: state.recipientAvailable ? 'better' : 'unchanged',
      impact: state.recipientAvailable
        ? 'Recovered heat could cover part of the proposed pool’s heating.'
        : 'No useful heat is delivered while no heat user is available.',
    },
    {
      id: 'electricity',
      label: 'Recovery electricity',
      outcome: state.recipientAvailable ? 'worse' : 'unchanged',
      impact: state.recipientAvailable
        ? 'Heat pump, pumps and controls add electricity demand.'
        : 'Heat recovery waits until a heat user is available.',
    },
    {
      id: 'investment',
      label: 'Upfront investment',
      outcome: 'worse',
      impact:
        'Extra equipment, pipework and installation increase upfront cost.',
    },
  ]
}

const OUTCOME_LABELS: Record<HeatOutcome, string> = {
  better: '↗ Better',
  worse: '↘ Worse',
  unchanged: '= Unchanged',
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = '',
  className = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.textContent = text
  node.className = className
  return node
}

export function appendPoloHeatComparison(
  parent: HTMLElement,
  state: PoloSceneState,
): void {
  const rows = poloHeatComparisonRows(state)
  if (!rows.length) return
  const section = element('section', '', 'polo-heat-comparison')
  section.setAttribute('aria-label', 'Heat reuse benefits and trade-offs')
  const list = element('div', '', 'polo-heat-comparison-rows')
  for (const row of rows) {
    const card = element('article', '', 'polo-heat-comparison-row')
    card.dataset['outcome'] = row.outcome
    const heading = element('div', '', 'polo-heat-comparison-heading')
    const outcome = element(
      'span',
      OUTCOME_LABELS[row.outcome],
      'polo-heat-comparison-outcome',
    )
    heading.append(element('h4', row.label), outcome)
    card.append(heading, element('p', row.impact))
    list.append(card)
  }
  const example = POLO_HEAT_IMPACT_EXAMPLE
  const reference = element('div', '', 'polo-heat-comparison-reference')
  reference.title = example.recipients
  reference.append(
    element('h4', `Two-building teaching example · ${String(example.year)}`),
    element(
      'p',
      'Assumed demand and connections; separate from the map’s pool.',
    ),
  )
  const figures = element('dl', '', 'polo-heat-comparison-figures')
  for (const [label, value, context, tone] of [
    [
      'Heat delivered',
      `+${example.usefulHeatMWhYear}`,
      'MWh thermal/year',
      'gain',
    ],
    [
      'Heating covered',
      `${String(example.coveragePercent)}%`,
      `of ${String(example.demandMWhYear)} MWh thermal/year`,
      'gain',
    ],
    [
      'Recovery electricity',
      `+${example.addedElectricityMWhYear}`,
      'MWh electric/year',
      'demand',
    ],
  ]) {
    const figure = element('div')
    figure.dataset['tone'] = tone
    figure.append(element('dt', label))
    const valueNode = element('dd', value)
    valueNode.append(element('span', context))
    figure.append(valueNode)
    figures.append(figure)
  }
  reference.append(figures)
  section.append(list, reference)
  parent.append(section)
}
