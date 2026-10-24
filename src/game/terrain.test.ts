import { describe, expect, it } from 'vitest'
import { sampleElevation } from './terrain.ts'
import type { ElevationGrid } from './terrain.ts'

const grid: ElevationGrid = {
  size: 2,
  bounds: [-1, -1, 1, 1],
  heights: [0, 10, 20, 30],
}

describe('local terrain sampling', () => {
  it('preserves the north-to-south ordering of the prepared heightmap', () => {
    expect(sampleElevation(grid, -1, 1)).toBe(0)
    expect(sampleElevation(grid, 1, -1)).toBe(30)
  })
  it('interpolates between samples instead of moving the campus in elevation steps', () => {
    expect(sampleElevation(grid, 0, 0)).toBe(15)
    expect(sampleElevation(grid, 0, 1)).toBe(5)
  })
  it('uses the flat fallback outside the measured local area', () => {
    expect(sampleElevation(grid, 2, 0)).toBe(0)
    expect(sampleElevation(grid, 0, -2)).toBe(0)
  })
})
