import type { LngLat } from '../geometry.ts'

export { POLO_SCENARIO_ID } from '../../shared/scenarios.ts'
// Local OSM place point, used only to position an explicitly schematic campus.
export const POLO_CENTER: LngLat = [-122.49275743961334, 37.76817893476351]
export const POLO_PHASES = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'] as const
export type PoloPhase = (typeof POLO_PHASES)[number]
export const POLO_PROPOSALS = [
  'heat_reuse_neighbors',
  'recycled_water',
  'green_roof',
] as const
export type PoloProposal = (typeof POLO_PROPOSALS)[number]
export interface PoloSceneState {
  center: LngLat
  bearing: number
  confirmed: boolean
  phase: PoloPhase
  proposal: PoloProposal | null
  preview: boolean
  recipientAvailable: boolean
  rain: boolean
}
export const INITIAL_POLO_STATE: PoloSceneState = {
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
