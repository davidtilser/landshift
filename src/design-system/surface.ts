import { createButton, createButtonGroup } from './button.ts'
import { createStatus } from './status.ts'
import type { StatusRole } from './status.ts'

export type SurfaceTone = 'dark' | 'light'

/** Dark is the landing sheet. Light is the paper sheet. The tone sets the role tokens. */
export function createSurface(
  tone: SurfaceTone,
  children: readonly Node[],
): HTMLElement {
  const surface = document.createElement('section')
  surface.className = surfaceClass(tone)
  surface.append(...children)
  return surface
}

/** A panel above the page. Reads --ls-role-panel. */
export function createPanel(children: readonly Node[]): HTMLElement {
  const panel = document.createElement('section')
  panel.className = 'ls-panel'
  panel.append(...children)
  return panel
}

/** A well below the panel. Reads --ls-role-inset. */
export function createInset(children: readonly Node[]): HTMLElement {
  const inset = document.createElement('div')
  inset.className = 'ls-inset'
  inset.append(...children)
  return inset
}

/** Page, panel, raised, inset, overlay, and scrim for one tone. */
export function createDepthStack(tone: SurfaceTone): HTMLElement {
  const stack = document.createElement('div')
  stack.className = 'ls-stack'
  const pageLabel = document.createElement('p')
  pageLabel.className = 'ls-label'
  pageLabel.textContent = 'Page'
  const scrimLabel = document.createElement('p')
  scrimLabel.className = 'ls-label'
  scrimLabel.textContent = 'Scrim'
  const overlay = document.createElement('div')
  overlay.className = 'ls-overlay'
  const overlayTitle = document.createElement('p')
  overlayTitle.className = 'ls-title'
  overlayTitle.textContent = 'Overlay'
  overlay.append(overlayTitle)
  const dialog = document.createElement('div')
  dialog.className = 'ls-dialog'
  const scrim = document.createElement('div')
  scrim.className = 'ls-scrim'
  dialog.append(scrim, overlay)
  const statuses = document.createElement('div')
  statuses.className = 'ls-statuses'
  statuses.append(
    ...statusMarks().map((mark) => createStatus(mark.role, mark.label)),
  )
  stack.append(
    pageLabel,
    createPanel([
      layerTitle('Panel'),
      layerRow([
        raisedLayer(),
        createInset([layerLabel('Inset'), layerBody('Sits below the panel.')]),
      ]),
    ]),
    scrimLabel,
    dialog,
    statuses,
  )
  const root = document.createElement('section')
  root.className = depthClass(tone)
  root.append(stack)
  return root
}

function surfaceClass(tone: SurfaceTone): string {
  switch (tone) {
    case 'dark':
      return 'ls-system ls-system-dark'
    case 'light':
      return 'ls-system ls-system-light'
  }
}

function depthClass(tone: SurfaceTone): string {
  switch (tone) {
    case 'dark':
      return 'ls-depth ls-system-dark'
    case 'light':
      return 'ls-depth ls-system-light'
  }
}

function raisedLayer(): HTMLElement {
  const raised = document.createElement('div')
  raised.className = 'ls-raised'
  raised.append(
    layerLabel('Raised'),
    createButtonGroup([
      createButton('Primary', 'primary'),
      createButton('Selected', 'selected'),
    ]),
  )
  return raised
}

function layerRow(children: readonly Node[]): HTMLElement {
  const row = document.createElement('div')
  row.className = 'ls-layer-row'
  row.append(...children)
  return row
}

function layerTitle(text: string): HTMLParagraphElement {
  const title = document.createElement('p')
  title.className = 'ls-title'
  title.textContent = text
  return title
}

function layerLabel(text: string): HTMLParagraphElement {
  const label = document.createElement('p')
  label.className = 'ls-label'
  label.textContent = text
  return label
}

function layerBody(text: string): HTMLParagraphElement {
  const body = document.createElement('p')
  body.className = 'ls-body'
  body.textContent = text
  return body
}

function statusMarks(): readonly { role: StatusRole; label: string }[] {
  return [
    { role: 'good', label: 'Good' },
    { role: 'caution', label: 'Caution' },
    { role: 'money', label: 'Money' },
    { role: 'angry', label: 'Angry' },
    { role: 'live', label: 'Live' },
    { role: 'water', label: 'Water' },
    { role: 'amber', label: 'Amber' },
    { role: 'community-green', label: 'Community green' },
    { role: 'community-blue', label: 'Community blue' },
    { role: 'community-purple', label: 'Community purple' },
    { role: 'planner', label: 'Planner' },
    { role: 'character', label: 'Character' },
    { role: 'player', label: 'Player' },
  ]
}
