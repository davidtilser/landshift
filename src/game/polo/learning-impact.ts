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

type PoloLearningBenefit = {
  value: string
  label: string
  context: string
  explanation: string
}

/** One primary benefit per concept. Only heat has a calculated example;
 * the other concepts describe mechanisms without inventing site savings.
 */
export const POLO_LEARNING_BENEFITS: Record<
  PoloLearningId,
  PoloLearningBenefit
> = {
  heat: {
    value: `${String(POLO_HEAT_IMPACT_EXAMPLE.coveragePercent)}%`,
    label: 'of heating covered',
    context: 'Two-building example',
    explanation: `${POLO_HEAT_IMPACT_EXAMPLE.recipients} · ${String(POLO_HEAT_IMPACT_EXAMPLE.year)} teaching example: ${POLO_HEAT_IMPACT_EXAMPLE.usefulHeatMWhYear} MWh of useful heat per year against ${String(POLO_HEAT_IMPACT_EXAMPLE.demandMWhYear)} MWh of assumed heating demand. Recovery adds ${POLO_HEAT_IMPACT_EXAMPLE.addedElectricityMWhYear} MWh of electricity per year. Assumed connections and heat-pump performance; backup heating remains. This is separate from the map’s pool and is not a neighbourhood electricity-saving percentage.`,
  },
  soil: {
    value: 'More',
    label: 'living soil retained',
    context: 'Planted strip · benefit not quantified',
    explanation:
      'The proposal protects a soil strip and adds planting along the campus edge instead of clearing it. Living soil can absorb some rain. Retained area, infiltration and runoff changes have not been calculated; the playing field is still lost.',
  },
  water: {
    value: 'Less',
    label: 'drinking water for cooling',
    context: 'Potential benefit · not quantified',
    explanation:
      'A separate recycled-water supply could replace some drinking water used for cooling. Supply availability, allocation and treatment quality need checking. No saved volume, cost or energy result has been calculated.',
  },
  roof: {
    value: 'Rain',
    label: 'held temporarily on the roof',
    context: 'Potential benefit · not quantified',
    explanation:
      'Vegetation, substrate and drainage layers can hold some rain temporarily before it drains. No retention volume or runoff reduction has been calculated. Structural checks, maintenance and sometimes irrigation are needed.',
  },
}
