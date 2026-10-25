import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE, POLO_PHASES, POLO_PROPOSALS } from './model.ts'
import { poloImpact, poloSupport } from './impact.ts'

describe('Polo impact comparison', () => {
  it('compares each proposal with the same operating baseline', () => {
    const state = {
      ...INITIAL_POLO_STATE,
      confirmed: true,
      phase: 'M6' as const,
    }
    const baseline = poloImpact(state)
    for (const proposal of POLO_PROPOSALS) {
      const result = poloImpact({ ...state, proposal })
      expect(result.map((item) => item.baseline)).toEqual(
        baseline.map((item) => item.baseline),
      )
      expect(
        result.find((item) => item.title === 'Public turf lost')?.current,
      ).toBe(
        baseline.find((item) => item.title === 'Public turf lost')?.current,
      )
      expect(result.find((item) => item.title === 'Electricity')?.current).toBe(
        'Not quantified',
      )
    }
  })
  it('never rewards an inactive heat recipient or comparison preview', () => {
    const heat = {
      ...INITIAL_POLO_STATE,
      confirmed: true,
      phase: 'M6' as const,
      proposal: 'heat_reuse_neighbors' as const,
    }
    expect(poloSupport(heat)).toBe(18)
    expect(poloSupport({ ...heat, recipientAvailable: false })).toBe(12)
    expect(poloSupport({ ...heat, preview: false })).toBe(12)
    expect(poloImpact({ ...heat, recipientAvailable: false })[3]?.current).toBe(
      'No delivery',
    )
  })
  it('keeps opposition high at announcement and through every stage', () => {
    for (const phase of POLO_PHASES) {
      expect(
        poloSupport({ ...INITIAL_POLO_STATE, confirmed: true, phase }),
      ).toBeLessThan(25)
    }
    expect(poloSupport(INITIAL_POLO_STATE)).toBe(16)
  })
  it('keeps every impact text block within seventy characters', () => {
    for (const phase of POLO_PHASES)
      for (const proposal of [null, ...POLO_PROPOSALS]) {
        for (const card of poloImpact({
          ...INITIAL_POLO_STATE,
          confirmed: true,
          phase,
          proposal,
        })) {
          for (const key of [
            'title',
            'baseline',
            'current',
            'detail',
            'evidence',
          ] as const)
            expect(card[key].length).toBeLessThanOrEqual(70)
        }
      }
  })
})

describe('size-aware same-stage impact comparison', () => {
  it('uses the selected size for Today irrigation and operating demand', () => {
    const today = poloImpact({ ...INITIAL_POLO_STATE, areaHa: 6 })
    expect(
      today.find((card) => card.title === 'Irrigation allowance')?.baseline,
    ).toBe('4.8M US gal/year')
    for (const areaHa of [2, 6]) {
      const operating = poloImpact({
        ...INITIAL_POLO_STATE,
        areaHa,
        confirmed: true,
        phase: 'M6',
        proposal: null,
      })
      expect(
        operating.find((card) => card.title === 'Water supply')?.baseline,
      ).toBe(areaHa === 2 ? '15.1M US gal/year' : '45.3M US gal/year')
      expect(
        operating.find((card) => card.title === 'Public turf lost')?.baseline,
      ).toBe(areaHa === 2 ? '4 acres' : '12 acres')
      for (const card of operating.slice(0, 3)) {
        expect(card.current).toBe(card.baseline)
        expect(card.evidence).toContain('Area-proportional')
      }
    }
  })
})
