import type { PoloLearning } from './learnings.ts'
import {
  POLO_LEARNING_BENEFITS,
  POLO_LEARNING_IMPACTS,
} from './learning-impact.ts'

function make(tag: string, text = '', className = ''): HTMLElement {
  const node = document.createElement(tag)
  node.textContent = text
  node.className = className
  return node
}

export function appendPoloLearningChoiceContent(
  card: HTMLButtonElement,
  item: PoloLearning,
  selected: boolean,
): void {
  const top = make('span', '', 'polo-learning-choice-top')
  top.append(
    make('span', item.icon),
    make('strong', item.title),
    make('span', selected ? '✓' : '+', 'polo-learning-check'),
  )

  const highlight = POLO_LEARNING_BENEFITS[item.id]
  const benefit = make('span', '', 'polo-learning-benefit')
  const label = make('span', '', 'polo-learning-benefit-label')
  label.append(
    make('span', highlight.label),
    make('span', highlight.context, 'polo-learning-benefit-context'),
  )
  benefit.append(
    make('strong', highlight.value, 'polo-learning-benefit-value'),
    label,
  )
  benefit.title = highlight.explanation

  const source = make('span', highlight.explanation)
  source.id = `polo-${item.id}-benefit-source`
  source.hidden = true
  card.setAttribute('aria-describedby', source.id)
  card.append(
    top,
    make('span', POLO_LEARNING_IMPACTS[item.id], 'polo-learning-impact'),
    benefit,
    make('span', item.tradeoff, 'polo-learning-tradeoff'),
    source,
  )
}
