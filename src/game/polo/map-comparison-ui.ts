import './map-comparison-ui.css'
import type { PoloSceneState } from './model.ts'

export function setupPoloMapComparison(
  host: HTMLElement,
  getState: () => PoloSceneState,
  onView: (preview: boolean) => void,
  onReturn: () => void,
): {
  setVisible(visible: boolean): void
  sync(): void
  focus(): void
  destroy(): void
} {
  const nav = document.createElement('nav')
  nav.className = 'polo-map-comparison'
  nav.setAttribute('aria-label', 'Compare plans on the map')
  nav.hidden = true

  const views = document.createElement('div')
  views.className = 'polo-map-comparison-views'
  views.setAttribute('role', 'group')
  views.setAttribute('aria-label', 'Plan shown on map')
  const viewButtons = new Map<boolean, HTMLButtonElement>()
  for (const [preview, label] of [
    [false, 'Current'],
    [true, 'Improved'],
  ] as const) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.dataset['view'] = String(preview)
    button.addEventListener('click', () => {
      onView(preview)
      sync()
    })
    viewButtons.set(preview, button)
    views.append(button)
  }

  const back = document.createElement('button')
  back.type = 'button'
  back.className = 'polo-map-comparison-back'
  back.textContent = 'Back to impact'
  back.addEventListener('click', onReturn)
  nav.append(views, back)
  host.append(nav)

  function sync(): void {
    const preview = getState().preview
    for (const [view, button] of viewButtons)
      button.setAttribute('aria-pressed', String(preview === view))
  }

  sync()
  return {
    setVisible(visible): void {
      nav.hidden = !visible
      if (visible) sync()
    },
    sync,
    focus(): void {
      if (!nav.hidden)
        viewButtons.get(getState().preview)?.focus({ preventScroll: true })
    },
    destroy(): void {
      nav.remove()
    },
  }
}
