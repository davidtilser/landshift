import type { LngLat } from '../geometry.ts'
import { INITIAL_POLO_STATE, POLO_CENTER } from './model.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'

export function poloPlacementValid(center: LngLat): boolean {
  return (
    center.every(Number.isFinite) &&
    Math.abs(center[0]) <= 180 &&
    Math.abs(center[1]) <= 90
  )
}

export function normalizePoloBearing(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Choose a valid orientation.')
  return ((value % 360) + 360) % 360
}

export function movePoloCampus(
  state: PoloSceneState,
  center: LngLat,
  bearing = state.bearing,
): PoloSceneState {
  if (state.confirmed) return state
  if (!poloPlacementValid(center))
    throw new Error('Choose a location on the map.')
  return {
    ...state,
    center: [...center],
    bearing: normalizePoloBearing(bearing),
  }
}

export function nudgePoloPlacement(
  center: LngLat,
  east: number,
  north: number,
): LngLat {
  return [
    center[0] + east / (111320 * Math.cos((POLO_CENTER[1] * Math.PI) / 180)),
    center[1] + north / 111320,
  ]
}

export function confirmPoloPlacement(state: PoloSceneState): PoloSceneState {
  if (state.confirmed) return state
  if (!poloPlacementValid(state.center))
    throw new Error('Choose a location on the map.')
  return {
    ...INITIAL_POLO_STATE,
    center: [...state.center],
    bearing: normalizePoloBearing(state.bearing),
    confirmed: true,
    phase: 'M1',
  }
}

export function poloPhaseAt(
  state: PoloSceneState,
  phase: PoloPhase,
): PoloSceneState {
  if (!state.confirmed)
    throw new Error('Confirm a location before starting the story.')
  return {
    ...INITIAL_POLO_STATE,
    center: [...state.center],
    bearing: state.bearing,
    confirmed: true,
    phase,
    preview: phase !== 'M6',
    proposal: phase === 'M6' ? 'heat_reuse_neighbors' : null,
  }
}
