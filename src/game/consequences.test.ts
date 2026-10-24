import { describe, expect, it } from 'vitest'
import { DEFAULT_CHOICES, evaluatePlan, assessSite } from './consequences.ts'
import type { PlanChoices, SiteContext, Weather } from './consequences.ts'
import type { DataPack } from './data.ts'
import type { FeatureCollection } from 'geojson'
import { rectangle } from './geometry.ts'
import type { LngLat } from './geometry.ts'

const clearSite: SiteContext = {
  buildings: 0,
  trees: 0,
  water: 0,
  parks: 0,
  flood: 0,
}
const plan = (changes: Partial<PlanChoices> = {}): PlanChoices => ({
  ...DEFAULT_CHOICES,
  ...changes,
})

function testLayers(): DataPack['layers'] {
  const empty: FeatureCollection = { type: 'FeatureCollection', features: [] }
  return {
    buildings: empty,
    water: empty,
    landuse: empty,
    roads: empty,
    trees: empty,
    project: empty,
    parcels: empty,
    zoning: empty,
    landcover: empty,
    parks: empty,
    trails: empty,
    flood: empty,
  }
}

describe('GIS consequence inputs', () => {
  const center: LngLat = [-121.9332, 37.3786]
  it('checks the full campus pad, including the gap between buildings', () => {
    const layers = testLayers()
    layers.buildings = {
      type: 'FeatureCollection',
      features: [rectangle(center, 4, 4, 0)],
    }
    expect(assessSite({ layers }, center, 28).buildings).toBe(1)
  })
  it('excludes swimming pools and non-special flood records from hazard warnings', () => {
    const layers = testLayers()
    const pool = rectangle(center, 4, 4, 0)
    pool.properties = { class: 'swimming_pool' }
    const flood = rectangle(center, 20, 20, 0)
    flood.properties = { SFHATF: 'F' }
    layers.water = { type: 'FeatureCollection', features: [pool] }
    layers.flood = { type: 'FeatureCollection', features: [flood] }
    const site = assessSite({ layers }, center, 28)
    expect(site.water).toBe(0)
    expect(site.flood).toBe(0)
    flood.properties = { SFHATF: 'T' }
    expect(assessSite({ layers }, center, 28).flood).toBe(1)
  })
})

describe('educational consequence rules', () => {
  it('makes water-saving cooling trade off against electricity for the same IT load', () => {
    const wet = evaluatePlan(clearSite, plan(), 10, 'drought')
    const dry = evaluatePlan(clearSite, plan({ cooling: 'dry' }), 10, 'drought')
    expect(dry.water).toBeLessThan(wet.water)
    expect(dry.power).toBeGreaterThan(wet.power)
    expect(dry.remaining).toBeLessThan(wet.remaining)
    expect(wet.water).toBe(Math.round(24 * 0.7 * 24 * 1.8 * 1.12))
  })
  it('does not give saplings their mature shade or restoration benefits immediately', () => {
    const choices = plan({ trees: 60, restoration: 'meadow' })
    const today = evaluatePlan(clearSite, choices, 0, 'drought')
    const future = evaluatePlan(clearSite, choices, 10, 'drought')
    expect(today.shade).toBeLessThan(future.shade)
    expect(today.nature).toBeLessThan(future.nature)
    expect(future.runoff).toBeLessThan(today.runoff)
    expect(future.water).toBeLessThanOrEqual(today.water)
  })
  it('keeps siting conflicts even after adding every upgrade', () => {
    const result = evaluatePlan(
      { ...clearSite, buildings: 2, water: 1, parks: 1 },
      plan({
        cooling: 'dry',
        trees: 60,
        restoration: 'rain-garden',
        training: true,
        access: true,
      }),
      10,
      'storm',
    )
    expect(result.blockers).toHaveLength(4)
    expect(result.goals.at(-1)?.passed).toBe(false)
  })
  it('does not let a rain garden remove mapped flood exposure', () => {
    const result = evaluatePlan(
      { ...clearSite, flood: 1 },
      plan({ restoration: 'rain-garden' }),
      10,
      'storm',
    )
    expect(result.feedback.find((item) => item.id === 'flood')?.tone).toBe(
      'warning',
    )
    expect(
      result.feedback.find((item) => item.id === 'flood')?.detail,
    ).toContain('does not remove flood exposure')
  })
  it('models a heatwave as harder cooling rather than a free benefit', () => {
    const dry = plan({ cooling: 'dry' })
    expect(evaluatePlan(clearSite, dry, 10, 'heatwave').power).toBeGreaterThan(
      evaluatePlan(clearSite, dry, 10, 'drought').power,
    )
    expect(
      evaluatePlan(clearSite, plan(), 10, 'heatwave').water,
    ).toBeGreaterThan(evaluatePlan(clearSite, plan(), 10, 'drought').water)
  })
  it('gives rain gardens a stormwater advantage and meadows a habitat advantage', () => {
    const garden = evaluatePlan(
      clearSite,
      plan({ restoration: 'rain-garden' }),
      10,
      'storm',
    )
    const meadow = evaluatePlan(
      clearSite,
      plan({ restoration: 'meadow' }),
      10,
      'storm',
    )
    expect(garden.runoff).toBeLessThan(meadow.runoff)
    expect(meadow.nature).toBeGreaterThan(garden.nature)
  })
  it('keeps training commitments separate from resource demand', () => {
    const basic = evaluatePlan(clearSite, plan(), 10, 'storm')
    const training = evaluatePlan(
      clearSite,
      plan({ training: true }),
      10,
      'storm',
    )
    expect(training.apprenticeships).toBe(12)
    expect(training.community).toBeGreaterThan(basic.community)
    expect(training.water).toBe(basic.water)
    expect(training.power).toBe(basic.power)
  })
  it('allows more than one strategy to meet the challenge within budget', () => {
    const strategies: { weather: Weather; choices: PlanChoices }[] = [
      {
        weather: 'drought',
        choices: plan({
          cooling: 'dry',
          trees: 24,
          restoration: 'meadow',
          training: true,
          access: true,
        }),
      },
      {
        weather: 'heatwave',
        choices: plan({
          cooling: 'hybrid',
          trees: 60,
          restoration: 'meadow',
          training: true,
        }),
      },
      {
        weather: 'storm',
        choices: plan({
          cooling: 'hybrid',
          trees: 24,
          restoration: 'rain-garden',
          training: true,
          access: true,
        }),
      },
    ]
    for (const strategy of strategies) {
      const result = evaluatePlan(
        clearSite,
        strategy.choices,
        10,
        strategy.weather,
      )
      expect(result.remaining).toBeGreaterThanOrEqual(0)
      expect(result.goals.every((goal) => goal.passed)).toBe(true)
    }
  })
})
