import './summary.css'
import type { PoloSceneState } from './model.ts'
import { poloProjectSummary } from './project-summary.ts'

/** High-level original-plan comparison before the player proposes changes. */
export function appendPoloSummary(
  panel: HTMLElement,
  state: PoloSceneState,
  propose: () => void,
  closeButton?: HTMLButtonElement,
): void {
  const summary = poloProjectSummary(state)
  const make = (tag: string, text: string, className = ''): HTMLElement => {
    const node = document.createElement(tag)
    node.className = className
    node.textContent = text
    return node
  }
  const heading = make('h2', 'Summary')
  heading.tabIndex = -1
  const intro = make('div', '', 'polo-summary-intro')
  intro.append(heading)
  if (closeButton) intro.append(closeButton)
  panel.append(intro)
  const content = make('div', '', 'polo-summary-content')
  const metrics = make('div', '', 'polo-summary-metrics')
  for (const metric of summary.metrics) {
    const card = make('section', '', 'polo-summary-metric')
    card.dataset['metric'] = metric.id
    card.dataset['tone'] = metric.tone
    const header = make('div', '', 'polo-summary-metric-heading')
    const title = make('h3', `${metric.icon} ${metric.title}`)
    header.append(title, make('strong', metric.change, 'polo-summary-change'))
    const comparison = make('div', '', 'polo-summary-values')
    const value = (text: string): string =>
      metric.id === 'water'
        ? `${text}/year`
        : metric.id === 'drainage' && text !== 'Not assessed'
          ? `${text}/storm`
          : text
    const from = make('div', '', '')
    from.append(make('span', 'Today'), make('strong', value(metric.before)))
    const to = make('div', '', '')
    to.append(make('span', 'Operating'), make('strong', value(metric.after)))
    const arrow = make('span', '→', 'polo-summary-arrow')
    arrow.setAttribute('aria-hidden', 'true')
    comparison.append(from, arrow, to)
    card.append(header, comparison)
    metrics.append(card)
  }
  const details = document.createElement('details')
  details.className = 'polo-summary-details'
  details.append(make('summary', 'How these numbers compare'))
  details.append(
    make(
      'p',
      'Original campus compared with Today at the same selected area. These are educational model estimates; percentages use unrounded values. Green marks new computing capability; red marks more resource demand or less playing-field turf. These colors are not an overall project score.',
    ),
  )
  for (const metric of summary.metrics) {
    details.append(
      make('p', `${metric.title} (${metric.basis}): ${metric.note}`),
    )
    for (const source of metric.sources ?? []) {
      const link = document.createElement('a')
      link.href = source.url
      link.textContent = source.title
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      details.append(link)
    }
  }
  details.append(
    make(
      'p',
      'The scenario uses an evaporative cooling design and an area-proportional teaching model. These are not measurements or a validated forecast for Polo Fields. Sources remain available under More → Sources.',
    ),
  )
  content.append(metrics, details)
  const footer = make('div', '', 'polo-summary-footer')
  const action = document.createElement('button')
  action.type = 'button'
  action.className = 'is-primary'
  action.textContent = 'Improve the project →'
  action.addEventListener('click', propose)
  footer.append(action)
  panel.append(content, footer)
}
