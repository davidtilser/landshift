import type {
  CommunityId,
  CommunityMood,
} from '../../shared/community-contract.ts'
import type {
  ConversationReactions,
  ConversationReaction,
} from '../community-reactions.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'
import { poloReactions } from './reactions.ts'
import { poloConstructionStarted } from './placement.ts'
import { activePoloImprovements } from './interventions.ts'

export interface PoloOpinion {
  id: CommunityId
  name: string
  avatar: string
  tone: 'concern' | 'possibility'
  text: string
  mood?: CommunityMood
  scope?: ConversationReaction['scope']
}

function withConversation(
  opinion: PoloOpinion,
  reactions?: ConversationReactions,
): PoloOpinion {
  const reaction = reactions?.get(opinion.id)
  return reaction
    ? {
        ...opinion,
        text: reaction.text,
        mood: reaction.mood,
        tone: reaction.mood === 'hopeful' ? 'possibility' : 'concern',
        scope: reaction.scope,
      }
    : opinion
}

const IDEAS: Record<PoloPhase, string> = {
  M0: 'Could computing help people without losing park space?',
  M1: 'Can we build with less disruption?',
  M4: 'Could a smaller footprint leave more public space?',
  M5: 'Let’s test water and power before opening.',
  M6: 'Could we put waste heat to use nearby?',
}

/** Portrait reactions are available as soon as the player confirms a site. */
export function poloPortraitOpinions(
  state: PoloSceneState,
  reactions?: ConversationReactions,
): PoloOpinion[] {
  if (!state.confirmed) return []
  const voices = poloReactions(state).voices
  return (
    [
      { id: 'neighbor', name: 'Maya', avatar: 'maya' },
      { id: 'nature', name: 'Aisha', avatar: 'aisha' },
      { id: 'student', name: 'Leo', avatar: 'leo' },
      { id: 'operator', name: 'Owen', avatar: 'owen' },
    ] as const
  ).map((person) => {
    const id = person.id
    return withConversation(
      {
        ...person,
        id,
        tone: voices[id].mood === 'hopeful' ? 'possibility' : 'concern',
        text: voices[id].text,
        mood: voices[id].mood,
      },
      reactions,
    )
  })
}

/** Fictional conversation invitations, not votes or measured public opinion. */
function basePoloOpinions(state: PoloSceneState): PoloOpinion[] {
  if (!poloConstructionStarted(state)) return []
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
  if (activePoloImprovements(state).length)
    idea.text = poloReactions(state).voices.operator.text
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

export function poloOpinions(
  state: PoloSceneState,
  reactions?: ConversationReactions,
): PoloOpinion[] {
  return basePoloOpinions(state).map((opinion) =>
    withConversation(opinion, reactions),
  )
}
