import { describe, expect, it } from 'vitest'
import { movePoloReader } from './reader-navigation.ts'
import type { PoloReaderPosition } from './reader-navigation.ts'

const lengths = { general: 3, water: 2, electricity: 3, land: 3 }

describe('chapter reader navigation', () => {
  it('visits every step in topic order and reverses without losing a step', () => {
    let position: PoloReaderPosition = { tab: 'general', step: 0 }
    const visited = [position]
    for (let index = 0; index < 10; index++) {
      position = movePoloReader(position, 1, lengths)
      visited.push(position)
    }
    expect(visited).toEqual([
      { tab: 'general', step: 0 },
      { tab: 'general', step: 1 },
      { tab: 'general', step: 2 },
      { tab: 'water', step: 0 },
      { tab: 'water', step: 1 },
      { tab: 'electricity', step: 0 },
      { tab: 'electricity', step: 1 },
      { tab: 'electricity', step: 2 },
      { tab: 'land', step: 0 },
      { tab: 'land', step: 1 },
      { tab: 'land', step: 2 },
    ])
    for (const previous of visited.slice(0, -1).reverse()) {
      position = movePoloReader(position, -1, lengths)
      expect(position).toEqual(previous)
    }
  })

  it('stops at both chapter edges without changing its input', () => {
    const first = { tab: 'general', step: 0 } as const
    const last = { tab: 'land', step: 2 } as const
    expect(movePoloReader(first, -1, lengths)).toEqual(first)
    expect(movePoloReader(last, 1, lengths)).toEqual(last)
    expect(first).toEqual({ tab: 'general', step: 0 })
    expect(last).toEqual({ tab: 'land', step: 2 })
  })

  it('uses the same topic navigation for chapters with single-screen cards', () => {
    const single = { general: 1, water: 1, electricity: 1, land: 1 }
    expect(movePoloReader({ tab: 'water', step: 0 }, 1, single)).toEqual({
      tab: 'electricity',
      step: 0,
    })
    expect(movePoloReader({ tab: 'electricity', step: 0 }, -1, single)).toEqual(
      {
        tab: 'water',
        step: 0,
      },
    )
  })
})
