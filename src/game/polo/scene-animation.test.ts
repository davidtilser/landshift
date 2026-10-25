import { describe, expect, it } from 'vitest'
import { segmentReveal, workPass } from './scene-animation.ts'

describe('physical work reveals', () => {
  it('reveals only the active pass after earlier passes are complete', () => {
    expect(segmentReveal(0.2, 0, 8)).toBe(1)
    expect(segmentReveal(0.2, 1, 8)).toBeCloseTo(0.6)
    expect(segmentReveal(0.2, 2, 8)).toBe(0)
    expect(workPass(0.2).x).toBeCloseTo(-32)
    expect(workPass(0.2)).toMatchObject({ y: -31.25, heading: 180 })
  })
  it('keeps all work inside the same central band and settles the target without replay accumulation', () => {
    for (let index = 0; index <= 100; index++) {
      const point = workPass(index / 100)
      expect(Math.abs(point.x)).toBeLessThanOrEqual(160)
      expect(Math.abs(point.y)).toBeLessThan(50)
    }
    expect(workPass(1)).toEqual(workPass(2))
    expect(segmentReveal(1, 7, 8)).toBe(1)
  })
})
