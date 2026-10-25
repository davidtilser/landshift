import { z } from 'zod'
import generated from './baseline.generated.json' with { type: 'json' }
import { POLO_PHASES, POLO_RESEARCH_PHASES } from './model.ts'
import type { PoloPhase } from './model.ts'

const quantity = z.number().nonnegative()
const metricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  detail: z.string().min(1),
})
const phaseSchema = z.object({
  id: z.enum(POLO_PHASES),
  title: z.string(),
  kicker: z.string(),
  summary: z.string(),
  tradeoff: z.string(),
  metrics: z.array(metricSchema).min(2).max(3),
  details: z.array(z.string()),
  data: z.object({
    areasM2: z.object({
      turf: quantity,
      stripped_not_graded: quantity,
      bare_graded: quantity,
      roof: quantity,
      other_impervious: quantity,
      landscape: quantity,
    }),
    rainfallMm: quantity,
    rainRunoffM3: quantity.nullable(),
    rainCapturedM3: quantity.nullable(),
    rainManagedDrainageM3: quantity.nullable(),
    stageWaterSuppliedM3: quantity.nullable(),
    offsiteConcreteWaterM3: quantity.nullable(),
    selectedDieselL: quantity.nullable(),
    selectedElectricityKWh: quantity.nullable(),
    workdays: quantity.int().positive().nullable(),
    sourceIds: z.object({
      water: z.array(z.string()),
      energy: z.array(z.string()),
    }),
  }),
})
export const poloBaselineSchema = z
  .object({
    phases: z.array(phaseSchema).length(5),
    researchPhases: z
      .array(phaseSchema.extend({ id: z.enum(POLO_RESEARCH_PHASES) }))
      .length(7),
    reference: z.object({
      siteAreaM2: quantity,
      roofAreaM2: quantity,
      averageItMW: quantity,
      averageFacilityMW: quantity,
      facilityElectricityGWhYear: quantity,
      supportingElectricityGWhYear: quantity,
      coolingMakeupM3Day: quantity,
      rainfallMm: quantity,
      existingParkElectricityKWhYear: z.null(),
      gridHeadroomMW: z.null(),
      peakFacilityMW: z.null(),
    }),
    assumptions: z.array(z.string()),
    sources: z.array(z.object({ title: z.string(), url: z.url() })),
    provenance: z.object({
      generator: z.string(),
      researchScenarioIds: z.array(z.string()).length(2),
      researchSha256: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
      validation: z.array(z.string()),
    }),
  })
  .superRefine((baseline, context) => {
    for (const [index, phase] of baseline.phases.entries()) {
      if (phase.id !== POLO_PHASES[index])
        context.addIssue({
          code: 'custom',
          path: ['phases', index, 'id'],
          message:
            'Polo chapters must be Today, Foundations, Structure, Ready, Operating.',
        })
      const area = Object.values(phase.data.areasM2).reduce(
        (sum, value) => sum + value,
        0,
      )
      if (area !== baseline.reference.siteAreaM2)
        context.addIssue({
          code: 'custom',
          path: ['phases', index, 'data', 'areasM2'],
          message: 'Surface areas must preserve the same demo footprint.',
        })
    }
    for (const [index, phase] of baseline.researchPhases.entries()) {
      if (phase.id !== POLO_RESEARCH_PHASES[index])
        context.addIssue({
          code: 'custom',
          path: ['researchPhases', index, 'id'],
          message: 'Research snapshots must retain their original M0–M6 order.',
        })
    }
  })
export type PoloBaselinePhase = z.infer<typeof phaseSchema>
export type PoloBaseline = z.infer<typeof poloBaselineSchema>
/** Frozen teaching baseline reproduced from Marian's scripts, separate from visual proposals. */
export const POLO_BASELINE: PoloBaseline = poloBaselineSchema.parse(generated)

export function poloBaselinePhase(id: PoloPhase): PoloBaselinePhase {
  const phase = POLO_BASELINE.phases.find((item) => item.id === id)
  if (!phase) throw new Error('Missing Polo baseline phase: ' + id)
  return phase
}
