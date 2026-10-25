import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE } from './model.ts'
import { PoloTalkFeed } from './talk-feed.ts'

const foundations = {
  ...INITIAL_POLO_STATE,
  confirmed: true,
  phase: 'M1' as const,
}

describe('Talk preview sequence', () => {
  it('delivers each person once and stops after the fourth reaction', () => {
    const feed = new PoloTalkFeed()
    feed.sync(foundations)
    expect(feed.remaining).toBe(4)
    expect(Array.from({ length: 4 }, () => feed.next()?.id)).toEqual([
      'neighbor',
      'nature',
      'student',
      'operator',
    ])
    expect(feed.remaining).toBe(0)
    expect(feed.next()).toBeUndefined()
  })

  it('does not restart for weather or repeated renders, but supports replay', () => {
    const feed = new PoloTalkFeed()
    feed.sync(foundations)
    feed.next()
    expect(feed.sync({ ...foundations, rain: true })).toBe(false)
    expect(feed.remaining).toBe(3)
    expect(feed.sync(foundations, true)).toBe(true)
    expect(feed.remaining).toBe(4)
  })

  it('replaces stale pending opinions when a new process or improvement starts', () => {
    const feed = new PoloTalkFeed()
    feed.sync(foundations)
    feed.next()
    expect(feed.sync({ ...foundations, phase: 'M4' })).toBe(true)
    expect(feed.next()?.text).toContain('These buildings')
    feed.sync({ ...foundations, improvements: { soil: true } })
    feed.next()
    expect(feed.next()?.text).toContain('Keeping that soil strip')
  })

  it('refreshes proposal reactions and clears the sequence on reset', () => {
    const feed = new PoloTalkFeed()
    const operating = { ...foundations, phase: 'M6' as const }
    feed.sync(operating)
    feed.next()
    feed.sync({ ...operating, proposal: 'green_roof', preview: true })
    expect(feed.next()?.text).toContain('green roof')
    expect(feed.sync(INITIAL_POLO_STATE)).toBe(true)
    expect(feed.remaining).toBe(0)
    expect(feed.next()).toBeUndefined()
    expect(feed.sync(foundations)).toBe(true)
    expect(feed.remaining).toBe(4)
  })
})
