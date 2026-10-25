import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE } from './model.ts'
import { poloTodayCard, POLO_TODAY_TABS } from './today.ts'

describe('Today card information', () => {
  it('starts with general information about the selected part of the field', () => {
    const card = poloTodayCard(INITIAL_POLO_STATE, 'general')
    expect(POLO_TODAY_TABS[0]).toBe('general')
    expect(card.metrics[0]).toMatchObject({ value: '10 acres' })
    expect(card.details.join(' ')).toContain('not the entire venue')
    expect(card.details.join(' ')).toContain('No construction has started')
    expect(card.copy).toBeUndefined()
    expect(card.detailsTitle).toBe('More info & data sources')
    expect(card.details.join(' ')).toContain('not measurements of this site')
    expect(card.sources?.map((source) => source.label)).toEqual([
      'sfrecpark.org/847/Polo...',
      'unccd.int/land-and-life/...',
      'usgs.gov/water-science-school/...',
    ])
  })

  it('keeps irrigation as a scaled allowance and the same rain depth', () => {
    const small = poloTodayCard({ ...INITIAL_POLO_STATE, areaHa: 2 }, 'water')
    const large = poloTodayCard({ ...INITIAL_POLO_STATE, areaHa: 6 }, 'water')
    expect(small.metrics[0]).toMatchObject({
      value: '1.6M US gal/year',
      note: 'Teaching allowance',
    })
    expect(large.metrics[0]).toMatchObject({
      value: '4.8M US gal/year',
      note: 'Teaching allowance',
    })
    expect(small.metrics[1]).toEqual(large.metrics[1])
    expect(small.details.join(' ')).toContain('not metered park demand')
    expect(small.details.join(' ')).toContain('not an on-field measurement')
  })

  it('leaves existing electricity use unknown rather than implying zero', () => {
    const card = poloTodayCard(INITIAL_POLO_STATE, 'electricity')
    expect(card.metrics[0]?.value).toBe('Not established')
    expect(card.copy).toContain('does not mean zero')
  })

  it('shows original turf and no built surfaces within the same Today boundary', () => {
    const card = poloTodayCard(INITIAL_POLO_STATE, 'land')
    expect(card.metrics.map((metric) => metric.value)).toEqual([
      '10 acres',
      '0 acres',
    ])
  })
})
