import { describe, expect, it } from 'vitest'
import { poloMapShortcut } from './map-shortcuts.ts'

const key = {
  key: 'w',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  isComposing: false,
  defaultPrevented: false,
}
const available = {
  setup: 'placement',
  editable: false,
  dialogOpen: false,
  communityOpen: false,
  protestPending: false,
}

const navigation = ['w', 'a', 's', 'd', 'i', 'o']

describe('Polo map keyboard policy', () => {
  it('uses I/O for zoom in either case and leaves other keys alone', () => {
    for (const value of ['i', 'I'])
      expect(poloMapShortcut({ ...key, key: value }, available)).toEqual({
        kind: 'zoom',
        inward: true,
      })
    for (const value of ['o', 'O'])
      expect(poloMapShortcut({ ...key, key: value }, available)).toEqual({
        kind: 'zoom',
        inward: false,
      })
    for (const value of ['ArrowLeft', 'ArrowRight', 'Tab', ' ', 'Enter'])
      expect(poloMapShortcut({ ...key, key: value }, available)).toBeNull()
  })

  it('moves the map with WASD without treating W/S as zoom', () => {
    const moves = [
      ['w', 0, 1],
      ['a', -1, 0],
      ['s', 0, -1],
      ['d', 1, 0],
    ] as const
    for (const [value, horizontal, vertical] of moves)
      for (const letter of [value, value.toUpperCase()])
        expect(poloMapShortcut({ ...key, key: letter }, available)).toEqual({
          kind: 'pan',
          horizontal,
          vertical,
        })
  })

  it('accepts repeated native key events while a key is held', () => {
    for (const value of navigation) {
      const event = { ...key, key: value }
      const repeated = { ...event, repeat: true }
      expect(poloMapShortcut(repeated, available)).toEqual(
        poloMapShortcut(event, available),
      )
    }
  })

  it('preserves modifier shortcuts, composition and already-handled keys', () => {
    for (const flag of [
      'ctrlKey',
      'metaKey',
      'altKey',
      'shiftKey',
      'isComposing',
      'defaultPrevented',
    ] as const)
      for (const value of navigation)
        expect(
          poloMapShortcut({ ...key, key: value, [flag]: true }, available),
        ).toBeNull()
  })

  it('protects editing, modal reading and community conversations', () => {
    for (const flag of [
      'editable',
      'dialogOpen',
      'communityOpen',
      'protestPending',
    ] as const)
      for (const value of navigation)
        expect(
          poloMapShortcut(
            { ...key, key: value },
            { ...available, [flag]: true },
          ),
        ).toBeNull()
  })

  it('waits for interactive placement, including before setup is initialized', () => {
    for (const setup of [undefined, 'intro', 'flying', ''])
      for (const value of navigation)
        expect(
          poloMapShortcut({ ...key, key: value }, { ...available, setup }),
        ).toBeNull()
    expect(poloMapShortcut(key, available)).toEqual({
      kind: 'pan',
      horizontal: 0,
      vertical: 1,
    })
  })
})
