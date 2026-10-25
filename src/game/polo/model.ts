import type { LngLat } from '../geometry.ts'

export { POLO_SCENARIO_ID } from '../../shared/scenarios.ts'
// Local OSM place point, used only to position an explicitly schematic campus.
export const POLO_CENTER: LngLat = [-122.49275743961334, 37.76817893476351]
export const POLO_DEFAULT_AREA_HA = 4
export const POLO_MIN_AREA_HA = 2
export const POLO_MAX_AREA_HA = 6
export const POLO_AREA_STEP_HA = 0.5
// Stable IDs preserve the original research references. M1 is now a visual
// foundations checkpoint; M2/M3 remain research snapshots, not story stops.
export const POLO_PHASES = ['M0', 'M1', 'M4', 'M5', 'M6'] as const
export type PoloPhase = (typeof POLO_PHASES)[number]
export const POLO_RESEARCH_PHASES = [
  'M0',
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'M6',
] as const
export type PoloResearchPhase = (typeof POLO_RESEARCH_PHASES)[number]
export const POLO_PROPOSALS = [
  'heat_reuse_neighbors',
  'recycled_water',
  'green_roof',
] as const
export type PoloProposal = (typeof POLO_PROPOSALS)[number]
export interface PoloSceneState {
  areaHa: number
  center: LngLat
  bearing: number
  confirmed: boolean
  phase: PoloPhase
  proposal: PoloProposal | null
  preview: boolean
  recipientAvailable: boolean
  rain: boolean
  improvements?:
    | Partial<Record<'soil' | 'foundation' | 'grounds', boolean | undefined>>
    | undefined
}
export const INITIAL_POLO_STATE: PoloSceneState = {
  areaHa: POLO_DEFAULT_AREA_HA,
  center: [...POLO_CENTER],
  bearing: 0,
  confirmed: false,
  phase: 'M0',
  proposal: null,
  preview: true,
  recipientAvailable: true,
  rain: false,
}
export const POLO_PROPOSAL_NAMES: Record<PoloProposal, string> = {
  heat_reuse_neighbors: 'Heat for neighbours',
  recycled_water: 'Recycled water',
  green_roof: 'Green roof',
}
