import { describe, expect, it } from 'vitest'
import { splitUiText, UI_TEXT_LIMIT } from './ui-text.ts'

describe('short UI text pages', () => {
  it('keeps short copy on one page, including the exact limit', () => {
    expect(splitUiText('Meet your neighbors.')).toEqual([
      'Meet your neighbors.',
    ])
    expect(splitUiText('x'.repeat(UI_TEXT_LIMIT))).toEqual([
      'x'.repeat(UI_TEXT_LIMIT),
    ])
    expect(splitUiText('')).toEqual([''])
  })

  it('preserves the complete original conversation and whitespace', () => {
    const text =
      'This park is where we meet, walk and play.\n\nA new cooling system cannot replace that space.  What should we compare next?'
    const pages = splitUiText(text)
    expect(pages.length).toBeGreaterThan(1)
    expect(pages.join('')).toBe(text)
    expect(
      pages.every((page) => Array.from(page).length <= UI_TEXT_LIMIT),
    ).toBe(true)
    expect(pages[0]).toBe('This park is where we meet, walk and play.\n\n')
  })

  it('uses word boundaries when a full sentence does not fit', () => {
    const pages = splitUiText(
      'Neighbors need a chance to compare the water and power effects before choosing where to build',
    )
    expect(pages).toEqual([
      'Neighbors need a chance to compare the water and power effects before ',
      'choosing where to build',
    ])
  })

  it('handles generated long tokens and emoji without dropping characters', () => {
    const text = '🌱'.repeat(73) + ' ' + 'z'.repeat(163)
    const pages = splitUiText(text)
    expect(pages.join('')).toBe(text)
    expect(
      pages.every((page) => Array.from(page).length <= UI_TEXT_LIMIT),
    ).toBe(true)
    expect(pages.some((page) => /[\uD800-\uDBFF]$/u.test(page))).toBe(false)
    expect(pages.some((page) => /^[\uDC00-\uDFFF]/u.test(page))).toBe(false)
  })

  it('preserves model markup as literal copy for safe textContent rendering', () => {
    const text = '<img src=x onerror="alert(1)"> ' + 'Example. '.repeat(20)
    expect(splitUiText(text).join('')).toBe(text)
  })

  it('rejects invalid page limits instead of hanging', () => {
    for (const limit of [0, -1, 1.2, Infinity, NaN])
      expect(() => splitUiText('A message', limit)).toThrow(RangeError)
    expect(splitUiText('abc', 1)).toEqual(['a', 'b', 'c'])
  })
})
