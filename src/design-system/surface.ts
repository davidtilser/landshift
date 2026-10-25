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

function surfaceClass(tone: SurfaceTone): string {
  switch (tone) {
    case 'dark':
      return 'ls-system ls-system-dark'
    case 'light':
      return 'ls-system ls-system-light'
  }
}
