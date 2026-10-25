import { poloEducation, POLO_TOPICS } from './education.ts'
import type { PoloTopic } from './education.ts'
import type { PoloSceneState } from './model.ts'

export function setupPoloEducation(
  root: HTMLElement,
  getState: () => PoloSceneState,
  onTopic: (topic: PoloTopic) => void,
  onClose: () => void,
): { open: (topic: PoloTopic) => void; destroy: () => void } {
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
  return {
    open,
    destroy: () => {
      dialog.close()
      dialog.remove()
      topics.remove()
    },
  }
}
