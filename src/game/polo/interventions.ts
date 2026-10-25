import { POLO_PHASES } from './model.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'
import { activePoloLearnings } from './learnings.ts'

export type InterventionId = 'soil' | 'foundation' | 'grounds'
export interface Intervention {
  id: InterventionId
  phase: PoloPhase
  at: number
  title: string
  problem: string
  instruction: string
  benefit: string
  tradeoff: string
  speaker: string
  reaction: string
  cells: readonly (readonly [number, number])[]
}
export const POLO_INTERVENTIONS: readonly Intervention[] = [
  {
    id: 'soil',
    phase: 'M1',
    at: 0,
    title: 'Protect this green strip',
    problem: 'Clearing the site will remove this patch of grass and soil.',
    instruction: 'Drag across the glowing dots to protect the strip.',
    benefit: 'Keeps existing grass and living soil out of the clearing work.',
    tradeoff: 'Leaves less space for construction work.',
    speaker: 'Aisha · soil volunteer',
    reaction:
      'Keeping that strip helps. It needs care—and our field still matters.',
    cells: [-125, -75, -25, 25, 75, 125].map((x) => [x, 44] as const),
  },
  {
    id: 'foundation',
    phase: 'M1',
    at: 0.5,
    title: 'Strengthen the foundation',
    problem: 'You can add extra support to six marked foundation sections.',
    instruction: 'Hold and drag over the dots to add concrete.',
    benefit: 'Adds reinforcement beneath the building.',
    tradeoff: 'Uses more concrete. A structural inspection is still needed.',
    speaker: 'Owen · campus designer',
    reaction: 'The marked sections are reinforced. More concrete has a cost.',
    cells: [-95, -65, -35, 35, 65, 95].map((x) => [x, 0] as const),
  },
  {
    id: 'grounds',
    phase: 'M5',
    at: 0.65,
    title: 'Add a planted walking path',
    problem: 'People need a connected route around the new building.',
    instruction: 'Paint the dots to add planting and a connected path.',
    benefit: 'Adds a walking route, trees and planting along the edge.',
    tradeoff: 'Needs upkeep and does not replace the lost playing field.',
    speaker: 'Maya · park regular',
    reaction:
      'The path helps us walk here. Our team still needs somewhere to play.',
    cells: [-125, -75, -25, 25, 75, 125].map((x) => [x, -56] as const),
  },
]

export type InterventionDecisions = Partial<
  Record<InterventionId, 'done' | 'skipped'>
>
export function nextPoloIntervention(
  state: PoloSceneState,
  progress: number,
  decisions: InterventionDecisions,
): Intervention | undefined {
  if (!state.confirmed || !Number.isFinite(progress)) return undefined
  return POLO_INTERVENTIONS.find(
    (item) =>
      item.phase === state.phase &&
      progress >= item.at &&
      !decisions[item.id] &&
      !state.improvements?.[item.id],
  )
}
export function activePoloImprovements(state: PoloSceneState): Intervention[] {
  if (!state.confirmed) return []
  const planted = activePoloLearnings(state).some((item) => item.id === 'soil')
  return POLO_INTERVENTIONS.filter(
    (item) =>
      (state.improvements?.[item.id] ||
        (planted && (item.id === 'soil' || item.id === 'grounds'))) &&
      POLO_PHASES.indexOf(state.phase) >= POLO_PHASES.indexOf(item.phase),
  )
}
export function poloImprovementSummary(state: PoloSceneState): string {
  return activePoloImprovements(state)
    .map((item) => item.title + ': ' + item.benefit + ' ' + item.tradeoff)
    .join(' ')
}
/** Cell IDs are a set: clicking or crossing the same patch never adds extra material. */
export function paintPoloIntervention(
  item: Intervention,
  painted: readonly number[],
  index: number,
): number[] {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= item.cells.length ||
    painted.includes(index)
  )
    return [...painted]
  return [...painted, index].sort((a, b) => a - b)
}
export interface InterventionPreview {
  id: InterventionId
  cells: readonly number[]
}
