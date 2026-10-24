import { isSelectable, leafRegions } from '../../regions/regions.ts'
import { createOption } from './elements.ts'

export interface RegionList {
  element: HTMLElement
  /** Focuses the option for `regionId`; returns `false` when there is none. */
  focus(regionId: string): boolean
}

/**
 * Keyboard and screen reader alternative to the globe pills: every leaf region as a button.
 * It stays visually hidden until focus enters it, like a skip link.
 */
export function createRegionList(
  idPrefix: string,
  onSelect: (regionId: string) => void,
): RegionList {
  const heading = document.createElement('h2')
  heading.className = 'landing-subtitle'
  heading.id = `${idPrefix}-region-list-title`
  heading.textContent = 'Regions'

  const list = document.createElement('ul')
  list.className = 'landing-options'
  const buttons = new Map<string, HTMLButtonElement>()
  for (const region of leafRegions) {
    const option = createOption({
      idBase: `${idPrefix}-region-${region.id}`,
      label: region.label,
      description: null,
      enabled: isSelectable(region),
      onActivate: () => {
        onSelect(region.id)
      },
    })
    buttons.set(region.id, option.button)
    list.append(option.item)
  }

  const element = document.createElement('section')
  element.className = 'landing-region-list'
  element.setAttribute('aria-labelledby', heading.id)
  element.append(heading, list)

  return {
    element,
    focus(regionId: string): boolean {
      const button = buttons.get(regionId)
      if (!button) return false
      button.focus()
      return true
    },
  }
}
