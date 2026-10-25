import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE } from './model.ts'
import { poloProjectSummary } from './project-summary.ts'

const operating = {
  ...INITIAL_POLO_STATE,
  confirmed: true,
  phase: 'M6' as const,
}

describe('project summary compared with Today', () => {
  it('compares matching annual water, site turf and event drainage from unrounded quantities', () => {
    const summary = poloProjectSummary(operating)
    const metric = (id: string): (typeof summary.metrics)[number] | undefined =>
      summary.metrics.find((item) => item.id === id)
    expect(metric('water')?.change).toBe('+852%')
    expect(metric('water')?.percent).toBeCloseTo(851.625)
    expect(metric('water')?.before).toBe('3.2M US gal')
    expect(metric('water')?.after).toBe('30.2M US gal')
    expect(metric('turf')?.change).toBe('−80%')
    expect(metric('turf')?.before).toBe('10 acres')
    expect(metric('turf')?.after).toBe('2 acres')
    expect(metric('drainage')?.change).toBe('+312%')
    expect(metric('drainage')?.before).toBe('142k US gal')
    expect(metric('drainage')?.after).toBe('585k US gal')
    expect(summary.originalReferenceOnly).toBe(false)
  })

  it('uses a labelled household-scale proxy without treating it as a measured park baseline', () => {
    const { metrics } = poloProjectSummary(operating)
    const energy = metrics.find((item) => item.id === 'electricity')
    const computing = metrics.find((item) => item.id === 'computing')
    expect(energy?.percent).toBeNull()
    expect(energy?.change).toBe('+288 MWh/day')
    expect(energy?.before).toBe('~15–30 kWh/day')
    expect(energy?.note).toContain('not metered site data')
    expect(energy?.sources).toHaveLength(2)
    expect(computing?.percent).toBeNull()
    expect(computing?.change).toBe('+10 MW')
    expect(computing?.tone).toBe('gain')
    expect(metrics.filter((item) => item.tone === 'pressure')).toHaveLength(4)
  })

  it('scales amounts with the selected area while keeping comparative percentages stable', () => {
    const standard = poloProjectSummary(operating)
    for (const areaHa of [2, 6]) {
      const summary = poloProjectSummary({ ...operating, areaHa })
      for (const item of summary.metrics) {
        const reference = standard.metrics.find((other) => other.id === item.id)
        if (item.percent === null) expect(reference?.percent).toBeNull()
        else expect(item.percent).toBeCloseTo(reference?.percent ?? NaN, 8)
        expect(item.change).not.toMatch(/NaN|Infinity/)
      }
      expect(
        summary.metrics.find((item) => item.id === 'electricity')?.change,
      ).toBe(areaHa === 2 ? '+144 MWh/day' : '+432 MWh/day')
      expect(
        summary.metrics.find((item) => item.id === 'electricity')?.before,
      ).toBe('~15–30 kWh/day')
    }
  })

  it('keeps original references separate from built-in, custom and legacy proposals', () => {
    const original = poloProjectSummary(operating)
    for (const changes of [
      { learnings: { water: true, roof: true } },
      {
        customLearnings: [
          { id: 'custom', text: 'A smaller campus', selected: true },
        ],
      },
      { proposal: 'green_roof' as const },
      { improvements: { soil: true } },
    ]) {
      const state = { ...operating, preview: true, ...changes }
      const summary = poloProjectSummary(state)
      expect(summary.originalReferenceOnly).toBe(true)
      expect(summary.metrics).toEqual(original.metrics)
    }
    expect(
      poloProjectSummary({
        ...operating,
        preview: false,
        learnings: { water: true },
      }).originalReferenceOnly,
    ).toBe(false)
  })
})
