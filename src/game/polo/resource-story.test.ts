import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE, POLO_PHASES, POLO_PROPOSALS } from './model.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'
import { POLO_BASELINE } from './baseline.ts'
import { poloChapterCard } from './today.ts'
import {
  poloElectricityStory,
  poloRainStory,
  poloResourceQuantities,
  poloWaterStory,
} from './resource-story.ts'

const state = (phase: PoloPhase, areaHa = 4): PoloSceneState => ({
  ...INITIAL_POLO_STATE,
  confirmed: true,
  phase,
  areaHa,
})

describe('water and electricity chapter story', () => {
  it('keeps shared project water separate from commissioning and annual supply', () => {
    const quantities = poloResourceQuantities(state('M6'))
    expect(quantities.projectWaterM3).toBe(3828)
    expect(quantities.commissioningWaterM3).toBe(215)
    expect(quantities.operatingWaterM3Year).toBe(114195)
    expect(quantities.irrigationM3Year).toBe(12000)
    expect(
      POLO_PHASES.map((phase) => poloWaterStory(state(phase)).value),
    ).toEqual([
      '3.2M US gal/year',
      '1.0M US gal',
      '1.0M US gal',
      '57k US gal',
      '30.2M US gal/year',
    ])
    expect(poloWaterStory(state('M4')).comparison.value).toBe('Same budget')
    expect(poloWaterStory(state('M5')).comparison.value).toBe(
      'Part of the budget',
    )
    expect(poloWaterStory(state('M6')).comparison.value).toBe('9.5×')
  })

  it('compares model days using unrounded energy and a named nonzero reference', () => {
    expect(
      POLO_PHASES.map((phase) => poloElectricityStory(state(phase)).value),
    ).toEqual([
      '0 kWh/day',
      '240 kWh/workday',
      '240 kWh/workday',
      '2 MWh/test day',
      '288 MWh/day',
    ])
    expect(poloElectricityStory(state('M0')).label).toBe(
      'Added data-centre electricity',
    )
    expect(poloElectricityStory(state('M5')).comparison.value).toBe('8.3×')
    expect(poloElectricityStory(state('M6')).comparison).toEqual({
      value: '1,200×',
      label: 'The selected construction workday',
    })
    expect(poloElectricityStory(state('M6')).details.join(' ')).toContain(
      '144×',
    )
    expect(POLO_BASELINE.reference.existingParkElectricityKWhYear).toBeNull()
    expect(
      POLO_BASELINE.phases.find((phase) => phase.id === 'M1')?.data.workdays,
    ).toBeNull()
  })

  it('scales every water and energy quantity with area and preserves ratios', () => {
    const reference = poloResourceQuantities(state('M6'))
    for (const areaHa of [2, 2.5, 6]) {
      const quantities = poloResourceQuantities(state('M6', areaHa))
      for (const key of [
        'irrigationM3Year',
        'projectWaterM3',
        'commissioningWaterM3',
        'operatingWaterM3Year',
        'workdayKWh',
        'testDayKWh',
        'operatingDayKWh',
      ] as const)
        expect(quantities[key]).toBeCloseTo((reference[key] * areaHa) / 4)
      expect(poloWaterStory(state('M6', areaHa)).comparison.value).toBe('9.5×')
      expect(poloElectricityStory(state('M6', areaHa)).comparison.value).toBe(
        '1,200×',
      )
    }
    expect(poloWaterStory(state('M6', 2)).value).toBe('15.1M US gal/year')
    expect(poloElectricityStory(state('M6', 6)).value).toBe('432 MWh/day')
  })

  it('keeps rain as one separate event and subtracts tank capture just once', () => {
    expect(poloRainStory(state('M0')).value).toBe('142k US gal to drainage')
    const completed = poloRainStory(state('M6'))
    expect(completed.value).toBe('585k US gal to drainage')
    expect(completed.comparison).toContain('4.1×')
    expect(poloRainStory(state('M1')).value).toBeNull()
    expect(poloRainStory(state('M1')).comparison).toContain('not quantified')
    const quantities = poloResourceQuantities(state('M6'))
    expect(poloResourceQuantities({ ...state('M6'), rain: true })).toEqual(
      quantities,
    )
    for (const phase of [...POLO_PHASES, ...POLO_PHASES.toReversed()]) {
      const result = poloResourceQuantities(state(phase))
      expect(result.projectWaterM3).toBe(3828)
      expect(result.operatingWaterM3Year).toBe(114195)
    }
  })

  it('keeps proposal previews qualitative across all inline tabs', () => {
    for (const proposal of POLO_PROPOSALS)
      for (const topic of [
        'general',
        'water',
        'electricity',
        'land',
      ] as const) {
        const card = poloChapterCard(
          { ...state('M6'), preview: true, proposal },
          topic,
        )
        expect(card.metrics).toEqual([])
        expect(card.comparison?.label).toContain('savings not calculated')
        expect(card.rain).toBeUndefined()
        const original = poloChapterCard(
          { ...state('M6'), preview: false, proposal },
          topic,
        )
        expect(original.metrics.length).toBeGreaterThan(0)
      }
  })

  it('keeps changed-build outcomes qualitative and puts original figures in details', () => {
    for (const phase of ['M1', 'M4', 'M5', 'M6'] as const)
      for (const topic of [
        'general',
        'water',
        'electricity',
        'land',
      ] as const) {
        const original = poloChapterCard(state(phase), topic)
        const changed = poloChapterCard(
          {
            ...state(phase),
            improvements: { soil: true, foundation: true, grounds: true },
          },
          topic,
        )
        expect(changed.metrics).toHaveLength(1)
        expect(changed.metrics[0]?.value).toBe('Not recalculated')
        expect(changed.rain).toBeUndefined()
        expect(changed.details.join(' ')).toContain(
          'not calculated outcomes or savings from your changes',
        )
        for (const metric of original.metrics)
          expect(changed.details.join(' ')).toContain(
            metric.label + ': ' + metric.value,
          )
        expect(changed.details.join(' ')).toContain('Protect this green strip')
      }
  })

  it('keeps construction changes qualitative when also previewing an operating idea', () => {
    for (const proposal of POLO_PROPOSALS) {
      const card = poloChapterCard(
        {
          ...state('M6'),
          preview: true,
          proposal,
          improvements: { foundation: true },
        },
        'water',
      )
      expect(card.metrics[0]?.value).toBe('Not recalculated')
      expect(card.details.join(' ')).toContain('30.2M US gal/year')
      expect(card.details.join(' ')).toContain('Strengthen the foundation')
      expect(card.rain).toBeUndefined()
    }
  })

  it('does not apply future construction changes to earlier chapters', () => {
    expect(
      poloChapterCard(
        { ...state('M1'), improvements: { grounds: true } },
        'water',
      ),
    ).toEqual(poloChapterCard(state('M1'), 'water'))
    expect(
      poloChapterCard({ ...state('M0'), improvements: { soil: true } }, 'land'),
    ).toEqual(poloChapterCard(state('M0'), 'land'))
  })
})
