import type { PoloLearningId } from './model.ts'
import heatResults from '../../../docs/research/heat-demo-golden-gate-polo/results.json' with { type: 'json' }

/** Mechanisms of the selected concepts, not calculated campus savings. */
export const POLO_LEARNING_IMPACTS: Record<PoloLearningId, string> = {
  soil: 'Keeps living soil and planting to absorb some rain.',
  water: 'Could reduce drinking-water use for cooling.',
  heat: 'Could replace part of the pool’s heating demand.',
  roof: 'Holds some rain temporarily and adds planted space.',
}

/** Separate fixed two-building research example; never bound to the map's pool,
 * scaled with campus size, or subtracted from the campus electricity reference.
 */
export const POLO_HEAT_IMPACT_EXAMPLE = {
  year: heatResults.reference_year,
  recipients: heatResults.recipients.map((item) => item.name).join(' + '),
  coveragePercent: Math.round(heatResults.annual.coverage_percent),
  usefulHeatMWhYear: heatResults.annual.delivered_mwh_th.toFixed(1),
  demandMWhYear: heatResults.annual.demand_mwh_th,
  addedElectricityMWhYear:
    heatResults.annual.additional_electricity_mwh_el.toFixed(1),
}
