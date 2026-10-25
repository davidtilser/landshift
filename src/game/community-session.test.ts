import { describe, expect, it } from 'vitest'
import { CommunitySession } from './community-session.ts'
import { communityProfiles } from './community-profiles.ts'
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
describe('one public thread with independent private conversations', () => {
  it('updates only the speaker’s bubble after a delivered private answer without publishing it', () => {
    let notifications = 0
    const session = new CommunitySession(() => {
      notifications++
    })
    const profiles = communityProfiles(context)
    session.sync(plan, profiles)
    const profile = profiles[0]
    if (!profile) throw new Error('Missing fixture')
    const current = session.privateThread(profile)
    const initialNotifications = notifications
    session.append(current, [
      {
        speaker: 'planner',
        text: 'Can we compare a different site?',
        source: 'planner',
      },
    ])
    expect(session.bubbleReactions().size).toBe(0)
    expect(notifications).toBe(initialNotifications)
    const reaction = {
      text: 'I appreciate being heard. Our shared space still matters.',
      mood: 'concerned' as const,
    }
    session.append(current, [
      {
        speaker: profile.id,
        text: 'Comparing sites could help. We still need to protect public space.',
        source: 'live',
        reaction,
      },
    ])
    expect(session.bubbleReactions().get(profile.id)).toEqual({
      ...reaction,
      scope: 'private',
    })
    expect(session.bubbleReactions().size).toBe(1)
    expect(notifications).toBe(initialNotifications + 1)
    expect(JSON.stringify(session.history(session.publicThread))).not.toContain(
      'Comparing sites could help',
    )
    expect(JSON.stringify(session.history(session.publicThread))).not.toContain(
      'appreciate being heard',
    )
    expect(session.history(current).at(-1)).toEqual({
      speaker: profile.id,
      text: 'Comparing sites could help. We still need to protect public space.',
    })
  })

  it('keeps each person’s latest private or public reaction and resets them when the plan changes', () => {
    const session = new CommunitySession(),
      profiles = communityProfiles(context)
    session.sync(plan, profiles)
    const profile = profiles.find((item) => item.id === 'neighbor')
    if (!profile) throw new Error('Missing fixture')
    session.append(session.privateThread(profile), [
      {
        speaker: 'neighbor',
        text: 'A private response.',
        source: 'live',
        reaction: {
          text: 'I am glad you asked, but I still disagree.',
          mood: 'concerned',
        },
      },
    ])
    session.replyPublic([
      {
        speaker: 'operator',
        text: 'We can investigate another location.',
        source: 'live',
        reaction: {
          text: 'I think comparing sites is worth exploring.',
          mood: 'hopeful',
        },
      },
    ])
    expect(session.bubbleReactions().get('neighbor')?.scope).toBe('private')
    session.replyPublic([
      {
        speaker: 'neighbor',
        text: 'Let’s compare what we lose at each site.',
        source: 'live',
        reaction: { text: 'I want to see a fair comparison.', mood: 'neutral' },
      },
    ])
    expect(session.bubbleReactions().get('neighbor')).toEqual({
      text: 'I want to see a fair comparison.',
      mood: 'neutral',
      scope: 'community',
    })
    expect(session.bubbleReactions().get('operator')?.mood).toBe('hopeful')
    session.sync(structuredClone(plan), profiles)
    expect(session.bubbleReactions().size).toBe(2)
    session.sync({ ...plan, year: 10 }, profiles)
    expect(session.bubbleReactions().size).toBe(0)
    expect(
      session
        .history(session.publicThread)
        .some((line) => line.text.includes('compare what we lose')),
    ).toBe(true)
    session.replyPublic([
      {
        speaker: 'student',
        text: 'We still need somewhere to play.',
        source: 'demo',
      },
    ])
    expect(session.bubbleReactions().get('student')?.text).toBe(
      'We still need somewhere to play.',
    )
    session.reset()
    expect(session.bubbleReactions().size).toBe(0)
  })

  it('remembers free typing for that person across reopening and plan changes, until reset', () => {
    const session = new CommunitySession(),
      profiles = communityProfiles(context)
    session.sync(plan, profiles)
    const first = profiles[0],
      second = profiles[1]
    if (!first || !second) throw new Error('Missing fixture')
    const conversation = session.privateThread(first)
    expect(conversation.freeText).toBe(false)
    session.useFreeText(conversation)
    session.sync({ ...plan, year: 10 }, profiles)
    expect(session.privateThread(first).freeText).toBe(true)
    expect(session.privateThread(second).freeText).toBe(false)
    session.reset()
    expect(session.privateThread(first).freeText).toBe(false)
  })
  it('starts with one proposal and all four perspectives replying to it', () => {
    const session = new CommunitySession()
    session.sync(plan, communityProfiles(context))
    const lines = session.publicThread.lines
    expect(lines).toHaveLength(5)
    expect(lines[0]?.speaker).toBe('planner')
    expect(new Set(lines.slice(1).map((line) => line.speaker)).size).toBe(4)
    expect(lines.slice(1).every((line) => line.replyTo === lines[0]?.id)).toBe(
      true,
    )
  })
  it('retains the same conversation and replies after changing the map', () => {
    const session = new CommunitySession(),
      profiles = communityProfiles(context)
    session.sync(plan, profiles)
    const publicThread = session.publicThread,
      proposal = publicThread.lines[0]
    const reply = session.append(publicThread, [
      {
        speaker: 'planner',
        text: 'Can we compare another location?',
        source: 'planner',
        ...(proposal ? { replyTo: proposal.id } : {}),
      },
    ])[0]
    session.sync(
      { ...plan, choices: { ...plan.choices, cooling: 'dry' } },
      communityProfiles({
        ...context,
        choices: { ...context.choices, cooling: 'dry' },
      }),
    )
    expect(session.publicThread).toBe(publicThread)
    expect(publicThread.lines[0]).toBe(proposal)
    expect(publicThread.lines).toContain(reply)
    expect(
      publicThread.lines.some(
        (line) => line.kind === 'update' && line.text.includes('air cooling'),
      ),
    ).toBe(true)
  })
  it('never adds private messages to the public thread or its LLM history', () => {
    const session = new CommunitySession(),
      profiles = communityProfiles(context)
    session.sync(plan, profiles)
    const profile = profiles[0]
    if (!profile) throw new Error('Missing fixture')
    const privateThread = session.privateThread(profile)
    session.append(privateThread, [
      {
        speaker: 'planner',
        text: 'A private memory about my family.',
        source: 'planner',
      },
    ])
    session.append(session.publicThread, [
      {
        speaker: 'operator',
        text: 'Could we compare locations?',
        source: 'live',
      },
    ])
    session.sync({ ...plan, year: 10 }, profiles)
    expect(JSON.stringify(session.history(session.publicThread))).not.toContain(
      'family',
    )
    expect(
      session
        .history(privateThread)
        .some((line) => line.speaker === 'operator'),
    ).toBe(false)
    expect(session.privateThread(profile)).toBe(privateThread)
  })
  it('links a generated exchange to its chosen parent in the one timeline', () => {
    const session = new CommunitySession()
    session.sync(plan, communityProfiles(context))
    const target = session.publicThread.lines.find(
      (line) => line.speaker === 'nature',
    )
    if (!target) throw new Error('Missing nature post')
    const replies = session.replyPublic(
      [
        {
          speaker: 'planner',
          text: 'How could we keep this habitat?',
          source: 'planner',
        },
        {
          speaker: 'nature',
          text: 'Compare another footprint first.',
          source: 'live',
        },
        {
          speaker: 'operator',
          text: 'We could compare locations and cooling together.',
          source: 'live',
        },
      ],
      target.id,
    )
    expect(replies[0]?.replyTo).toBe(target.id)
    expect(replies[1]?.replyTo).toBe(replies[0]?.id)
    expect(replies[2]?.replyTo).toBe(replies[1]?.id)
    expect(session.history(session.publicThread).at(-1)?.text).toContain(
      'cooling together',
    )
  })
  it('coalesces tiny placement updates while retaining the prior discussion', () => {
    const session = new CommunitySession(),
      profiles = communityProfiles(context)
    session.sync(plan, profiles)
    const original = [...session.publicThread.lines]
    for (let index = 1; index <= 10; index++)
      session.sync(
        { ...plan, center: [plan.center[0] + index * 0.00004, plan.center[1]] },
        profiles,
      )
    expect(session.publicThread.lines).toHaveLength(6)
    expect(session.publicThread.lines.slice(0, 5)).toEqual(original)
    expect(session.publicThread.lines.at(-1)?.kind).toBe('update')
    expect(session.history(session.publicThread)).toHaveLength(5)
  })
  it('avoids duplicate reactions on ordinary renders and retains history on cancellation', () => {
    const session = new CommunitySession(),
      profiles = communityProfiles(context)
    session.sync(plan, profiles)
    expect(session.sync(structuredClone(plan), profiles)).toBe(false)
    const pending = session.append(session.publicThread, [
      { speaker: 'planner', text: 'A pending question', source: 'planner' },
    ])[0]
    const update = session.append(session.publicThread, [
      {
        speaker: 'planner',
        text: 'Moved campus.',
        source: 'scenario',
        kind: 'update',
      },
    ])[0]
    if (pending) session.remove(session.publicThread, pending.id)
    expect(session.publicThread.lines).toContain(update)
    expect(
      session.publicThread.lines.some(
        (line) => line.text === 'A pending question',
      ),
    ).toBe(false)
  })
  it('bounds model context, preserves the proposal, and clears both conversation types on reset', () => {
    const session = new CommunitySession(),
      profiles = communityProfiles(context)
    session.sync(plan, profiles)
    const proposal = session.publicThread.lines[0],
      profile = profiles[0]
    if (!profile) throw new Error('Missing fixture')
    const privateThread = session.privateThread(profile)
    for (let index = 0; index < 180; index++) {
      session.append(session.publicThread, [
        {
          speaker: 'nature',
          text: 'Public reply ' + String(index),
          source: 'live',
        },
      ])
      session.append(privateThread, [
        {
          speaker: 'neighbor',
          text: 'Private reply ' + String(index),
          source: 'live',
        },
      ])
    }
    expect(session.publicThread.lines).toHaveLength(160)
    expect(session.publicThread.lines[0]).toBe(proposal)
    expect(privateThread.lines).toHaveLength(40)
    expect(session.history(session.publicThread)).toHaveLength(18)
    session.reset()
    expect(session.publicThread.lines).toHaveLength(0)
    expect(session.privateThreads.size).toBe(0)
    session.sync(plan, profiles)
    expect(session.publicThread.lines).toHaveLength(5)
  })
})
