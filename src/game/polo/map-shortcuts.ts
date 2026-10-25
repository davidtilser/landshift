import './map-shortcuts.css'

interface PoloShortcutContext {
  setup: string | undefined
  editable: boolean
  dialogOpen: boolean
  communityOpen: boolean
  protestPending: boolean
  confirmAvailable?: boolean
  activationTarget?: boolean
}
type PoloShortcutKey = Pick<
  KeyboardEvent,
  | 'key'
  | 'ctrlKey'
  | 'metaKey'
  | 'altKey'
  | 'shiftKey'
  | 'isComposing'
  | 'defaultPrevented'
  | 'repeat'
>

export type PoloMapShortcut =
  | { kind: 'confirm' }
  | { kind: 'zoom'; inward: boolean }
  | { kind: 'pan'; horizontal: number; vertical: number }

/** A null result leaves the key entirely available to the current UI. */
export function poloMapShortcut(
  event: PoloShortcutKey,
  context: PoloShortcutContext,
): PoloMapShortcut | null {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey ||
    context.setup !== 'placement' ||
    context.editable ||
    context.dialogOpen ||
    context.communityOpen ||
    context.protestPending
  )
    return null
  const key = event.key.toLowerCase()
  switch (key) {
    case 'enter':
      return context.confirmAvailable &&
        !context.activationTarget &&
        !event.repeat
        ? { kind: 'confirm' }
        : null
    case 'i':
    case 'o':
      return { kind: 'zoom', inward: key === 'i' }
    case 'a':
    case 'd':
      return { kind: 'pan', horizontal: key === 'd' ? 1 : -1, vertical: 0 }
    case 'w':
    case 's':
      return { kind: 'pan', horizontal: 0, vertical: key === 'w' ? 1 : -1 }
    default:
      return null
  }
}

export function setupPoloMapShortcuts(
  root: HTMLElement,
  zoom: (inward: boolean) => void,
  pan: (horizontal: number, vertical: number) => void,
): { destroy: () => void } {
  const document = root.ownerDocument
  const view = document.defaultView
  if (!view) throw new Error('Map shortcuts need a browser window')
  const help = document.createElement('aside')
  help.className = 'polo-map-shortcuts'
  help.setAttribute('aria-label', 'Map keyboard shortcuts')
  help.innerHTML = `
    <span><span class="polo-map-key-group"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>Move map</span></span>
    <span><kbd>I</kbd><span>Zoom in</span></span>
    <span><kbd>O</kbd><span>Zoom out</span></span>
  `
  const studio = root.querySelector('.polo-studio') ?? root
  studio.append(help)

  const isEditable = (event: KeyboardEvent): boolean => {
    // composedPath also catches inputs inside shadow-root based controls.
    const targets = [...event.composedPath(), document.activeElement]
    return targets.some((target) => {
      if (!(target instanceof view.Element)) return false
      if (target.closest('input, textarea, select, [role="textbox"]'))
        return true
      if (target instanceof view.HTMLElement && target.isContentEditable)
        return true
      const editor = target.closest('[contenteditable]')
      return (
        editor !== null && editor.getAttribute('contenteditable') !== 'false'
      )
    })
  }
  const hasOpenModal = (): boolean => {
    if (document.querySelector('dialog[open]')) return true
    return Array.from(document.querySelectorAll('[aria-modal="true"]')).some(
      (modal) => {
        // Cesium keeps its credit lightbox mounted inside a hidden overlay.
        // Rects account for display:none on the modal or any ancestor.
        if (modal.getClientRects().length === 0) return false
        const visibility = view.getComputedStyle(modal).visibility
        return visibility !== 'hidden' && visibility !== 'collapse'
      },
    )
  }
  const onKeyDown = (event: KeyboardEvent): void => {
    const confirm = root.querySelector<HTMLButtonElement>(
      '.polo-placement-confirm',
    )
    const activationTarget = event
      .composedPath()
      .some(
        (target) =>
          target instanceof view.Element &&
          target.closest('button, a, summary, [role="button"]') !== null &&
          target.closest('.polo-placement-handle') === null,
      )
    const action = poloMapShortcut(event, {
      setup: root.dataset['poloSetup'],
      editable: isEditable(event),
      dialogOpen: hasOpenModal(),
      communityOpen:
        root.classList.contains('community-open') ||
        root.querySelector('.community-open') !== null,
      protestPending: root.dataset['poloProtestPending'] === 'true',
      confirmAvailable:
        event.key === 'Enter' &&
        confirm !== null &&
        !confirm.disabled &&
        confirm.getClientRects().length > 0 &&
        view.getComputedStyle(confirm).visibility === 'visible',
      activationTarget,
    })
    if (action === null) return
    event.preventDefault()
    // Held navigation keys follow native key repetition.
    if (action.kind === 'confirm') confirm?.click()
    else if (action.kind === 'zoom') zoom(action.inward)
    else pan(action.horizontal, action.vertical)
  }
  view.addEventListener('keydown', onKeyDown)
  let destroyed = false
  return {
    destroy: () => {
      if (destroyed) return
      destroyed = true
      view.removeEventListener('keydown', onKeyDown)
      help.remove()
    },
  }
}
