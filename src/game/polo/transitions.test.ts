import { describe, expect, it } from 'vitest'
import { POLO_PHASES } from './model.ts'
import type { PoloPhase } from './model.ts'
import { POLO_BASELINE } from './baseline.ts'
import { poloSurfaceAreas } from './scene-geometry.ts'
import { POLO_TRANSITION_SECONDS, poloTransitionFrame } from './transitions.ts'
import type { PoloTransitionFrame } from './transitions.ts'

const physical = [
  'turfRemoved',
  'grading',
  'compaction',
  'foundation',
  'frame',
  'roof',
  'cladding',
  'hardstanding',
  'landscaping',
  'commissioning',
  'operation',
] as const
const endpoint = (phase: PoloPhase): PoloTransitionFrame =>
  poloTransitionFrame(phase, POLO_TRANSITION_SECONDS[phase])

describe('Polo preparation and construction transitions', () => {
  it('starts each phase at the previous physical endpoint and finishes the requested work', () => {
    const today = endpoint('M0')
    expect(today.complete).toBe(true)
    for (const key of physical) expect(today[key]).toBe(0)
    for (let index = 1; index < POLO_PHASES.length; index++) {
      const phase = POLO_PHASES[index]
      const previous = POLO_PHASES[index - 1]
      if (!phase || !previous) throw new Error('Missing phase fixture')
      const start = poloTransitionFrame(phase, 0),
        before = endpoint(previous),
        after = endpoint(phase)
      expect(start.progress).toBe(0)
      expect(start.complete).toBe(false)
      expect(after.progress).toBe(1)
      expect(after.complete).toBe(true)
      for (const key of physical) expect(start[key]).toBe(before[key])
    }
    expect(endpoint('M1').turfRemoved).toBe(1)
    expect(endpoint('M2').grading).toBe(1)
    expect(endpoint('M3').compaction).toBe(1)
    expect(endpoint('M4').roof).toBe(1)
    expect(endpoint('M4').cladding).toBe(0)
    expect(endpoint('M5').commissioning).toBe(1)
    expect(endpoint('M5').operation).toBe(0)
    expect(endpoint('M6').operation).toBe(1)
  })
  it('builds foundations, frame and roof in causal order before closing and finishing the campus', () => {
    const foundations = poloTransitionFrame(
      'M4',
      POLO_TRANSITION_SECONDS.M4 * 0.125,
    )
    expect(foundations.foundation).toBeGreaterThan(0)
    expect(foundations.foundation).toBeLessThan(1)
    expect(foundations.frame).toBe(0)
    expect(foundations.roof).toBe(0)
    const steel = poloTransitionFrame('M4', POLO_TRANSITION_SECONDS.M4 * 0.45)
    expect(steel.foundation).toBe(1)
    expect(steel.frame).toBeGreaterThan(0)
    expect(steel.frame).toBeLessThan(1)
    expect(steel.roof).toBe(0)
    const roof = poloTransitionFrame('M4', POLO_TRANSITION_SECONDS.M4 * 0.85)
    expect(roof.frame).toBe(1)
    expect(roof.roof).toBeGreaterThan(0)
    expect(roof.roof).toBeLessThan(1)
    expect(roof.hardstanding).toBe(0)
    const closing = poloTransitionFrame('M5', POLO_TRANSITION_SECONDS.M5 * 0.2)
    expect(closing.roof).toBe(1)
    expect(closing.cladding).toBeGreaterThan(0)
    expect(closing.hardstanding).toBe(0)
    const paths = poloTransitionFrame('M5', POLO_TRANSITION_SECONDS.M5 * 0.5)
    expect(paths.cladding).toBe(1)
    expect(paths.hardstanding).toBeGreaterThan(0)
    expect(paths.landscaping).toBe(0)
    const ready = poloTransitionFrame('M5', POLO_TRANSITION_SECONDS.M5 * 0.8)
    expect(ready.hardstanding).toBe(1)
    expect(ready.landscaping).toBeGreaterThan(0)
    expect(ready.commissioning).toBeGreaterThan(0)
    expect(ready.operation).toBe(0)
  })
  it('keeps every visual fraction bounded and monotonic through each transition', () => {
    for (const phase of POLO_PHASES) {
      let previous = poloTransitionFrame(phase, -1)
      for (let sample = 0; sample <= 100; sample++) {
        const current = poloTransitionFrame(
          phase,
          (POLO_TRANSITION_SECONDS[phase] * sample) / 100,
        )
        for (const key of [
          ...physical,
          'progress',
          'machineProgress',
        ] as const) {
          expect(current[key]).toBeGreaterThanOrEqual(previous[key])
          expect(current[key]).toBeGreaterThanOrEqual(0)
          expect(current[key]).toBeLessThanOrEqual(1)
        }
        expect(current.caption.length).toBeGreaterThan(0)
        previous = current
      }
    }
  })
  it('settles reduced-motion, skips and invalid elapsed values without NaN or accumulated work', () => {
    for (const phase of POLO_PHASES) {
      expect(poloTransitionFrame(phase, 0, false)).toEqual(endpoint(phase))
      expect(poloTransitionFrame(phase, Infinity)).toEqual(endpoint(phase))
      expect(poloTransitionFrame(phase, 1000)).toEqual(endpoint(phase))
      expect(poloTransitionFrame(phase, -20)).toEqual(
        poloTransitionFrame(phase, 0),
      )
      expect(poloTransitionFrame(phase, -Infinity)).toEqual(
        poloTransitionFrame(phase, 0),
      )
      expect(poloTransitionFrame(phase, NaN)).toEqual(
        poloTransitionFrame(phase, 0),
      )
      expect(poloTransitionFrame(phase, NaN, false)).toEqual(endpoint(phase))
    }
  })
  it('preserves researched surface endpoints, the one disturbance and unknown runoff plateau', () => {
    for (const phase of POLO_PHASES) {
      const frame = endpoint(phase)
      const stripped = 32000 * frame.turfRemoved * (1 - frame.grading)
      const areas = {
        turf: 40000 - 32000 * frame.turfRemoved,
        stripped_not_graded: stripped,
        bare_graded:
          32000 * frame.turfRemoved -
          stripped -
          12000 * frame.roof -
          16000 * frame.hardstanding -
          4000 * frame.landscaping,
        roof: 12000 * frame.roof,
        other_impervious: 16000 * frame.hardstanding,
        landscape: 4000 * frame.landscaping,
      }
      expect(areas).toEqual(poloSurfaceAreas(phase))
      expect(areas).toEqual(
        POLO_BASELINE.phases.find((item) => item.id === phase)?.data.areasM2,
      )
      expect(Object.values(areas).reduce((sum, value) => sum + value, 0)).toBe(
        40000,
      )
      if (phase !== 'M0') expect(areas.turf).toBe(8000)
    }
    expect(POLO_BASELINE.phases[1]?.data.rainRunoffM3).toBeNull()
    expect(POLO_BASELINE.phases[2]?.data.rainRunoffM3).toBe(
      POLO_BASELINE.phases[3]?.data.rainRunoffM3,
    )
  })
})
