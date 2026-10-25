export type ButtonVariant = 'primary' | 'default' | 'quiet'

export function createButton(
  label: string,
  variant: ButtonVariant,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = buttonClass(variant)
  button.textContent = label
  return button
}

export function createButtonGroup(
  buttons: readonly HTMLButtonElement[],
): HTMLDivElement {
  const group = document.createElement('div')
  group.className = 'ls-actions'
  group.append(...buttons)
  return group
}

function buttonClass(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return 'ls-button ls-button-primary'
    case 'default':
      return 'ls-button'
    case 'quiet':
      return 'ls-button ls-button-quiet'
  }
}
