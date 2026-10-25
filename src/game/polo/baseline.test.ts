import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { POLO_PHASES } from './model.ts'
import {
  POLO_BASELINE,
  poloBaselinePhase,
  poloBaselineSchema,
} from './baseline.ts'
import type { PoloBaselinePhase } from './baseline.ts'

describe('research-backed Polo Fields baseline', () => {
  it('preserves the prepared average load, operating water and annual energy boundary', () => {
    expect(POLO_BASELINE.reference).toEqual({
      siteAreaM2: 40000,
      roofAreaM2: 12000,
      averageItMW: 10,
      averageFacilityMW: 12,
      facilityElectricityGWhYear: 105.12,
      supportingElectricityGWhYear: 17.52,
      coolingMakeupM3Day: 300,
      rainfallMm: 86.4,
      existingParkElectricityKWhYear: null,
      gridHeadroomMW: null,
      peakFacilityMW: null,
    })
    expect(
      poloBaselinePhase('M6').metrics.map((metric) => metric.value),
    ).toEqual(['12 MW', '105.12 GWh/year', '300 m³/day'])
  })
  it('retains transitional unknowns and the research’s equal grading/compaction runoff', () => {
    expect(poloBaselinePhase('M1').data.rainRunoffM3).toBeNull()
    expect(poloBaselinePhase('M0').data.selectedElectricityKWh).toBeNull()
    expect(poloBaselinePhase('M5').data.selectedDieselL).toBeNull()
    const research = (id: string): PoloBaselinePhase['data'] => {
      const phase = POLO_BASELINE.researchPhases.find(
        (phase) => phase.id === id,
      )
      if (!phase) throw new Error('Missing research fixture: ' + id)
      return phase.data
    }
    expect(research('M2').rainRunoffM3).toBe(research('M3').rainRunoffM3)
    expect(research('M1').rainRunoffM3).toBeNull()
    expect(research('M2').selectedDieselL).toBe(4320)
    expect(research('M3').selectedDieselL).toBe(900)
    expect(poloBaselinePhase('M4').data.selectedElectricityKWh).toBe(38400)
    expect(poloBaselinePhase('M5').data.rainCapturedM3).toBe(200)
  })
  it('provides exactly five chapters without inventing a foundation resource allocation', () => {
    expect(POLO_BASELINE.phases.map((phase) => phase.id)).toEqual(POLO_PHASES)
    expect(POLO_BASELINE.phases.map((phase) => phase.title)).toEqual([
      'Today',
      'Foundations',
      'Structure',
      'Commissioning',
      'Operating',
    ])
    expect(POLO_BASELINE.researchPhases).toHaveLength(7)
    expect(poloBaselinePhase('M1').data).toMatchObject({
      stageWaterSuppliedM3: null,
      offsiteConcreteWaterM3: null,
      selectedDieselL: null,
      selectedElectricityKWh: null,
      workdays: null,
      rainRunoffM3: null,
    })
    expect(poloBaselinePhase('M1').data.areasM2).toMatchObject({
      roof: 0,
      other_impervious: 12000,
      bare_graded: 20000,
    })
    expect(poloBaselinePhase('M4').data).toEqual(
      POLO_BASELINE.researchPhases.find((phase) => phase.id === 'M4')?.data,
    )
  })
  it('preserves one footprint and only two or three primary figures per phase', () => {
    for (const phase of POLO_BASELINE.phases) {
      expect(
        Object.values(phase.data.areasM2).reduce(
          (sum, value) => sum + value,
          0,
        ),
      ).toBe(40000)
      expect(phase.metrics.length).toBeGreaterThanOrEqual(2)
      expect(phase.metrics.length).toBeLessThanOrEqual(3)
    }
    const invalid = structuredClone(POLO_BASELINE)
    invalid.phases.reverse()
    expect(poloBaselineSchema.safeParse(invalid).success).toBe(false)
  })
  it('reproduces the generated adapter offline without modifying it', () => {
    const file = resolve('src/game/polo/baseline.generated.json')
    const before = readFileSync(file, 'utf8')
    expect(
      execFileSync(
        process.execPath,
        ['scripts/data/prepare-polo-demo.mjs', '--check'],
        { encoding: 'utf8', timeout: 30000 },
      ),
    ).toContain('PASS: offline research reproduction')
    expect(readFileSync(file, 'utf8')).toBe(before)
  }, 30000)
})
