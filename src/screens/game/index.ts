import { findRegion } from '../../regions/regions.ts'
import '../../ui/ui.css'

export function mountGame(root: HTMLElement, regionId: string): void {
  const label = findRegion(regionId)?.label ?? regionId

  const heading = document.createElement('h1')
  heading.tabIndex = -1
  heading.textContent = `Game coming soon for ${label}`

  const back = document.createElement('button')
  back.type = 'button'
  back.className = 'ui-button'
  back.textContent = 'Back to globe'
  back.addEventListener('click', () => {
    window.location.reload()
  })

  const view = document.createElement('main')
  view.className = 'ui-centered-view'
  view.append(heading, back)
  root.replaceChildren(view)
  heading.focus()
}
