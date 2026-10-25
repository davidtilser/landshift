import { afterEach, describe, expect, it, vi } from 'vitest'
import { revealCommunityReplies } from './community-replies.ts'
import { CommunityClient } from './community-client.ts'
import { DEFAULT_CHOICES } from './consequences.ts'
import { INITIAL_POLO_STATE } from './polo/model.ts'
import { poloDiscussionContext } from './polo/context.ts'
import type { CommunityRequest } from '../shared/community-contract.ts'
import { CommunitySession } from './community-session.ts'
import type { CommunityReply } from '../shared/community-contract.ts'

const messages: CommunityReply['messages'] = [
  {
    speaker: 'neighbor',
    text: 'The memorial is still at risk.',
    communityMood: {
      angry: 10,
      concerned: 80,
      neutral: 5,
      hopeful: 5,
      reason: 'The memorial concern remains.',
    },
  },
  {
    speaker: 'operator',
    text: 'We could compare sites outside the park.',
    communityMood: {
      angry: 8,
      concerned: 76,
      neutral: 8,
      hopeful: 8,
      reason: 'An alternative could be worth exploring.',
    },
  },
]
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
describe('public messages and their mood snapshots', () => {
  it('updates percentages with each visible reply rather than the whole round', async () => {
    vi.useFakeTimers()
    const session = new CommunitySession()
    let parent: number | undefined
    const reveal = revealCommunityReplies(
      messages,
      new AbortController().signal,
      (line) => {
        parent = session.replyPublic([{ ...line, source: 'live' }], parent)[0]
          ?.id
      },
    )
    expect(session.publicThread.lines).toHaveLength(1)
    expect(session.publicMood?.concerned).toBe(80)
    await vi.advanceTimersByTimeAsync(1600)
    expect(await reveal).toBe(true)
    expect(session.publicThread.lines).toHaveLength(2)
    expect(session.publicMood?.concerned).toBe(76)
    expect(session.publicThread.lines[1]?.replyTo).toBe(
      session.publicThread.lines[0]?.id,
    )
  })
  it('keeps delivered replies and prevents late mood updates after closing or typing', async () => {
    vi.useFakeTimers()
    const session = new CommunitySession(),
      controller = new AbortController()
    const reveal = revealCommunityReplies(
      messages,
      controller.signal,
      (line) => {
        session.replyPublic([{ ...line, source: 'live' }])
      },
    )
    controller.abort()
    await vi.advanceTimersByTimeAsync(10000)
    expect(await reveal).toBe(false)
    expect(session.publicThread.lines).toHaveLength(1)
    expect(session.publicMood?.concerned).toBe(80)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('Polo private reply routing', () => {
  const state = {
    ...INITIAL_POLO_STATE,
    confirmed: true,
    phase: 'M6' as const,
    proposal: 'heat_reuse_neighbors' as const,
  }
  const context = poloDiscussionContext(state)
  const request: CommunityRequest = {
    mode: 'private',
    target: 'student',
    message: 'Who would gain from this?',
    history: [],
    plan: {
      scenarioId: 'golden-gate-polo',
      center: [...state.center],
      bearing: state.bearing,
      choices: { ...DEFAULT_CHOICES },
      year: 0,
      weather: 'drought',
      polo: state,
    },
  }
  it('uses the actual custom question for the offline fallback', async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(Response.json({ configured: false, model: 'offline' })),
    )
    vi.stubGlobal('fetch', fetch)
    const client = new CommunityClient()
    const response = await client.exchange(
      request,
      context,
      new AbortController().signal,
    )
    expect(response.source).toBe('demo')
    expect(response.model).toBe('Authored scenario')
    expect(response.messages[0]?.text).toContain('no jobs or training places')
    expect(response.messages[0]?.text).toContain('fictional pool')
    const followup = await client.exchange(
      { ...request, message: 'What if nobody needs the heat?' },
      context,
      new AbortController().signal,
    )
    expect(followup.messages[0]?.text).toContain('Delivery stops')
    expect(followup.messages[0]?.text).not.toBe(response.messages[0]?.text)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('preserves the configured live path and its full conversation context', async () => {
    const live = {
      source: 'live',
      model: 'configured-model',
      messages: [
        { speaker: 'student', text: 'A live answer to your own question.' },
      ],
    }
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ configured: true, model: 'configured-model' }),
      )
      .mockResolvedValueOnce(Response.json(live))
    vi.stubGlobal('fetch', fetch)
    const client = new CommunityClient()
    const withHistory: CommunityRequest = {
      ...request,
      history: [
        { speaker: 'planner', text: 'Who benefits?' },
        {
          speaker: 'student',
          text: 'Computing users, but public space is lost.',
        },
      ],
    }
    const controller = new AbortController()
    const response = await client.exchange(
      withHistory,
      context,
      controller.signal,
    )
    expect(response).toEqual(live)
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('api/community'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(withHistory),
        signal: controller.signal,
      }),
    )
  })
  it('does not deliver a local answer after cancellation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(Response.json({ configured: false, model: 'offline' })),
      ),
    )
    const controller = new AbortController()
    controller.abort()
    await expect(
      new CommunityClient().exchange(request, context, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
