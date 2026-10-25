import { describe, expect, it } from 'vitest'
import { communityVoices } from './community.ts'
import { DEFAULT_CHOICES } from './consequences.ts'
import { scriptedDiscussion } from './discussion.ts'
import type { DiscussionContext, DiscussionRequest } from './discussion.ts'
import type { VoiceId } from './community.ts'

const context: DiscussionContext = {
  choices: { ...DEFAULT_CHOICES },
  site: { buildings: 0, water: 0, parks: 0, trees: 0, flood: 1 },
  year: 0,
  weather: 'drought',
}
function request(
  question: string,
  id: VoiceId = 'neighbor',
  current = context,
): DiscussionRequest {
  const voice = communityVoices(current.choices, current.site).find(
    (item) => item.id === id,
  )
  if (!voice) throw new Error('Missing test speaker')
  return { voice, question, history: [], context: current }
}

describe('scripted character discussion', () => {
  it('clearly identifies the adapter as scripted and leaves the plan unchanged', () => {
    const before = structuredClone(context)
    const reply = scriptedDiscussion(request('What should I try?'))
    expect(reply.source).toBe('scripted')
    expect(reply.text).toContain('cooling with less water')
    expect(context).toEqual(before)
  })
  it('responds to the latest cooling choice rather than an old conversation', () => {
    const current: DiscussionContext = {
      ...context,
      choices: { ...DEFAULT_CHOICES, cooling: 'hybrid' },
    }
    const followup = request('Why?', 'neighbor', current)
    followup.history = [
      { role: 'user', text: 'What about water?' },
      { role: 'assistant', text: 'Old plan used water cooling.' },
    ]
    expect(scriptedDiscussion(followup).text).toContain(
      'uses less direct water',
    )
    expect(scriptedDiscussion(followup).text).toContain('more electricity')
  })
  it('does not turn greening and training into flood protection', () => {
    const current: DiscussionContext = {
      ...context,
      choices: {
        cooling: 'hybrid',
        trees: 60,
        restoration: 'rain-garden',
        training: true,
        access: true,
      },
    }
    const reply = scriptedDiscussion(
      request('Is it safe from flooding now?', 'nature', current),
    )
    expect(reply.text).toContain('do not remove')
    expect(reply.text).toContain('cannot tell flood depth')
  })
  it('does not call an unflagged footprint guaranteed safe', () => {
    const current: DiscussionContext = {
      ...context,
      site: { ...context.site, flood: 0 },
    }
    expect(
      scriptedDiscussion(request('Is this safe?', 'neighbor', current)).text,
    ).toContain('not a guarantee')
  })
  it('keeps training commitments distinct from real employment forecasts', () => {
    const current: DiscussionContext = {
      ...context,
      choices: { ...DEFAULT_CHOICES, training: true },
    }
    const reply = scriptedDiscussion(
      request('Will this give me a job?', 'student', current),
    )
    expect(reply.text).toContain('planned places')
    expect(reply.text).toContain('not guaranteed jobs')
  })
  it('does not erase occupied-footprint concerns after upgrades', () => {
    const current: DiscussionContext = {
      ...context,
      site: { ...context.site, buildings: 1 },
      choices: { ...DEFAULT_CHOICES, trees: 60, training: true },
    }
    expect(
      scriptedDiscussion(
        request('Where should I place it?', 'neighbor', current),
      ).text,
    ).toContain('cannot cancel that conflict')
  })
  it('gives speakers distinct perspectives on the same resource question', () => {
    const neighbor = scriptedDiscussion(
      request('What about water?', 'neighbor'),
    ).text
    const nature = scriptedDiscussion(
      request('What about water?', 'nature'),
    ).text
    expect(nature).not.toBe(neighbor)
    expect(nature).toContain('Living things need water')
  })
  it('handles unsupported input with honest demo topics rather than invented answers', () => {
    const reply = scriptedDiscussion(request('Write a rocket engine simulator'))
    expect(reply.source).toBe('scripted')
    expect(reply.text).toContain('We can discuss')
  })
})
