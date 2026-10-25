import { describe, expect, it } from 'vitest'
import {
  compactCommunityReply,
  conversationReaction,
} from './community-reactions.ts'
import { communityReactionSchema } from '../shared/community-contract.ts'

describe('compact conversation reactions', () => {
  it('uses a prepared reply’s first sentence without inventing agreement', () => {
    expect(
      conversationReaction(
        'I still want our field. A path is not a playing pitch.',
        'angry',
        'private',
      ),
    ).toEqual({
      text: 'I still want our field.',
      mood: 'angry',
      scope: 'private',
    })
    const long = compactCommunityReply(
      'We need to compare every possible location and carefully consider how each option would affect the places people already share before making a decision.',
    )
    expect(long.length).toBeLessThanOrEqual(90)
    expect(long.endsWith('…')).toBe(true)
    expect(long).not.toContain('agree')
  })

  it('validates generated reaction length and personal emotion independently of crowd percentages', () => {
    expect(
      communityReactionSchema.safeParse({
        text: 'I still need somewhere to play.',
        mood: 'concerned',
      }).success,
    ).toBe(true)
    expect(
      communityReactionSchema.safeParse({
        text: 'x'.repeat(91),
        mood: 'hopeful',
      }).success,
    ).toBe(false)
    expect(
      communityReactionSchema.safeParse({
        text: 'Everyone approves.',
        mood: 'approved',
      }).success,
    ).toBe(false)
  })
})
