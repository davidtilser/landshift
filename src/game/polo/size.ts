import { POLO_BASELINE, poloBaselinePhase } from './baseline.ts'
import type { PoloBaseline, PoloBaselinePhase } from './baseline.ts'
import {
  POLO_AREA_STEP_HA,
  POLO_DEFAULT_AREA_HA,
  POLO_MAX_AREA_HA,
  POLO_MIN_AREA_HA,
} from './model.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'

type PoloSizeState = Pick<PoloSceneState, 'areaHa'>
// The frozen baseline describes 300 mm/year delivered to managed turf.
const MODEL_IRRIGATION_MM_YEAR = 300
const SCALE_NOTE =
  'Area-proportional teaching assumption; not a site assessment.'
const format = (value: number, decimals = 2): string =>
  value.toLocaleString('en-US', { maximumFractionDigits: decimals })

export function poloAreaValid(areaHa: number): boolean {
  return (
    Number.isFinite(areaHa) &&
    areaHa >= POLO_MIN_AREA_HA &&
    areaHa <= POLO_MAX_AREA_HA &&
    Number.isInteger((areaHa - POLO_MIN_AREA_HA) / POLO_AREA_STEP_HA)
  )
}

export function poloAreaRatio(state: PoloSizeState): number {
  if (!poloAreaValid(state.areaHa))
    throw new Error('Choose a valid campus area.')
  return state.areaHa / POLO_DEFAULT_AREA_HA
}

/** Linear dimensions change by sqrt(area ratio); building heights stay fixed. */
export function poloGeometryScale(state: PoloSizeState): number {
  return Math.sqrt(poloAreaRatio(state))
}

/** An irrigation teaching allowance, never measured park demand. */
export function poloSizedIrrigationM3Year(state: PoloSizeState): number {
  return (
    (POLO_BASELINE.reference.siteAreaM2 *
      poloAreaRatio(state) *
      MODEL_IRRIGATION_MM_YEAR) /
    1000
  )
}

/** Work duration/rainfall depth stay fixed; unknown values stay unknown. */
export function poloSizedReference(
  state: PoloSizeState,
): PoloBaseline['reference'] {
  const ratio = poloAreaRatio(state)
  if (ratio === 1) return POLO_BASELINE.reference
  const reference = POLO_BASELINE.reference
  return {
    siteAreaM2: reference.siteAreaM2 * ratio,
    roofAreaM2: reference.roofAreaM2 * ratio,
    averageItMW: reference.averageItMW * ratio,
    averageFacilityMW: reference.averageFacilityMW * ratio,
    facilityElectricityGWhYear: reference.facilityElectricityGWhYear * ratio,
    supportingElectricityGWhYear:
      reference.supportingElectricityGWhYear * ratio,
    coolingMakeupM3Day: reference.coolingMakeupM3Day * ratio,
    rainfallMm: reference.rainfallMm,
    existingParkElectricityKWhYear: null,
    gridHeadroomMW: null,
    peakFacilityMW: null,
  }
}

/** Scale the authored teaching inventory, without rewriting source JSON. */
export function poloSizedPhase(
  state: Pick<PoloSceneState, 'areaHa' | 'phase'>,
  phaseId: PoloPhase = state.phase,
): PoloBaselinePhase {
  const ratio = poloAreaRatio(state)
  const phase = poloBaselinePhase(phaseId)
  if (ratio === 1) return phase
  const original = phase.data
  const multiply = (value: number | null): number | null =>
    value === null ? null : value * ratio
  const data: PoloBaselinePhase['data'] = {
    ...original,
    areasM2: {
      turf: original.areasM2.turf * ratio,
      stripped_not_graded: original.areasM2.stripped_not_graded * ratio,
      bare_graded: original.areasM2.bare_graded * ratio,
      roof: original.areasM2.roof * ratio,
      other_impervious: original.areasM2.other_impervious * ratio,
      landscape: original.areasM2.landscape * ratio,
    },
    rainRunoffM3: multiply(original.rainRunoffM3),
    rainCapturedM3: multiply(original.rainCapturedM3),
    rainManagedDrainageM3: multiply(original.rainManagedDrainageM3),
    stageWaterSuppliedM3: multiply(original.stageWaterSuppliedM3),
    offsiteConcreteWaterM3: multiply(original.offsiteConcreteWaterM3),
    selectedDieselL: multiply(original.selectedDieselL),
    selectedElectricityKWh: multiply(original.selectedElectricityKWh),
  }
  const reference = poloSizedReference(state)
  const hectares = (areaM2: number): string =>
    (areaM2 / 10000).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }) + ' ha'
  const values: Record<string, string> = {
    'Demo area': hectares(reference.siteAreaM2),
    'Model irrigation':
      (poloSizedIrrigationM3Year(state) / 1000).toFixed(1) + ' million L/year',
    'Turf disturbed': hectares(reference.siteAreaM2 - data.areasM2.turf),
    'Foundation footprint': hectares(reference.roofAreaM2),
    'Roof footprint': hectares(data.areasM2.roof),
    'Average facility demand': format(reference.averageFacilityMW) + ' MW',
    'Facility electricity':
      format(reference.facilityElectricityGWhYear) + ' GWh/year',
    'Cooling water supplied': format(reference.coolingMakeupM3Day) + ' m³/day',
  }
  if (data.selectedElectricityKWh !== null) {
    const electricity = format(data.selectedElectricityKWh / 1000) + ' MWh'
    values['Selected electricity'] = electricity
    values['Selected test electricity'] = electricity
  }
  if (data.selectedDieselL !== null)
    values['Selected diesel'] = format(data.selectedDieselL) + ' L'
  if (data.rainCapturedM3 !== null)
    values['Roof rain captured'] = format(data.rainCapturedM3) + ' m³'
  if (data.rainManagedDrainageM3 !== null)
    values['Onward drainage'] =
      format(data.rainManagedDrainageM3 / 1000, 1) + ' million L'
  const caveats: Record<string, string> = {
    'Demo area':
      'Selected schematic subset; not a surveyed development parcel.',
    'Model irrigation':
      '300 mm/year teaching allowance; not metered park demand.',
    'Turf disturbed':
      'Unique ground disturbed, counted once; surrounding trees excluded.',
    'Foundation footprint':
      'Visual footprint; foundation-only budgets and runoff unknown.',
    'Roof footprint':
      'Selected roof area; not total floor area or server capacity.',
    'Selected electricity':
      'Temporary power for foundations and structure combined.',
    'Selected diesel':
      'Selected equipment fuel; not the full construction inventory.',
    'Selected test electricity':
      'Selected commissioning tests; generator-test fuel unknown.',
    'Roof rain captured':
      'Same event, empty tank; no within-event release or reuse.',
    'Onward drainage':
      'Modelled event volume; not peak flow or a flood forecast.',
    'Average facility demand':
      'Annual average at selected PUE; not peak or connection rating.',
    'Facility electricity':
      '365-day IT and supporting electricity; not cooling alone.',
    'Cooling water supplied':
      'Average cooling make-up; domestic water and irrigation separate.',
  }
  return {
    ...phase,
    summary:
      phase.id === 'M0'
        ? `A ${format(state.areaHa)}-hectare patch of playing-field grass supports sport and meeting. Surrounding trees and tracks stay outside this example.`
        : phase.summary,
    data,
    details: [
      SCALE_NOTE,
      ...phase.details.map((text) => 'Frozen 4 ha reference: ' + text),
    ],
    metrics: phase.metrics.map((metric) => ({
      ...metric,
      value: values[metric.label] ?? metric.value,
      detail:
        SCALE_NOTE +
        ' ' +
        (caveats[metric.label] ?? 'Selected-size model quantity.'),
    })),
  }
}
