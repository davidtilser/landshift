import type { CommunityId } from '../../shared/community-contract.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'
import { poloReactions } from './reactions.ts'

export interface PoloOpinion {
  id: CommunityId
  name: string
  avatar: string
  tone: 'concern' | 'possibility'
  text: string
}

const IDEAS: Record<PoloPhase, string> = {
  M0: 'Could computing help people without losing park space?',
  M1: 'Can we build with less disruption?',
  M4: 'Could a smaller footprint leave more public space?',
  M5: 'Let’s test water and power before opening.',
  M6: 'Could we put waste heat to use nearby?',
}

/** Fictional conversation invitations, not votes or measured public opinion. */
export function poloOpinions(state: PoloSceneState): PoloOpinion[] {
  const concern: PoloOpinion = {
    id: 'neighbor',
    name: 'Maya',
    avatar: 'maya',
    tone: 'concern',
    text: poloReactions(state).voices.neighbor.text,
  }
  const idea: PoloOpinion = {
    id: 'operator',
    name: 'Owen',
    avatar: 'owen',
    tone: 'possibility',
    text: IDEAS[state.confirmed ? state.phase : 'M0'],
  }
  if (state.confirmed && state.phase === 'M6' && state.preview) {
    if (state.proposal === 'heat_reuse_neighbors')
      idea.text = state.recipientAvailable
        ? 'Could a pool use that heat?'
        : 'No heat recipient now. Can we find another way?'
    if (state.proposal === 'recycled_water')
      idea.text = 'Let’s explore a recycled water supply.'
    if (state.proposal === 'green_roof')
      return [
        concern,
        {
          id: 'nature',
          name: 'Aisha',
          avatar: 'aisha',
          tone: 'possibility',
          text: poloReactions(state).voices.nature.text,
        },
      ]
  }
  return [concern, idea]
}
