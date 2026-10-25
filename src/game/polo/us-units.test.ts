import { describe, expect, it } from 'vitest'
import { POLO_BASELINE } from './baseline.ts'
import { poloDisplayPhase } from './display.ts'
import { poloEducation, POLO_TOPICS } from './education.ts'
import { poloImpact } from './impact.ts'
import { INITIAL_POLO_STATE, POLO_PHASES } from './model.ts'
import {
  poloUsText,
  usAcres,
  usAreaNumber,
  usFeet,
  usGallons,
  usInches,
  usNumber,
} from './us-units.ts'

describe('US presentation without a different simulation', () => {
  it('shows the default four hectares as acres without changing the footprint', () => {
    const source = structuredClone(POLO_BASELINE)
    const state = { ...INITIAL_POLO_STATE }
    const shown = poloDisplayPhase(state)
    expect(usAcres(40_000)).toBe('10 acres')
    expect(shown.metrics[0]?.value).toBe('10 acres')
    expect(shown.data).toBe(POLO_BASELINE.phases[0]?.data)
    expect(shown.data.areasM2.turf).toBe(40_000)
    expect(state.areaHa).toBe(4)
    expect(POLO_BASELINE).toEqual(source)
  })

  it('uses US liquid gallons, inches and feet with readable rounding', () => {
    expect(usGallons(0.003785411784)).toBe('1 US gal')
    expect(usGallons(300)).toBe('80k US gal')
    expect(usGallons(12_000)).toBe('3.2M US gal')
    expect(usGallons(0)).toBe('0 US gal')
    expect(usInches(86.4)).toBe('3.4 in')
    expect(usFeet(5)).toBe('16 ft')
  })

  it('keeps meaningful fractions, small nonzero values and whole slider labels', () => {
    expect(usNumber(105.12)).toBe('105')
    expect(usNumber(0.5)).toBe('0.5')
    expect(usNumber(1.5)).toBe('1.5')
    expect(usNumber(0.004)).toBe('0.004')
    expect(usInches(12.7)).toBe('0.5 in')
    expect(usInches(0.5)).toBe('0.02 in')
    expect(usAreaNumber(20_000)).toBe('5')
    expect(usAreaNumber(40_000)).toBe('10')
    expect(usAreaNumber(60_000)).toBe('15')
    expect(usAcres(2000)).toBe('0.5 acres')
  })

  it('rounds retained explanations before reading pages without changing dates or ratios', () => {
    expect(
      poloUsText(
        '4 ha; 1,988 m³; 12.0 million L/year; 86.4 mm; 5.8 km; 5 metres; 1.25 L/kWh; 12 MW; December 11, 2014.',
      ),
    ).toBe(
      '10 acres; 530k US gal; 3.2M US gal/year; 3.4 in; 3.6 mi; 16 ft; 0.33 US gal/kWh; 12 MW; December 11, 2014.',
    )
    expect(poloUsText('A four-hectare field; 12,000 m² roofs.')).toBe(
      'A 10-acre field; 130k sq ft roofs.',
    )
    expect(poloUsText('12 MW; 105.12 GWh/year; M0; 2026; 20%.')).toBe(
      '12 MW; 105 GWh/year; M0; 2026; 20%.',
    )
    expect(poloUsText('PUE 1.20; ratio 1.5; 50%.')).toBe(
      'PUE 1.20; ratio 1.5; 50%.',
    )
  })

  it('localizes every default chapter, lesson and impact card while keeping electricity', () => {
    const siUnits =
      /\b(?:ha|hectares?|mm|km|litres?|liters?)\b|m[²³]|\bL(?:\/|\b)/
    for (const phase of POLO_PHASES) {
      const state = { ...INITIAL_POLO_STATE, confirmed: true, phase }
      const display = poloDisplayPhase(state)
      const prose = [
        display.summary,
        display.tradeoff,
        ...display.details,
        ...display.metrics.flatMap((metric) => [metric.value, metric.detail]),
      ]
      for (const topic of POLO_TOPICS)
        for (const step of poloEducation(state, topic).steps) {
          prose.push(step.text, step.value ?? '')
          expect(Array.from(step.text).length).toBeLessThanOrEqual(70)
        }
      for (const card of poloImpact(state))
        prose.push(card.baseline, card.current)
      expect(prose.join(' ')).not.toMatch(siUnits)
    }
    const operation = poloDisplayPhase({
      ...INITIAL_POLO_STATE,
      confirmed: true,
      phase: 'M6',
    })
    expect(operation.metrics.map((metric) => metric.value)).toEqual([
      '12 MW',
      '105 GWh/year',
      '80k US gal/day',
    ])
  })
})
