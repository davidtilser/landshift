import type { PoloBaselinePhase } from './baseline.ts'
import type { PoloSceneState } from './model.ts'
import {
  poloSizedIrrigationM3Year,
  poloSizedPhase,
  poloSizedReference,
} from './size.ts'
import { poloUsText, usAcres, usGallons } from './us-units.ts'
import { poloPlanningText } from './planning-copy.ts'

/** US presentation of the same phase; SI data and frozen research stay intact. */
export function poloDisplayPhase(state: PoloSceneState): PoloBaselinePhase {
  const phase = poloSizedPhase(state)
  const reference = poloSizedReference(state)
  const data = phase.data
  const values: Record<string, string> = {
    'Demo area': usAcres(reference.siteAreaM2),
    'Model irrigation': usGallons(poloSizedIrrigationM3Year(state)) + '/year',
    'Turf disturbed': usAcres(reference.siteAreaM2 - data.areasM2.turf),
    'Foundation footprint': usAcres(reference.roofAreaM2),
    'Roof footprint': usAcres(data.areasM2.roof),
    'Cooling water supplied': usGallons(reference.coolingMakeupM3Day) + '/day',
  }
  if (data.selectedDieselL !== null)
    values['Selected diesel'] = usGallons(data.selectedDieselL / 1000)
  if (data.rainCapturedM3 !== null)
    values['Roof rain captured'] = usGallons(data.rainCapturedM3)
  if (data.rainManagedDrainageM3 !== null)
    values['Onward drainage'] = usGallons(data.rainManagedDrainageM3)
  return {
    ...phase,
    summary: poloPlanningText(poloUsText(phase.summary)),
    tradeoff: poloPlanningText(poloUsText(phase.tradeoff)),
    details: phase.details.map((text) => poloPlanningText(poloUsText(text))),
    metrics: phase.metrics.map((metric) => ({
      ...metric,
      label: metric.label === 'Demo area' ? 'Site area' : metric.label,
      value: values[metric.label] ?? poloUsText(metric.value),
      detail: poloPlanningText(poloUsText(metric.detail)),
    })),
  }
}
