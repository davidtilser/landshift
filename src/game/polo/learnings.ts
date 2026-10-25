import type {
  PoloLearningId,
  PoloLearnings,
  PoloSceneState,
  PoloProposal,
  PoloCustomLearning,
} from './model.ts'

export const POLO_LEARNINGS = [
  {
    id: 'heat',
    icon: '♨',
    title: 'Put waste heat to work',
    lesson: 'Computing produces heat that could help others.',
    action: 'Connect a separate heat loop to a proposed pool.',
    tradeoff: 'Needs a heat user, pipes and power. Backup cooling stays.',
    before: 'Heat rejected outside',
    after: 'Heat link to a proposed pool',
    color: '#e79e52',
  },
  {
    id: 'soil',
    icon: '🌱',
    title: 'Protect soil and add planting',
    lesson: 'Living soil supports plants and absorbs rain.',
    action: 'Keep a soil strip, plant trees and add a walking path.',
    tradeoff: 'Less working space. Plants and paths need care.',
    before: 'Cleared edges',
    after: 'Protected soil + planted path',
    color: '#72a653',
  },
  {
    id: 'water',
    icon: '💧',
    title: 'Use recycled water',
    lesson: 'Cooling needs a reliable water supply.',
    action: 'Add a recycled-water supply and treatment checks.',
    tradeoff: 'Supply, quality and extra energy need checking.',
    before: 'Original water supply',
    after: 'Recycled supply + treatment',
    color: '#bc8ae4',
  },
  {
    id: 'roof',
    icon: '🌿',
    title: 'Add a green roof',
    lesson: 'Roofs change how rain moves through a site.',
    action: 'Add planted roof layers to hold some rain temporarily.',
    tradeoff: 'Needs structural checks, upkeep and sometimes irrigation.',
    before: 'Unplanted roofs',
    after: 'Planted roofs + drainage',
    color: '#91b74a',
  },
] as const satisfies readonly {
  id: PoloLearningId
  icon: string
  title: string
  lesson: string
  action: string
  tradeoff: string
  before: string
  after: string
  color: string
}[]

export type PoloLearning = (typeof POLO_LEARNINGS)[number]

export function selectedPoloLearnings(state: PoloSceneState): PoloLearning[] {
  return POLO_LEARNINGS.filter((item) => state.learnings?.[item.id])
}
export function activePoloLearnings(state: PoloSceneState): PoloLearning[] {
  return state.confirmed && state.phase === 'M6' && state.preview
    ? selectedPoloLearnings(state)
    : []
}
export function selectedCustomPoloLearnings(
  state: PoloSceneState,
): PoloCustomLearning[] {
  return state.customLearnings?.filter((item) => item.selected) ?? []
}
export function activeCustomPoloLearnings(
  state: PoloSceneState,
): PoloCustomLearning[] {
  return state.confirmed && state.phase === 'M6' && state.preview
    ? selectedCustomPoloLearnings(state)
    : []
}
export function hasActivePoloLearningPlan(state: PoloSceneState): boolean {
  return (
    activePoloLearnings(state).length > 0 ||
    activeCustomPoloLearnings(state).length > 0
  )
}
export function applyPoloLearnings(
  state: PoloSceneState,
  choices: PoloLearnings,
  custom: readonly PoloCustomLearning[] = state.customLearnings ?? [],
): PoloSceneState {
  if (!state.confirmed || state.phase !== 'M6') return state
  return {
    ...state,
    center: [...state.center],
    proposal: null,
    rain: false,
    preview:
      Object.values(choices).some(Boolean) ||
      custom.some((item) => item.selected && Boolean(item.text.trim())),
    learnings: { ...choices },
    customLearnings: custom
      .map((item) => ({ ...item, text: item.text.trim() }))
      .filter((item) => item.text),
    improvements: undefined,
  }
}
export function poloProposalActive(
  state: PoloSceneState,
  proposal: PoloProposal,
): boolean {
  if (!state.confirmed || state.phase !== 'M6' || !state.preview) return false
  const learning: PoloLearningId =
    proposal === 'heat_reuse_neighbors'
      ? 'heat'
      : proposal === 'recycled_water'
        ? 'water'
        : 'roof'
  return state.learnings?.[learning] === true || state.proposal === proposal
}
