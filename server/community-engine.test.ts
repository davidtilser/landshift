import { describe, expect, it } from 'vitest'
import { OpenRouter } from '@openrouter/sdk'
import { HTTPClient } from '@openrouter/sdk/lib/http.js'
import { z } from 'zod'
import { communityPrompt, generateCommunityReply } from './community-engine.ts'
import {
  communityRequestSchema,
  DEFAULT_COMMUNITY_MODEL,
} from '../src/shared/community-contract.ts'
import type {
  CommunityReply,
  CommunityRequest,
} from '../src/shared/community-contract.ts'
import { DEFAULT_CHOICES } from '../src/game/consequences.ts'
import type { DiscussionContext } from '../src/game/discussion.ts'

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
const request: CommunityRequest = {
  mode: 'private',
  target: 'neighbor',
  history: [],
  message: 'Could we plant trees instead?',
  plan: {
    scenarioId: 'golden-gate-park',
    center: [-122.46889, 37.77293],
    bearing: 28,
    choices: { ...DEFAULT_CHOICES },
    year: 0,
    weather: 'drought',
  },
}
const simulatedMood = {
  angry: 5,
  concerned: 90,
  neutral: 4,
  hopeful: 1,
  reason: 'People are worried about losing the grove.',
}
function withMoods(
  messages: CommunityReply['messages'],
): CommunityReply['messages'] {
  return messages.map((message) => ({
    ...message,
    communityMood: simulatedMood,
    reaction: {
      text: 'I still want us to compare another site.',
      mood: 'concerned',
    },
  }))
}
const settings = {
  apiKey: 'test-key-not-a-real-credential',
  model: DEFAULT_COMMUNITY_MODEL,
}
function mockClient(reply: unknown, captured: Request[]): OpenRouter {
  const parsed = z.object({ messages: z.array(z.unknown()) }).safeParse(reply)
  // The provider uses character keys; the browser still receives a message array.
  const wireReply =
    parsed.success && parsed.data.messages.length === 3
      ? Object.fromEntries(
          parsed.data.messages.map((line) => {
            const { speaker, ...body } = z
              .object({ speaker: z.string() })
              .loose()
              .parse(line)
            return [speaker, body]
          }),
        )
      : reply
  return new OpenRouter({
    apiKey: settings.apiKey,
    httpClient: new HTTPClient({
      fetcher: (input) => {
        if (!(input instanceof Request)) throw new Error('Expected SDK Request')
        captured.push(input.clone())
        return Promise.resolve(
          Response.json({
            id: 'test',
            object: 'chat.completion',
            model: settings.model,
            created: 1,
            system_fingerprint: null,
            choices: [
              {
                index: 0,
                finish_reason: 'stop',
                message: {
                  role: 'assistant',
                  content: JSON.stringify(wireReply),
                },
              },
            ],
          }),
        )
      },
    }),
  })
}
describe('server-side community generation', () => {
  it('uses the real TypeScript SDK, bounded output and structured replies', async () => {
    const captured: Request[] = []
    const expected: CommunityReply = {
      messages: [
        {
          speaker: 'neighbor',
          text: 'New trees cannot replace this memorial and its setting. Could we compare another site?',
          reaction: {
            text: 'I still want the memorial and its setting protected.',
            mood: 'concerned',
          },
        },
      ],
    }
    const result = await generateCommunityReply(
      request,
      context,
      settings,
      new AbortController().signal,
      mockClient(expected, captured),
    )
    expect(result).toMatchObject({
      ...expected,
      source: 'live',
      model: DEFAULT_COMMUNITY_MODEL,
    })
    const sent = captured[0]
    if (!sent) throw new Error('SDK did not send a request')
    expect(sent.headers.get('authorization')).toBe('Bearer ' + settings.apiKey)
    const body = z
      .object({
        model: z.string(),
        max_tokens: z.number(),
        response_format: z.object({ type: z.string() }),
      })
      .parse(await sent.json())
    expect(body.model).toBe(DEFAULT_COMMUNITY_MODEL)
    expect(body.max_tokens).toBeLessThanOrEqual(850)
    expect(body.response_format.type).toBe('json_schema')
    expect(JSON.stringify(result)).not.toContain(settings.apiKey)
  })
  it('rejects an invented speaker or private reply from another character', async () => {
    for (const speaker of ['mayor', 'planner', 'operator'])
      await expect(
        generateCommunityReply(
          request,
          context,
          settings,
          new AbortController().signal,
          mockClient(
            {
              messages: [
                {
                  speaker,
                  text: 'I approve this proposal.',
                  reaction: {
                    text: 'I approve this proposal.',
                    mood: 'hopeful',
                  },
                },
              ],
            },
            [],
          ),
        ),
      ).rejects.toThrow()
  })
  it('requires a public exchange between three different characters', async () => {
    const publicRequest: CommunityRequest = {
      ...request,
      mode: 'discussion',
      message: '',
    }
    const exchange = {
      messages: withMoods([
        { speaker: 'neighbor', text: 'This setting is part of the memorial.' },
        {
          speaker: 'operator',
          text: 'Then another site deserves comparison. Cooling choices alone cannot settle the location.',
        },
        {
          speaker: 'nature',
          text: 'And we need space to meet and play. How would we protect that?',
        },
      ]),
    }
    await expect(
      generateCommunityReply(
        publicRequest,
        context,
        settings,
        new AbortController().signal,
        mockClient(exchange, []),
      ),
    ).resolves.toMatchObject({
      source: 'live',
      messages: exchange.messages,
    })
    await expect(
      generateCommunityReply(
        publicRequest,
        context,
        settings,
        new AbortController().signal,
        mockClient(
          {
            messages: exchange.messages.map((line) => ({
              ...line,
              communityMood: { ...simulatedMood, concerned: 95 },
            })),
          },
          [],
        ),
      ),
    ).rejects.toThrow('total 100')
    await expect(
      generateCommunityReply(
        publicRequest,
        context,
        settings,
        new AbortController().signal,
        mockClient(
          {
            messages: [
              exchange.messages[0],
              exchange.messages[0],
              exchange.messages[2],
            ],
          },
          [],
        ),
      ),
    ).rejects.toThrow()
  })
  it('rejects oversized messages and arbitrary scenario paths before generation', () => {
    expect(
      communityRequestSchema.safeParse({ ...request, message: 'a'.repeat(601) })
        .success,
    ).toBe(false)
    expect(
      communityRequestSchema.safeParse({
        ...request,
        plan: { ...request.plan, scenarioId: '../../.env.local' },
      }).success,
    ).toBe(false)
    expect(
      communityRequestSchema.safeParse({
        ...request,
        history: Array.from({ length: 19 }, () => ({
          speaker: 'planner',
          text: 'hello',
        })),
      }).success,
    ).toBe(false)
  })
  it('accepts a natural continuation without requiring the original poster to speak again', async () => {
    const exchange = {
      messages: withMoods([
        {
          speaker: 'operator',
          text: 'Could we compare another site and choose a less water-intensive design?',
        },
        {
          speaker: 'nature',
          text: 'Another site could protect this mature grove. New trees take years to provide habitat.',
        },
        {
          speaker: 'student',
          text: 'And it could protect our place to meet. What evidence would help compare locations?',
        },
      ]),
    }
    await expect(
      generateCommunityReply(
        {
          ...request,
          mode: 'discussion',
          target: 'operator',
          history: [
            { speaker: 'neighbor', text: 'Could we compare locations first?' },
          ],
        },
        context,
        settings,
        new AbortController().signal,
        mockClient(exchange, []),
      ),
    ).resolves.toMatchObject({
      source: 'live',
      messages: exchange.messages,
    })
  })
  it('grounds characters in cultural and ecological limits without agreement scores', () => {
    const prompt = communityPrompt(request, context)
    expect(prompt).toContain('not a surveyed grove boundary')
    expect(prompt).toContain('cannot compensate')
    expect(prompt).toContain('not persuading the player')
    expect(prompt).toContain('PRIVATE: produce exactly one')
    expect(prompt).toContain('Street-tree records are incomplete')
    expect(prompt).not.toContain('PUBLIC MOOD:')
    expect(prompt).not.toContain('"id":"operator"')
    expect(prompt).toContain('"id":"neighbor"')
    expect(prompt).toContain('PERSONAL REACTION:')
    expect(prompt).toContain('not invent agreement')
    expect(prompt).not.toContain(settings.apiKey)
  })
  it('passes a specific public reply target and the shared history to the model', async () => {
    const captured: Request[] = []
    const replyTo = {
      speaker: 'nature' as const,
      text: 'Mature habitat takes years to replace.',
    }
    const targeted: CommunityRequest = {
      ...request,
      mode: 'discussion',
      target: 'nature',
      message: 'Could we keep the grove?',
      replyTo,
      history: [replyTo],
    }
    await generateCommunityReply(
      targeted,
      context,
      settings,
      new AbortController().signal,
      mockClient(
        {
          messages: withMoods([
            {
              speaker: 'nature',
              text: 'Keeping the grove would protect this mature habitat.',
            },
            {
              speaker: 'operator',
              text: 'We could compare a different location and its cooling requirements.',
            },
            {
              speaker: 'student',
              text: 'And compare what happens to the places people already share.',
            },
          ]),
        },
        captured,
      ),
    )
    const sent = captured[0]
    if (!sent) throw new Error('Missing SDK request')
    const body = z
      .object({
        messages: z.array(z.object({ role: z.string(), content: z.string() })),
      })
      .parse(await sent.json())
    const content = body.messages.find(
      (message) => message.role === 'user',
    )?.content
    if (!content) throw new Error('Missing user context')
    const payload = z
      .object({
        replyTo: z.object({ speaker: z.string(), text: z.string() }),
        history: z.array(z.object({ speaker: z.string(), text: z.string() })),
        latestPlannerMessage: z.string(),
      })
      .parse(JSON.parse(content))
    expect(payload.replyTo).toEqual(replyTo)
    expect(payload.history).toEqual([replyTo])
    expect(payload.latestPlannerMessage).toBe(targeted.message)
    expect(communityPrompt(targeted, context)).toContain(
      'one ongoing public thread',
    )
    expect(communityPrompt(targeted, context)).toContain(
      'All three turns are direct replies to latestPlannerMessage',
    )
    expect(
      communityPrompt({ ...targeted, message: '' }, context),
    ).not.toContain('PLAYER INTERVENTION:')
  })
})
