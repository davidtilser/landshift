/** Keep UI copy short without dropping any of the original conversation. */
export const UI_TEXT_LIMIT = 70

export function splitUiText(text: string, limit = UI_TEXT_LIMIT): string[] {
  if (!Number.isInteger(limit) || limit < 1)
    throw new RangeError('Text page size must be a positive integer.')
  const remaining = Array.from(text)
  const pages: string[] = []
  while (remaining.length > limit) {
    const candidate = remaining.slice(0, limit).join('')
    const boundaries = Array.from(candidate.matchAll(/[.!?][\s]+|\s+/gu))
    const sentence = boundaries.findLast(
      (match) => /[.!?]/u.test(match[0]) && match.index >= limit / 3,
    )
    const boundary = sentence ?? boundaries.at(-1)
    const length = boundary
      ? Array.from(candidate.slice(0, boundary.index + boundary[0].length))
          .length
      : limit
    pages.push(remaining.splice(0, length || limit).join(''))
  }
  if (remaining.length || !pages.length) pages.push(remaining.join(''))
  return pages
}

interface TextPageOptions {
  page?: number
  label?: string
  onPageChange?: (page: number) => void
}

/** Native controls and textContent keep model text accessible and inert. */
export function pagedUiText(
  text: string,
  className = '',
  options: TextPageOptions = {},
): HTMLElement {
  const pages = splitUiText(text)
  let page = Math.min(Math.max(options.page ?? 0, 0), pages.length - 1)
  const root = document.createElement('div')
  root.className = 'ui-paged-text ' + className
  const copy = document.createElement('p')
  copy.className = 'ui-page-copy'
  root.append(copy)
  const paintCopy = (): void => {
    copy.textContent = pages[page] ?? ''
  }
  paintCopy()
  if (pages.length < 2) return root
  const controls = document.createElement('div')
  controls.className = 'ui-page-controls'
  controls.setAttribute('role', 'group')
  controls.setAttribute('aria-label', options.label ?? 'Message pages')
  copy.setAttribute('aria-live', 'polite')
  copy.setAttribute('aria-atomic', 'true')
  const back = document.createElement('button')
  const next = document.createElement('button')
  const progress = document.createElement('span')
  back.type = next.type = 'button'
  back.textContent = '← Back'
  next.textContent = 'Next →'
  progress.className = 'ui-page-progress'
  const paintControls = (): void => {
    progress.textContent = `${String(page + 1)} of ${String(pages.length)}`
    // Keep both controls focusable so navigation never drops keyboard focus.
    back.setAttribute('aria-disabled', String(page === 0))
    next.setAttribute('aria-disabled', String(page === pages.length - 1))
  }
  const move = (direction: number): void => {
    const target = Math.min(Math.max(page + direction, 0), pages.length - 1)
    if (target === page) return
    page = target
    paintCopy()
    paintControls()
    options.onPageChange?.(page)
  }
  back.addEventListener('click', () => {
    move(-1)
  })
  next.addEventListener('click', () => {
    move(1)
  })
  controls.append(back, progress, next)
  root.append(controls)
  paintControls()
  return root
}
