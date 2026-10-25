import './colors.css'
import wordmarkUrl from '../design/landshift-wordmark.svg'

interface Token {
  name: string
  value: string
}

const root = document.querySelector('#app')
if (!(root instanceof HTMLElement)) {
  throw new Error('Missing #app container')
}

const tokens = readTokens()
const sources = tokens.filter((token) => token.name.startsWith('--ls-source-'))
const roles = tokens.filter(
  (token) =>
    !token.name.startsWith('--ls-source-') &&
    !token.name.startsWith('--ls-font-'),
)
const byName = new Map(tokens.map((token) => [token.name, token.value]))
const background = byName.get('--ls-bg') ?? '#131718'
const paper = byName.get('--ls-fg') ?? '#fcfcfc'

root.append(
  heading('Design system'),
  paragraph(
    'Source colors are the measured reference values. Roles are the text and control colors. A sample outlined in red is under 4.5:1. The page title is the wordmark. Menu, body, and other interface text use Fredoka.',
  ),
  heading('Type', 2),
  typeSpecimens(),
  heading('Sources', 2),
  swatchGrid(sources),
  heading('Roles', 2),
  roleList(roles),
)

function readTokens(): Token[] {
  const found: Token[] = []
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSStyleRule) || rule.selectorText !== ':root')
        continue
      for (let index = 0; index < rule.style.length; index += 1) {
        const name = rule.style.item(index)
        if (!name.startsWith('--ls-')) continue
        found.push({
          name,
          value: getComputedStyle(document.documentElement)
            .getPropertyValue(name)
            .trim(),
        })
      }
    }
  }
  return found
}

function typeSpecimens(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'type'
  const title = document.createElement('figure')
  title.className = 'type-title'
  const image = document.createElement('img')
  image.src = wordmarkUrl
  image.alt = 'Landshift'
  const caption = document.createElement('figcaption')
  caption.textContent = 'Page title'
  title.append(image, caption)
  const ui = document.createElement('p')
  ui.className = 'type-ui'
  ui.textContent = 'Menu and interface. The quick brown fox jumps.'
  section.append(title, ui)
  return section
}

function heading(text: string, level: 1 | 2 = 1): HTMLHeadingElement {
  const element = document.createElement(level === 1 ? 'h1' : 'h2')
  element.textContent = text
  return element
}

function paragraph(text: string): HTMLParagraphElement {
  const element = document.createElement('p')
  element.className = 'lede'
  element.textContent = text
  return element
}

function swatchGrid(items: Token[]): HTMLDivElement {
  const grid = document.createElement('div')
  grid.className = 'grid'
  for (const token of items) grid.append(swatch(token))
  return grid
}

function swatch(token: Token): HTMLElement {
  const figure = document.createElement('figure')
  figure.className = 'swatch'
  const chip = document.createElement('div')
  chip.className = 'chip'
  chip.style.background = token.value
  chip.setAttribute('role', 'img')
  chip.setAttribute('aria-label', `${token.name} ${token.value}`)
  const name = document.createElement('p')
  name.className = 'name'
  name.textContent = token.name.replace('--ls-source-', '')
  const hex = document.createElement('p')
  hex.className = 'hex'
  hex.textContent = token.value
  figure.append(chip, name, hex)
  return figure
}

function roleList(items: Token[]): HTMLDivElement {
  const list = document.createElement('div')
  list.className = 'roles'
  for (const token of items) list.append(roleRow(token))
  return list
}

function roleRow(token: Token): HTMLElement {
  const row = document.createElement('article')
  row.className = 'role'
  const chip = document.createElement('div')
  chip.className = 'chip'
  chip.style.background = token.value
  chip.setAttribute('role', 'img')
  chip.setAttribute('aria-label', `${token.name} ${token.value}`)
  const meta = document.createElement('div')
  meta.className = 'role-meta'
  const name = document.createElement('p')
  name.className = 'name'
  name.textContent = token.name
  const hex = document.createElement('p')
  hex.className = 'hex'
  hex.textContent = token.value
  const samples = document.createElement('div')
  samples.className = 'samples'
  samples.append(
    sample(token.value, background, 'On ground'),
    sample(token.value, paper, 'On paper'),
  )
  meta.append(name, hex, samples)
  row.append(chip, meta)
  return row
}

function sample(
  ink: string,
  surface: string,
  label: string,
): HTMLParagraphElement {
  const ratio = contrast(ink, surface)
  const element = document.createElement('p')
  element.className = ratio >= 4.5 ? 'sample' : 'sample fail'
  element.style.background = surface
  element.style.color = ink
  element.textContent = `${label} ${ratio.toFixed(2)}:1`
  return element
}

function contrast(ink: string, surface: string): number {
  const lighter = Math.max(luminance(ink), luminance(surface))
  const darker = Math.min(luminance(ink), luminance(surface))
  return (lighter + 0.05) / (darker + 0.05)
}

function luminance(color: string): number {
  const match = /^#([\da-f]{6})$/i.exec(color)
  if (!match?.[1]) return 0
  const hex = match[1]
  const channels = [0, 2, 4].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return (
    0.2126 * (channels[0] ?? 0) +
    0.7152 * (channels[1] ?? 0) +
    0.0722 * (channels[2] ?? 0)
  )
}
