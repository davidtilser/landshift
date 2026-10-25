export function createButton(
  label: string,
  className: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.textContent = label
  button.addEventListener('click', onClick)
  return button
}

export function createEdgeButton(
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  return createButton(label, 'ui-button landing-edge-button', onClick)
}

export function createBackButton(onClick: () => void): HTMLButtonElement {
  const button = createButton('Back', 'ui-button ui-button-quiet', onClick)
  const arrow = document.createElement('span')
  arrow.setAttribute('aria-hidden', 'true')
  arrow.textContent = '←'
  button.prepend(arrow)
  button.classList.add('landing-back')
  return button
}

let contributorDialogCount = 0

/** A modal listing people. Escape and the backdrop both dismiss it. */
export function createContributorDialog(
  names: readonly string[],
): HTMLDialogElement {
  contributorDialogCount += 1
  const title = document.createElement('h2')
  title.id = `contributor-dialog-title-${String(contributorDialogCount)}`
  title.textContent = 'Our team'

  const dialog = document.createElement('dialog')
  dialog.className = 'landing-team-dialog'
  dialog.setAttribute('aria-labelledby', title.id)

  const close = createButton('Close', 'ui-button ui-button-quiet', () => {
    dialog.close()
  })
  const header = document.createElement('div')
  header.className = 'landing-team-dialog-header'
  header.append(title, close)

  const list = document.createElement('ul')
  for (const name of names) {
    const item = document.createElement('li')
    item.textContent = name
    list.append(item)
  }

  const body = document.createElement('div')
  body.className = 'landing-team-dialog-body'
  body.append(header, list)
  dialog.append(body)

  let pressedBackdrop = false
  dialog.addEventListener('pointerdown', (event) => {
    pressedBackdrop = event.target === dialog
  })
  dialog.addEventListener('click', (event) => {
    if (pressedBackdrop && event.target === dialog) dialog.close()
    pressedBackdrop = false
  })
  return dialog
}

export function createTitle(
  text: string,
  className: string,
): HTMLHeadingElement {
  const title = document.createElement('h1')
  title.className = className
  title.textContent = text
  return title
}

function createSpan(
  text: string,
  className: string,
  id: string,
): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = className
  span.id = id
  span.textContent = text
  return span
}

export interface OptionSpec {
  /** Prefix for the ids that label and describe the option. */
  idBase: string
  label: string
  description: string | null
  enabled: boolean
  onActivate: () => void
}

export interface Option {
  item: HTMLLIElement
  button: HTMLButtonElement
}

/** A list option that stays focusable when disabled, so it can still announce that it is not unlocked. */
export function createOption(spec: OptionSpec): Option {
  const label = createSpan(
    spec.label,
    'landing-option-label',
    `${spec.idBase}-label`,
  )
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'landing-option'
  button.setAttribute('aria-labelledby', label.id)
  button.append(label)

  const describedBy: string[] = []
  if (!spec.enabled) {
    const badge = createSpan(
      'Not unlocked',
      'landing-badge',
      `${spec.idBase}-status`,
    )
    button.append(badge)
    button.setAttribute('aria-disabled', 'true')
    describedBy.push(badge.id)
  }
  if (spec.description !== null) {
    const description = createSpan(
      spec.description,
      'landing-option-summary',
      `${spec.idBase}-summary`,
    )
    button.append(description)
    describedBy.push(description.id)
  }
  if (describedBy.length > 0) {
    button.setAttribute('aria-describedby', describedBy.join(' '))
  }
  button.addEventListener('click', () => {
    if (spec.enabled) spec.onActivate()
  })

  const item = document.createElement('li')
  item.append(button)
  return { item, button }
}
