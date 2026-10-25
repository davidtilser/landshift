import { describe, expect, it } from 'vitest'
import { POLO_BASELINE, poloBaselinePhase } from './baseline.ts'
import { INITIAL_POLO_STATE, POLO_PHASES } from './model.ts'
import {
  poloAreaValid,
  poloGeometryScale,
  poloSizedIrrigationM3Year,
  poloSizedPhase,
  poloSizedReference,
} from './size.ts'

describe('selected Polo campus area', () => {
  it('accepts only 2–6 ha at half-hectare increments', () => {
    for (let areaHa = 2; areaHa <= 6; areaHa += 0.5)
      expect(poloAreaValid(areaHa)).toBe(true)
    for (const areaHa of [NaN, Infinity, -Infinity, 0, 1.5, 2.1, 6.5]) {
      expect(poloAreaValid(areaHa)).toBe(false)
      expect(() => poloGeometryScale({ areaHa })).toThrow('valid campus area')
    }
  })

  it('reproduces the complete frozen baseline at the default area', () => {
    expect(poloGeometryScale(INITIAL_POLO_STATE)).toBe(1)
    expect(poloSizedReference(INITIAL_POLO_STATE)).toBe(POLO_BASELINE.reference)
    for (const phase of POLO_PHASES)
      expect(poloSizedPhase(INITIAL_POLO_STATE, phase)).toBe(
        poloBaselinePhase(phase),
      )
  })

  it('keeps physical footprint, inventories and units consistent', () => {
    for (let areaHa = 2; areaHa <= 6; areaHa += 0.5) {
      const state = { ...INITIAL_POLO_STATE, areaHa }
      const ratio = areaHa / 4
      expect(poloGeometryScale(state) ** 2).toBeCloseTo(ratio)
      expect(poloSizedReference(state).siteAreaM2).toBe(areaHa * 10000)
      expect(poloSizedReference(state).coolingMakeupM3Day).toBe(300 * ratio)
      expect(poloSizedIrrigationM3Year(state)).toBe(areaHa * 3000)
      for (const phase of POLO_PHASES) {
        const sized = poloSizedPhase(state, phase)
        const original = poloBaselinePhase(phase)
        expect(
          Object.values(sized.data.areasM2).reduce((a, b) => a + b, 0),
        ).toBe(areaHa * 10000)
        expect(sized.data.rainfallMm).toBe(original.data.rainfallMm)
        expect(sized.data.workdays).toBe(original.data.workdays)
        for (const field of [
          'rainRunoffM3',
          'rainCapturedM3',
          'rainManagedDrainageM3',
          'stageWaterSuppliedM3',
          'offsiteConcreteWaterM3',
          'selectedDieselL',
          'selectedElectricityKWh',
        ] as const)
          expect(sized.data[field]).toBe(
            original.data[field] === null ? null : original.data[field] * ratio,
          )
      }
    }
  })

  it('scales display metrics without changing the source or claiming a survey', () => {
    const original = JSON.stringify(POLO_BASELINE)
    const state = { ...INITIAL_POLO_STATE, areaHa: 6, phase: 'M6' as const }
    expect(poloSizedPhase(state).metrics.map((metric) => metric.value)).toEqual(
      ['18 MW', '157.68 GWh/year', '450 m³/day'],
    )
    expect(
      poloSizedPhase(state, 'M0').metrics.map((metric) => metric.value),
    ).toEqual(['6.0 ha', '18.0 million L/year'])
    expect(
      poloSizedPhase(state).metrics.every((metric) =>
        metric.detail.includes('Area-proportional teaching assumption'),
      ),
    ).toBe(true)
    expect(JSON.stringify(POLO_BASELINE)).toBe(original)
    expect(poloSizedReference(state).gridHeadroomMW).toBeNull()
    expect(poloSizedReference(state).peakFacilityMW).toBeNull()
    expect(
      poloSizedPhase({ ...INITIAL_POLO_STATE, areaHa: 2.5 }, 'M1').metrics.find(
        (metric) => metric.label === 'Foundation footprint',
      )?.value,
    ).toBe('0.75 ha')
  })
})
