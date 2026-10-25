import {
  poloSizedPhase,
  poloSizedReference,
  poloSizedIrrigationM3Year,
} from './size.ts'
import { POLO_DEFAULT_AREA_HA } from './model.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'
import { usAcres, usGallons, usNumber } from './us-units.ts'

export type EnvironmentalLayer = 'water' | 'electricity' | 'land' | 'heat'
export const ENVIRONMENTAL_LAYERS: Record<EnvironmentalLayer, string> = {
  water: 'Water',
  electricity: 'Electricity',
  land: 'Land',
  heat: 'Heat',
}

/** Authored game index, not approval percentages, a poll or consent. */
const SUPPORT: Record<PoloPhase, number> = {
  M0: 16,
  M1: 12,
  M4: 8,
  M5: 10,
  M6: 12,
}
export function poloSupport(state: PoloSceneState): number {
  const base = SUPPORT[state.confirmed ? state.phase : 'M0']
  if (!state.confirmed || state.phase !== 'M6' || !state.preview) return base
  switch (state.proposal) {
    case 'heat_reuse_neighbors':
      return base + (state.recipientAvailable ? 6 : 0)
    case 'recycled_water':
      return base + 4
    case 'green_roof':
      return base + 3
    case null:
      return base
  }
}

export interface ImpactCard {
  title: string
  baseline: string
  current: string
  detail: string
  evidence: string
}

/** Compare the same phase and footprint. Unknown proposal savings stay unknown. */
export function poloImpact(state: PoloSceneState): ImpactCard[] {
  const phase = poloSizedPhase(state, state.confirmed ? state.phase : 'M0')
  const reference = poloSizedReference(state)
  const proposal =
    state.confirmed && state.phase === 'M6' && state.preview
      ? state.proposal
      : null
  const operating = state.confirmed && state.phase === 'M6'
  const water =
    phase.id === 'M0'
      ? `${usGallons(poloSizedIrrigationM3Year(state))}/year`
      : operating
        ? `${usGallons(reference.coolingMakeupM3Day)}/day`
        : phase.data.stageWaterSuppliedM3 === null
          ? 'Unknown'
          : `${usGallons(phase.data.stageWaterSuppliedM3)} / stage`
  const power = operating
    ? `${usNumber(reference.facilityElectricityGWhYear)} GWh/year`
    : phase.data.selectedElectricityKWh === null
      ? 'Unknown'
      : `${usNumber(phase.data.selectedElectricityKWh / 1000)} MWh / stage`
  const noBuild = poloSizedPhase(state, 'M0').data.areasM2.turf
  const turfLost = noBuild - phase.data.areasM2.turf
  const support = poloSupport(state)
  const baselineSupport = poloSupport({
    ...state,
    proposal: null,
    preview: false,
  })
  const heatActive =
    proposal === 'heat_reuse_neighbors' && state.recipientAvailable
  return [
    {
      title: phase.id === 'M0' ? 'Irrigation allowance' : 'Water supply',
      baseline: water,
      current:
        proposal === 'recycled_water'
          ? 'Source changes'
          : proposal
            ? 'Not quantified'
            : water,
      detail:
        phase.id === 'M0'
          ? 'Irrigation teaching allowance; actual supply and use are unknown.'
          : proposal === 'recycled_water'
            ? 'Cooling still needs water. Supply and quality need checking.'
            : 'No verified proposal saving. This is a teaching baseline.',
      evidence:
        state.areaHa === POLO_DEFAULT_AREA_HA
          ? 'Derived model · same phase'
          : 'Area-proportional teaching model · same phase',
    },
    {
      title: 'Electricity',
      baseline: power,
      current: proposal ? 'Not quantified' : power,
      detail:
        proposal === 'heat_reuse_neighbors'
          ? 'Heat pumps and circulation add an unquantified power demand.'
          : 'Whole-project energy savings are not established.',
      evidence:
        state.areaHa === POLO_DEFAULT_AREA_HA
          ? 'Derived model · same phase'
          : 'Area-proportional teaching model · same phase',
    },
    {
      title: 'Public turf lost',
      baseline: usAcres(turfLost),
      current: usAcres(turfLost),
      detail: 'Compared with Today. Roof plants do not restore the field.',
      evidence:
        state.areaHa === POLO_DEFAULT_AREA_HA
          ? 'Authored land allocation'
          : 'Area-proportional teaching land allocation',
    },
    {
      title: 'Heat delivery',
      baseline: 'No reuse link',
      current: heatActive ? 'Recipient linked' : 'No delivery',
      detail: heatActive
        ? 'Fictional pool can receive heat. Backup heating remains.'
        : 'A recipient and built infrastructure are needed.',
      evidence: 'Visual concept · no savings model',
    },
    {
      title: 'Community support',
      baseline: `${String(baselineSupport)} / 100`,
      current: `${String(support)} / 100`,
      detail: `${support >= baselineSupport ? '+' : ''}${String(support - baselineSupport)} index points. Loss of public space keeps opposition high.`,
      evidence: 'Authored game index · not a poll',
    },
  ]
}
