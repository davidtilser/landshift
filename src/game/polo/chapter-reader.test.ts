import { describe, expect, it } from 'vitest'
import { poloChapterSteps } from './chapter-reader.ts'
import { INITIAL_POLO_STATE, POLO_PHASES } from './model.ts'
import type { PoloSceneState } from './model.ts'
import { POLO_TODAY_TABS } from './today.ts'

const foundations = (areaHa = 4): PoloSceneState => ({
  ...INITIAL_POLO_STATE,
  confirmed: true,
  phase: 'M1',
  areaHa,
})

describe('chapter step reader', () => {
  it('starts each topic with an explanation before showing a supported figure', () => {
    for (const tab of POLO_TODAY_TABS) {
      const steps = poloChapterSteps(foundations(), tab)
      expect(steps.length).toBeGreaterThanOrEqual(2)
      expect(steps.length).toBeLessThanOrEqual(3)
      expect(steps[0]?.kind).toBe('story')
      expect(steps[0]?.copy.length).toBeGreaterThan(50)
      expect(steps[0]?.value).toBeUndefined()
      expect(steps.slice(1).every((step) => step.kind === 'number')).toBe(true)
      expect(steps.slice(1).every((step) => step.value && step.label)).toBe(
        true,
      )
    }
  })

  it('gives every chapter and topic a story followed by individual figures', () => {
    for (const phase of POLO_PHASES)
      for (const tab of POLO_TODAY_TABS) {
        const steps = poloChapterSteps(
          { ...foundations(), phase, preview: false },
          tab,
        )
        expect(steps.length).toBeGreaterThanOrEqual(2)
        expect(steps.length).toBeLessThanOrEqual(3)
        expect(steps[0]?.kind).toBe('story')
        expect(steps[0]?.copy).not.toBe('')
        expect(steps[0]?.value).toBeUndefined()
        for (const step of steps.slice(1)) {
          expect(step.kind).toBe('number')
          expect(step.value).toBeTruthy()
          expect(step.label).toBeTruthy()
          expect(step.copy).not.toBe('')
        }
      }
    expect(poloChapterSteps(INITIAL_POLO_STATE, 'general')).toEqual([])
  })

  it('scales water and workday energy but keeps the eight-hour basis fixed', () => {
    const examples = [
      { areaHa: 2, water: '506k US gal', power: '120 kWh/workday' },
      { areaHa: 4, water: '1.0M US gal', power: '240 kWh/workday' },
      { areaHa: 6, water: '1.5M US gal', power: '360 kWh/workday' },
    ]
    for (const example of examples) {
      const water = poloChapterSteps(foundations(example.areaHa), 'water')
      const electricity = poloChapterSteps(
        foundations(example.areaHa),
        'electricity',
      )
      expect(water[1]?.value).toBe(example.water)
      expect(water[1]?.copy).toContain('including commissioning')
      expect(water[1]?.copy).toContain('not water already used')
      expect(water[1]?.value).not.toMatch(/\/day|\/year/)
      expect(electricity[1]?.value).toBe(example.power)
      expect(electricity[2]?.value).toBe('8 hours')
      expect(electricity[1]?.copy).toContain('not the full construction total')
    }
  })

  it('shows changed turf and remaining turf against the same selected area', () => {
    for (const example of [
      { areaHa: 2, site: '5 acres', changed: '4 acres', remaining: '1 acres' },
      {
        areaHa: 4,
        site: '10 acres',
        changed: '8 acres',
        remaining: '2 acres',
      },
      {
        areaHa: 6,
        site: '15 acres',
        changed: '12 acres',
        remaining: '3 acres',
      },
    ]) {
      const state = foundations(example.areaHa)
      const general = poloChapterSteps(state, 'general')
      const land = poloChapterSteps(state, 'land')
      expect(general[1]?.value).toBe(example.site)
      expect(general[2]?.value).toBe('Foundations set')
      expect(land[1]?.value).toBe(example.changed)
      expect(land[1]?.label).toBe('80% of Today’s turf · same site area')
      expect(land[2]?.value).toBe(example.remaining)
      expect(land[2]?.copy).toContain(
        'does not mean the original playing field can still be used',
      )
    }
  })

  it('never presents original quantities as outcomes of a construction change', () => {
    for (const improvements of [{ soil: true }, { foundation: true }])
      for (const tab of POLO_TODAY_TABS) {
        const steps = poloChapterSteps({ ...foundations(), improvements }, tab)
        expect(steps).toHaveLength(2)
        expect(steps[1]?.value).toBe('Not recalculated')
        expect(steps.map((step) => step.value ?? '').join(' ')).not.toMatch(
          /\d/,
        )
        expect(steps[1]?.copy).toContain('original plan figures')
      }
  })

  it('keeps commissioning water one-time and compares electricity on named model days', () => {
    const commissioning = { ...foundations(), phase: 'M5' } as const
    const water = poloChapterSteps(commissioning, 'water')
    const electricity = poloChapterSteps(commissioning, 'electricity')
    expect(water[1]?.value).toBe('57k US gal')
    expect(water[1]?.copy).toContain('already included')
    expect(water[1]?.label).toContain('one time')
    expect(electricity[1]?.value).toBe('2 MWh/test day')
    expect(electricity[2]?.value).toBe('8.3×')
    expect(electricity[2]?.copy).toContain('four-hour test day')
    expect(electricity[2]?.copy).toContain('eight-hour construction workday')
  })

  it('compares annual operating water with annual irrigation and daily energy with a workday', () => {
    const operating = { ...foundations(), phase: 'M6', preview: false } as const
    const water = poloChapterSteps(operating, 'water')
    const electricity = poloChapterSteps(operating, 'electricity')
    expect(water[1]?.value).toBe('30.2M US gal/year')
    expect(water[2]?.value).toBe('9.5×')
    expect(water[2]?.label).toContain('same area, one year')
    expect(electricity[1]?.value).toBe('288 MWh/day')
    expect(electricity[2]?.value).toBe('1,200×')
    expect(electricity[2]?.label).toContain('construction workday')
    expect(electricity[1]?.copy).toContain('Cooling is already included')
  })

  it('does not turn today’s zero project electricity into zero park demand', () => {
    const today = { ...foundations(), phase: 'M0' } as const
    const electricity = poloChapterSteps(today, 'electricity')
    expect(electricity[1]?.value).toBe('0 kWh/day')
    expect(electricity[1]?.copy).toContain('existing use is unknown')
    expect(electricity).toHaveLength(2)
    expect(poloChapterSteps(today, 'general')[0]?.copy).toContain('Polo Fields')
  })

  it('keeps combined learnings and legacy concept views qualitative for every topic', () => {
    for (const changes of [
      { learnings: { heat: true } },
      { learnings: { water: true, soil: true } },
      { proposal: 'green_roof' as const },
    ])
      for (const tab of POLO_TODAY_TABS) {
        const steps = poloChapterSteps(
          { ...foundations(), phase: 'M6', preview: true, ...changes },
          tab,
        )
        expect(steps).toHaveLength(2)
        expect(steps[1]?.value).toBe('Not recalculated')
        expect(steps[0]?.value).toBeUndefined()
      }
  })

  it('keeps custom-only plans qualitative and restores references in the original view', () => {
    const proposed: PoloSceneState = {
      ...foundations(),
      phase: 'M6',
      preview: true,
      customLearnings: [
        { id: 'idea-1', text: 'Share a public space', selected: true },
      ],
    }
    for (const tab of POLO_TODAY_TABS) {
      const steps = poloChapterSteps(proposed, tab)
      expect(steps).toHaveLength(2)
      expect(steps[1]?.value).toBe('Not recalculated')
      expect(steps[0]?.copy).not.toContain('change the design on the map')
      expect(
        poloChapterSteps({ ...proposed, preview: false }, tab)[1]?.value,
      ).not.toBe('Not recalculated')
      expect(
        poloChapterSteps({ ...proposed, phase: 'M1' }, tab)[1]?.value,
      ).not.toBe('Not recalculated')
    }
  })
})
