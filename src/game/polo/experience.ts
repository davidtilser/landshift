import './experience.css'
import { ENVIRONMENTAL_LAYERS, poloImpact, poloSupport } from './impact.ts'
import type { EnvironmentalLayer } from './impact.ts'
import type { PoloSceneState } from './model.ts'
import type { PoloScene } from './scene.ts'
import { poloConstructionStarted } from './placement.ts'

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = '',
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  element.textContent = text
  return element
}

export function setupPoloExperience(
  root: HTMLElement,
  getState: () => PoloSceneState,
  getScene: () => PoloScene | undefined,
): { sync(): void; destroy(): void } {
  const studio = root.querySelector('.polo-studio') ?? root
  const panel = node('aside')
  panel.className = 'polo-impact-tools'
  panel.hidden = true
  panel.setAttribute('aria-label', 'Environmental layers and impact')
  const status = node('p')
  status.className = 'polo-support'
  status.setAttribute('role', 'status')
  const layerGroup = node('details')
  layerGroup.append(node('summary', 'Explore map layers'))
  const layerButtons = node('div')
  layerButtons.className = 'polo-layer-buttons'
  const note = node('p', 'Schematic routes · no surveyed utility connections')
  note.className = 'polo-layer-note'
  let layer: EnvironmentalLayer | null = null
  for (const value of ['water', 'electricity', 'land', 'heat'] as const) {
    const button = node('button', ENVIRONMENTAL_LAYERS[value])
    button.type = 'button'
    button.dataset['environmentLayer'] = value
    button.setAttribute('aria-pressed', 'false')
    button.addEventListener('click', () => {
      if (!poloConstructionStarted(getState())) return
      layer = layer === value ? null : value
      getScene()?.setEnvironmentalLayer(layer)
      sync()
    })
    layerButtons.append(button)
  }
  layerGroup.append(layerButtons, note)
  const results = node('button', 'Your impact →')
  results.type = 'button'
  results.className = 'polo-impact-open'
  panel.append(status, layerGroup, results)
  const dialog = node('dialog')
  dialog.className = 'polo-impact-dialog'
  dialog.setAttribute('aria-labelledby', 'polo-impact-title')
  const close = node('button', 'Close')
  close.type = 'button'
  close.className = 'polo-impact-close'
  close.addEventListener('click', () => {
    dialog.close()
  })
  const title = node('h2', 'Every choice has a trade-off.')
  title.id = 'polo-impact-title'
  const badge = node('p', 'Original plan → your view · same stage and location')
  const body = node('div')
  body.className = 'polo-impact-card'
  body.setAttribute('aria-live', 'polite')
  const progress = node('p')
  const navigation = node('nav')
  navigation.setAttribute('aria-label', 'Impact steps')
  const back = node('button', 'Back')
  const next = node('button', 'Next →')
  back.type = next.type = 'button'
  navigation.append(back, progress, next)
  dialog.append(close, node('img'), title, badge, body, navigation)
  const portrait = dialog.querySelector('img')
  if (portrait) {
    portrait.src = '/avatars/community-guide.png'
    portrait.alt = ''
    portrait.width = 72
    portrait.height = 72
  }
  let page = 0
  function renderResult(): void {
    const cards = poloImpact(getState())
    const card = cards[page]
    if (!card) return
    const values = node('div')
    values.className = 'polo-impact-values'
    const original = node('div')
    original.append(
      node('span', 'Original plan'),
      node('strong', card.baseline),
    )
    const current = node('div')
    current.append(node('span', 'Your view'), node('strong', card.current))
    values.append(original, current)
    body.replaceChildren(
      node('h3', card.title),
      values,
      node('p', card.detail),
      node('small', card.evidence),
    )
    progress.textContent = `${String(page + 1)} of ${String(cards.length)}`
    back.disabled = page === 0
    next.textContent = page === cards.length - 1 ? 'Back to map' : 'Next →'
  }
  back.addEventListener('click', () => {
    page = Math.max(0, page - 1)
    renderResult()
  })
  next.addEventListener('click', () => {
    if (page === poloImpact(getState()).length - 1) dialog.close()
    else {
      page++
      renderResult()
    }
  })
  results.addEventListener('click', () => {
    if (!poloConstructionStarted(getState())) return
    page = 0
    renderResult()
    dialog.showModal()
  })
  studio.append(panel, dialog)
  let previous = getState()
  let visited = new Set<string>()
  let pendingCompletion = false
  const observer = new MutationObserver(() => {
    if (pendingCompletion && root.dataset['poloAnimating'] !== 'true') sync()
  })
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['data-polo-animating'],
  })
  function sync(): void {
    const state = getState()
    panel.hidden = !poloConstructionStarted(state)
    layer = getScene()?.getEnvironmentalLayer() ?? null
    status.textContent = `Support ${String(poloSupport(state))}/100 · game index`
    status.title = 'Authored scenario points. Not a poll or public consent.'
    if (!poloConstructionStarted(state)) {
      visited = new Set()
      pendingCompletion = false
      layerGroup.open = false
      if (layer !== null) {
        getScene()?.setEnvironmentalLayer(null)
        layer = null
      }
      if (dialog.open) dialog.close()
    }
    for (const button of layerButtons.querySelectorAll('button'))
      button.setAttribute(
        'aria-pressed',
        String(button.dataset['environmentLayer'] === layer),
      )
    if (dialog.open) renderResult()
    const decision =
      state.confirmed &&
      state.phase === 'M6' &&
      state.preview &&
      state.proposal &&
      (previous.proposal !== state.proposal ||
        previous.phase !== state.phase ||
        !previous.preview)
    if (state.confirmed && state.phase === 'M6' && previous.phase !== 'M6')
      pendingCompletion = true
    if (state.phase !== 'M6') pendingCompletion = false
    const completion =
      pendingCompletion && root.dataset['poloAnimating'] !== 'true'
    const key = decision ? state.proposal : completion ? 'operation' : null
    const otherDialog = root.querySelector('dialog[open]')
    if (key && !visited.has(key) && (!otherDialog || otherDialog === dialog)) {
      visited.add(key)
      pendingCompletion = false
      page = 0
      renderResult()
      if (!dialog.open) dialog.showModal()
    }
    previous = { ...state, center: [...state.center] }
  }
  return {
    sync,
    destroy: () => {
      observer.disconnect()
      dialog.close()
      dialog.remove()
      panel.remove()
    },
  }
}
