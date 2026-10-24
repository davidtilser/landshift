import { describe, expect, it } from 'vitest'
import {
  campus,
  insideBounds,
  intersectingFeatures,
  rectangle,
} from './geometry.ts'
import type { Bounds, LngLat } from './geometry.ts'
import type { FeatureCollection } from 'geojson'

const center: LngLat = [-121.9332, 37.3786]
const bounds: Bounds = [-121.943, 37.372, -121.923, 37.387]

describe('geographic placement', () => {
  it('keeps the concept area consistent when rotated', () => {
    const original = campus(center, 0)
    const rotated = campus(center, 137)
    expect(original.footprints.features).toHaveLength(2)
    expect(original.area).toBeGreaterThan(13000)
    expect(original.area).toBeLessThan(14000)
    expect(Math.abs(original.area - rotated.area)).toBeLessThan(1)
  })

  it('checks the whole campus, not just the position of its center', () => {
    expect(insideBounds(campus(center, 28).volumes, bounds)).toBe(true)
    const tooCloseToEdge: LngLat = [bounds[0] + 0.00001, center[1]]
    expect(insideBounds(campus(tooCloseToEdge, 28).volumes, bounds)).toBe(false)
  })

  it('counts an intersected geographic record once even if both blocks overlap it', () => {
    const records: FeatureCollection = {
      type: 'FeatureCollection',
      features: [rectangle(center, 400, 400, 0)],
    }
    expect(intersectingFeatures(campus(center, 28).footprints, records)).toBe(1)
  })

  it('does not count nearby buildings or distant tree records as overlaps', () => {
    const records: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        rectangle([center[0] + 0.004, center[1]], 30, 30, 0),
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [center[0], center[1] + 0.004],
          },
        },
      ],
    }
    expect(intersectingFeatures(campus(center, 28).footprints, records)).toBe(0)
  })

  it('deduplicates fragments of the same source building at tile boundaries', () => {
    const first = rectangle(center, 50, 50, 0)
    const second = rectangle(center, 60, 50, 0)
    first.id = 123
    second.id = 123
    const records: FeatureCollection = {
      type: 'FeatureCollection',
      features: [first, second],
    }
    expect(intersectingFeatures(campus(center, 28).footprints, records)).toBe(1)
  })
})
