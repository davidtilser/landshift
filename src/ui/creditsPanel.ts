import { credits, type Credit } from '../credits/credits.ts'
import './ui.css'

let panelCount = 0

function renderCredit(credit: Credit): HTMLLIElement {
  const link = document.createElement('a')
  link.href = credit.url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.textContent = credit.label

  const meta = document.createElement('span')
  meta.className = 'credits-panel-meta'
  meta.textContent = `${credit.holder}. ${credit.license}.`

  const item = document.createElement('li')
  item.append(link, meta)
  return item
}

/** Appends a "Credits" button and its modal panel to `container`. Returns a cleanup function. */
export function mountCreditsPanel(container: HTMLElement): () => void {
  panelCount += 1

  const glyph = document.createElement('span')
  glyph.setAttribute('aria-hidden', 'true')
  glyph.textContent = 'i'

  const name = document.createElement('span')
  name.className = 'ui-visually-hidden'
  name.textContent = 'Credits'

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'ui-icon-button'
  toggle.setAttribute('aria-haspopup', 'dialog')
  toggle.append(glyph, name)

  const title = document.createElement('h2')
  title.id = `credits-panel-title-${String(panelCount)}`
  title.textContent = 'Credits'

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'ui-button ui-button-quiet'
  close.textContent = 'Close'

  const header = document.createElement('div')
  header.className = 'credits-panel-header'
  header.append(title, close)

  const list = document.createElement('ul')
  list.append(...credits.map(renderCredit))

  const body = document.createElement('div')
  body.className = 'credits-panel-body'
  body.append(header, list)

  const dialog = document.createElement('dialog')
  dialog.className = 'credits-panel'
  dialog.setAttribute('aria-labelledby', title.id)
  dialog.append(body)

  toggle.addEventListener('click', () => {
    dialog.showModal()
  })
  close.addEventListener('click', () => {
    dialog.close()
  })

  // The dialog has no padding, so only the backdrop targets it; a drag that ends there must not close it.
  let pressedBackdrop = false
  dialog.addEventListener('pointerdown', (event) => {
    pressedBackdrop = event.target === dialog
  })
  dialog.addEventListener('click', (event) => {
    if (pressedBackdrop && event.target === dialog) dialog.close()
    pressedBackdrop = false
  })
  dialog.addEventListener('close', () => {
    toggle.focus()
  })

  container.append(toggle, dialog)

  return () => {
    if (dialog.open) dialog.close()
    toggle.remove()
    dialog.remove()
  }
}
