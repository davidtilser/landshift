import { createButton } from './button.ts'

export function createFocusSpecimen(): HTMLDivElement {
  const specimen = document.createElement('div')
  specimen.className = 'ls-focus'
  const ring = document.createElement('span')
  ring.className = 'ls-focus-demo'
  ring.textContent = 'Focus ring'
  specimen.append(ring, createButton('Focus target', 'default'))
  return specimen
}
