import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE } from './model.ts'
import type { PoloSceneState } from './model.ts'
import { poloHeatComparisonRows } from './heat-comparison.ts'

const heat: PoloSceneState = {
  ...INITIAL_POLO_STATE,
  confirmed: true,
  phase: 'M6',
  learnings: { heat: true },
}

describe('heat-only plan implications', () => {
  it('keeps benefits and added demands visible in either map view without scaling them to campus size', () => {
    const rows = poloHeatComparisonRows(heat)
    expect(rows).toEqual(
      poloHeatComparisonRows({ ...heat, preview: false, areaHa: 6 }),
    )
    expect(rows.some((row) => row.outcome === 'better')).toBe(true)
    expect(
      rows.filter((row) => row.outcome === 'worse').map((row) => row.id),
    ).toEqual(['electricity', 'investment'])
    expect(rows.some((row) => row.id === 'water')).toBe(false)
    expect(rows.some((row) => row.id === 'running-cost')).toBe(false)
    expect(rows.find((row) => row.id === 'backup')?.impact).toContain('remain')
    expect(rows.find((row) => row.id === 'land')?.outcome).toBe('unchanged')
  })

  it('does not attribute other selected concepts to heat or promise delivery without a heat user', () => {
    expect(
      poloHeatComparisonRows({ ...heat, learnings: { water: true } }),
    ).toEqual([])
    expect(
      poloHeatComparisonRows({
        ...heat,
        learnings: { heat: true, soil: true, water: true },
      }),
    ).toEqual(poloHeatComparisonRows(heat))
    const unavailable = poloHeatComparisonRows({
      ...heat,
      recipientAvailable: false,
    })
    expect(unavailable.find((row) => row.id === 'useful-heat')?.outcome).toBe(
      'unchanged',
    )
    expect(unavailable.some((row) => row.outcome === 'better')).toBe(false)
    expect(
      unavailable.find((row) => row.id === 'useful-heat')?.impact,
    ).toContain('No useful heat')
    expect(unavailable.find((row) => row.id === 'electricity')?.outcome).toBe(
      'unchanged',
    )
    expect(unavailable.find((row) => row.id === 'investment')?.outcome).toBe(
      'worse',
    )
  })
})
