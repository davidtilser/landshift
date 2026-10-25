import { describe, expect, it } from 'vitest'
import {
  activePoloProposal,
  pointOnPath,
  poloCoordinate,
  POLO_LAYOUT,
  poloSurfaceAreas,
} from './scene-geometry.ts'
import { INITIAL_POLO_STATE, POLO_CENTER, POLO_PROPOSALS } from './model.ts'
import { POLO_BASELINE } from './baseline.ts'

describe('schematic Polo scene boundaries', () => {
  it('matches the research land and roof areas without claiming a surveyed polygon', () => {
    expect(POLO_LAYOUT.pad.width * POLO_LAYOUT.pad.depth).toBe(40000)
    expect(
      POLO_LAYOUT.halls.reduce(
        (area, hall) => area + hall.width * hall.depth,
        0,
      ),
    ).toBe(12000)
    const developed =
      POLO_LAYOUT.developedBand.width * POLO_LAYOUT.developedBand.depth
    expect(developed - 12000).toBe(16000)
    expect(40000 - developed).toBe(12000)
    expect(poloCoordinate(0, 0)).toEqual(POLO_CENTER)
  })
  it('translates a placed campus while leaving fixed-field coordinates intact', () => {
    const selected = poloCoordinate(25, 5)
    expect(poloCoordinate(0, 0, selected)).toEqual(selected)
    expect(poloCoordinate(0, 0)).toEqual(POLO_CENTER)
    const westHall = poloCoordinate(-65, 0, selected)
    const eastHall = poloCoordinate(65, 0, selected)
    expect(
      (eastHall[0] - westHall[0]) *
        111320 *
        Math.cos((selected[1] * Math.PI) / 180),
    ).toBeCloseTo(130)
  })
  it('rotates campus geometry clockwise around its chosen center without rotating field anchors', () => {
    const center = poloCoordinate(20, 5)
    const eastAt90 = poloCoordinate(10, 0, center, 90)
    const northAt90 = poloCoordinate(0, 10, center, 90)
    expect(eastAt90[0]).toBeCloseTo(center[0], 9)
    expect((eastAt90[1] - center[1]) * 111320).toBeCloseTo(-10)
    expect(
      (northAt90[0] - center[0]) *
        111320 *
        Math.cos((center[1] * Math.PI) / 180),
    ).toBeCloseTo(10)
    expect(northAt90[1]).toBeCloseTo(center[1], 9)
    expect(poloCoordinate(10, 0)).toEqual(poloCoordinate(10, 0, POLO_CENTER, 0))
  })
  it('matches every prepared research milestone, including retained turf throughout construction', () => {
    for (const phase of POLO_BASELINE.phases) {
      const geometryAreas = poloSurfaceAreas(phase.id)
      expect(geometryAreas).toEqual(phase.data.areasM2)
      expect(
        Object.values(geometryAreas).reduce((sum, area) => sum + area, 0),
      ).toBe(40000)
      if (phase.id !== 'M0') expect(geometryAreas.turf).toBe(8000)
    }
    expect(poloSurfaceAreas('M4')).toMatchObject({
      bare_graded: 20000,
      roof: 12000,
      landscape: 0,
      other_impervious: 0,
    })
    expect(poloSurfaceAreas('M5')).toMatchObject({
      landscape: 4000,
      other_impervious: 16000,
    })
  })
  it('never retains a proposal in baseline comparison or an earlier milestone', () => {
    for (const proposal of POLO_PROPOSALS) {
      expect(activePoloProposal({ ...INITIAL_POLO_STATE, proposal })).toBeNull()
      expect(
        activePoloProposal({
          ...INITIAL_POLO_STATE,
          phase: 'M6',
          proposal,
          confirmed: true,
          preview: false,
        }),
      ).toBeNull()
      expect(
        activePoloProposal({
          ...INITIAL_POLO_STATE,
          phase: 'M6',
          proposal,
          confirmed: true,
        }),
      ).toBe(proposal)
      expect(
        activePoloProposal({ ...INITIAL_POLO_STATE, phase: 'M6', proposal }),
      ).toBeNull()
    }
  })
  it('keeps repeated visual pulses inside their own circuit', () => {
    const circuit = [
      [0, 0, 2],
      [10, 0, 2],
      [10, 10, 2],
    ] as const
    expect(pointOnPath(circuit, 0.25)).toEqual([5, 0, 2])
    expect(pointOnPath(circuit, 1.25)).toEqual([5, 0, 2])
    expect(pointOnPath(circuit, -0.25)).toEqual([10, 5, 2])
  })
})
