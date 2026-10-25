import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  privateReplyWithTyping,
  revealCommunityReplies,
} from './community-replies.ts'
import { CommunityClient } from './community-client.ts'
import { DEFAULT_CHOICES } from './consequences.ts'
import { INITIAL_POLO_STATE } from './polo/model.ts'
import { poloDiscussionContext } from './polo/context.ts'
import type {
  CommunityRequest,
  CommunityResponse,
} from '../shared/community-contract.ts'
import { CommunitySession } from './community-session.ts'
import type { CommunityReply } from '../shared/community-contract.ts'

const messages: CommunityReply['messages'] = [
  {
    speaker: 'neighbor',
    text: 'The memorial is still at risk.',
    reaction: {
      text: 'I still want this memorial protected.',
      mood: 'concerned',
    },
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
    reaction: {
      text: 'I think another site deserves a look.',
      mood: 'hopeful',
    },
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
describe('private reply typing', () => {
  const response: CommunityResponse = {
    messages: [{ speaker: 'neighbor', text: 'Our team uses this field.' }],
    source: 'demo',
    model: 'Prepared conversation',
  }
  it('holds an instant reply for one second', async () => {
    vi.useFakeTimers()
    const delivered = vi.fn()
    const reply = privateReplyWithTyping(
      () => response,
      new AbortController().signal,
    ).then(delivered)
    await vi.advanceTimersByTimeAsync(999)
    expect(delivered).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await reply
    expect(delivered).toHaveBeenCalledWith(response)
  })
  it('counts request time toward typing and adds no delay to a slow reply', async () => {
    vi.useFakeTimers()
    const delivered = vi.fn()
    let resolveReply!: (value: CommunityResponse) => void
    const request = new Promise<CommunityResponse>((resolve) => {
      resolveReply = resolve
    })
    const reply = privateReplyWithTyping(
      () => request,
      new AbortController().signal,
    ).then(delivered)
    await vi.advanceTimersByTimeAsync(1500)
    resolveReply(response)
    await reply
    expect(delivered).toHaveBeenCalledWith(response)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('cleans up the typing timer on cancellation so the chat can ignore the reply', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const reply = privateReplyWithTyping(() => response, controller.signal)
    await vi.advanceTimersByTimeAsync(100)
    controller.abort()
    await reply
    expect(controller.signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
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
    expect(session.bubbleReactions().get('neighbor')?.text).toBe(
      'I still want this memorial protected.',
    )
    expect(session.bubbleReactions().has('operator')).toBe(false)
    await vi.advanceTimersByTimeAsync(1600)
    expect(await reveal).toBe(true)
    expect(session.publicThread.lines).toHaveLength(2)
    expect(session.publicMood?.concerned).toBe(76)
    expect(session.bubbleReactions().get('operator')?.mood).toBe('hopeful')
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
    expect(session.bubbleReactions().has('operator')).toBe(false)
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
    expect(response.model).toBe('Prepared conversation')
    expect(response.messages[0]?.text).toContain('no jobs or training places')
    expect(response.messages[0]?.text).toContain('proposed pool')
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
