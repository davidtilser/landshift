import { splitUiText, UI_TEXT_LIMIT } from '../ui-text.ts'
import { poloUsText } from './us-units.ts'

/** Keep complete explanations available in short, navigable steps. */
export const POLO_COPY_LIMIT = UI_TEXT_LIMIT

export function splitPoloCopy(text: string): string[] {
  return splitUiText(text)
    .map((part) => part.trim())
    .filter(Boolean)
}

export interface PoloCopyEntry {
  text: string
  href?: string
}

export function renderPoloCopySteps(
  host: HTMLElement,
  entries: readonly PoloCopyEntry[],
  label: string,
): void {
  const steps = entries.flatMap((entry) =>
    splitPoloCopy(entry.href ? entry.text : poloUsText(entry.text)).map(
      (text) => ({ ...entry, text }),
    ),
  )
  host.replaceChildren()
  if (!steps.length) return
  let index = 0
  const copy = document.createElement('p')
  copy.className = 'polo-reader-copy'
  copy.setAttribute('aria-live', 'polite')
  const source = document.createElement('a')
  source.className = 'polo-reader-source'
  source.textContent = 'Open source ↗'
  source.target = '_blank'
  source.rel = 'noopener noreferrer'
  const controls = document.createElement('div')
  controls.className = 'polo-reader-controls'
  controls.setAttribute('role', 'group')
  controls.setAttribute('aria-label', label)
  const back = document.createElement('button')
  back.type = 'button'
  back.textContent = '← Back'
  const count = document.createElement('span')
  const next = document.createElement('button')
  next.type = 'button'
  next.textContent = 'Next →'
  const render = (): void => {
    const step = steps[index]
    if (!step) return
    copy.textContent = step.text
    source.hidden = !step.href
    if (step.href) source.href = step.href
    else source.removeAttribute('href')
    count.textContent = `${String(index + 1)} of ${String(steps.length)}`
    back.disabled = index === 0
    next.disabled = index === steps.length - 1
    controls.hidden = steps.length === 1
  }
  back.addEventListener('click', () => {
    index = Math.max(0, index - 1)
    render()
  })
  next.addEventListener('click', () => {
    index = Math.min(steps.length - 1, index + 1)
    render()
  })
  controls.append(back, count, next)
  host.append(copy, source, controls)
  render()
}
