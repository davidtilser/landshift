import { describe, expect, it } from 'vitest'
import { poloFoundationsSteps } from './foundations-reader.ts'
import { INITIAL_POLO_STATE, POLO_PHASES } from './model.ts'
import type { PoloSceneState } from './model.ts'
import { POLO_TODAY_TABS } from './today.ts'

const foundations = (areaHa = 4): PoloSceneState => ({
  ...INITIAL_POLO_STATE,
  confirmed: true,
  phase: 'M1',
  areaHa,
})

describe('Foundations step reader', () => {
  it('starts each topic with an explanation before showing a supported figure', () => {
    for (const tab of POLO_TODAY_TABS) {
      const steps = poloFoundationsSteps(foundations(), tab)
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

  it('keeps the reader specific to Foundations rather than changing other milestones', () => {
    for (const phase of POLO_PHASES.filter((phase) => phase !== 'M1'))
      for (const tab of POLO_TODAY_TABS)
        expect(poloFoundationsSteps({ ...foundations(), phase }, tab)).toEqual(
          [],
        )
  })

  it('scales water and workday energy but keeps the eight-hour basis fixed', () => {
    const examples = [
      { areaHa: 2, water: '506k US gal', power: '120 kWh/workday' },
      { areaHa: 4, water: '1.0M US gal', power: '240 kWh/workday' },
      { areaHa: 6, water: '1.5M US gal', power: '360 kWh/workday' },
    ]
    for (const example of examples) {
      const water = poloFoundationsSteps(foundations(example.areaHa), 'water')
      const electricity = poloFoundationsSteps(
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
      const general = poloFoundationsSteps(state, 'general')
      const land = poloFoundationsSteps(state, 'land')
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
        const steps = poloFoundationsSteps(
          { ...foundations(), improvements },
          tab,
        )
        expect(steps).toHaveLength(2)
        expect(steps[1]?.value).toBe('Not recalculated')
        expect(steps.map((step) => step.value ?? '').join(' ')).not.toMatch(
          /\d/,
        )
        expect(steps[1]?.copy).toContain('original plan figures')
      }
  })
})
