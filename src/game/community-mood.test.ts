import { describe, expect, it } from 'vitest'
import {
  communityReplySchema,
  communityMoodBreakdownSchema,
  communityRequestSchema,
} from '../shared/community-contract.ts'
import { communityProfiles } from './community-profiles.ts'
import { CommunitySession } from './community-session.ts'
import { DEFAULT_CHOICES } from './consequences.ts'
import type { DiscussionContext } from './discussion.ts'
import type { PlannerState } from '../shared/community-contract.ts'

const context: DiscussionContext = {
  choices: { ...DEFAULT_CHOICES },
  year: 0,
  weather: 'drought',
  site: {
    buildings: 0,
    trees: 0,
    water: 0,
    parks: 1,
    flood: 0,
    heritage: 1,
    heritageContext: true,
  },
}
const plan: PlannerState = {
  scenarioId: 'golden-gate-park',
  center: [-122.46889, 37.77293],
  bearing: 28,
  choices: { ...DEFAULT_CHOICES },
  year: 0,
  weather: 'drought',
}
describe('simulated community mood percentages', () => {
  it('starts with an authored distribution reflecting the scenario, totaling 100', () => {
    const session = new CommunitySession()
    session.sync(plan, communityProfiles(context))
    const mood = session.publicMood
    expect(mood?.concerned).toBeGreaterThan(mood?.hopeful ?? 0)
    expect(communityMoodBreakdownSchema.safeParse(mood).success).toBe(true)
  })
  it('applies a validated public distribution with its discussion reason', () => {
    const session = new CommunitySession()
    session.sync(plan, communityProfiles(context))
    const response = communityReplySchema.parse({
      messages: [
        {
          speaker: 'neighbor',
          text: 'The footprint still needs to move.',
          communityMood: {
            angry: 5,
            concerned: 90,
            neutral: 4,
            hopeful: 1,
            reason: 'The memorial is still at risk.',
          },
        },
      ],
    })
    session.replyPublic(
      response.messages.map((line) => ({ ...line, source: 'live' })),
    )
    expect(session.publicMood?.concerned).toBe(90)
    expect(session.publicMood?.angry).toBe(5)
    expect(session.publicMood?.reason).toBe('The memorial is still at risk.')
  })
  it('does not expose private reactions through the public percentages', () => {
    const session = new CommunitySession(),
      profiles = communityProfiles(context)
    session.sync(plan, profiles)
    const person = profiles[0]
    if (!person) throw new Error('Missing fixture')
    const before = session.publicMood
    session.append(session.privateThread(person), [
      {
        speaker: 'neighbor',
        text: 'A private concern.',
        source: 'live',
        communityMood: {
          angry: 90,
          concerned: 10,
          neutral: 0,
          hopeful: 0,
          reason: 'A private feeling.',
        },
      },
    ])
    expect(session.publicMood).toBe(before)
  })
  it('rejects percentages that do not total 100, invalid values and oversized reasons', () => {
    const mood = {
      angry: 5,
      concerned: 90,
      neutral: 4,
      hopeful: 1,
      reason: 'Concern remains.',
    }
    for (const invalid of [
      { ...mood, concerned: 95 },
      { ...mood, angry: -1 },
      { ...mood, angry: 5.5 },
      { ...mood, concerned: 101 },
      { ...mood, reason: 'x'.repeat(111) },
    ])
      expect(communityMoodBreakdownSchema.safeParse(invalid).success).toBe(
        false,
      )
    expect(
      communityRequestSchema.safeParse({
        mode: 'discussion',
        target: 'neighbor',
        plan,
        history: [],
        message: '',
        previousMood: { ...mood, concerned: 95 },
      }).success,
    ).toBe(false)
  })
  it('retains percentages on reopen and resets them with the scenario', () => {
    const session = new CommunitySession(),
      profiles = communityProfiles(context)
    session.sync(plan, profiles)
    const original = session.publicMood
    session.replyPublic([
      {
        speaker: 'neighbor',
        text: 'People feel unheard.',
        source: 'live',
        communityMood: {
          angry: 50,
          concerned: 40,
          neutral: 5,
          hopeful: 5,
          reason: 'People feel unheard.',
        },
      },
    ])
    session.sync(plan, profiles)
    expect(session.publicMood?.angry).toBe(50)
    session.reset()
    expect(session.publicMood).toBeUndefined()
    session.sync(plan, profiles)
    expect(session.publicMood).toEqual(original)
  })
})
