import { afterEach, describe, expect, it, vi } from 'vitest'
import { revealCommunityReplies } from './community-replies.ts'
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
