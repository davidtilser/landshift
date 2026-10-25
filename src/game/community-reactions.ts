import type {
  CommunityId,
  CommunityMood,
  CommunityReaction,
} from '../shared/community-contract.ts'

export interface ConversationReaction extends CommunityReaction {
  scope: 'private' | 'community'
}
export type ConversationReactions = ReadonlyMap<
  CommunityId,
  ConversationReaction
>

/** Older and prepared replies use their own words, never inferred agreement. */
export function compactCommunityReply(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const firstSentence = clean.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? clean
  if (firstSentence.length <= 90) return firstSentence
  const cropped = firstSentence.slice(0, 89)
  const wordBoundary = cropped.lastIndexOf(' ')
  return cropped.slice(0, wordBoundary > 0 ? wordBoundary : 89) + '…'
}

export function conversationReaction(
  text: string,
  mood: CommunityMood,
  scope: ConversationReaction['scope'],
  reaction?: CommunityReaction,
): ConversationReaction {
  return {
    text: reaction?.text ?? compactCommunityReply(text),
    mood: reaction?.mood ?? mood,
    scope,
  }
}
