import { describe, expect, it } from 'vitest'
import { dialogueChoices } from './dialogue-choices.ts'
import { communityVoices } from './community.ts'
import { DEFAULT_CHOICES } from './consequences.ts'
import { scriptedDiscussion } from './discussion.ts'
import type { DiscussionContext, DiscussionTopic } from './discussion.ts'
import type { VoiceId } from './community.ts'

const context: DiscussionContext = {
  choices: { ...DEFAULT_CHOICES },
  site: { buildings: 0, water: 0, parks: 0, trees: 0, flood: 1 },
  year: 0,
  weather: 'drought',
}
const topics: (DiscussionTopic | undefined)[] = [
  undefined,
  'heritage',
  'park',
  'water',
  'power',
  'nature',
  'flood',
  'benefit',
  'training',
  'access',
  'budget',
  'site',
  'next',
  'hello',
  'other',
]
const voices: VoiceId[] = ['neighbor', 'nature', 'student']

describe('game dialogue branches', () => {
  it('offers three distinct, short choices throughout every branch', () => {
    for (const voice of voices)
      for (const topic of topics) {
        const choices = dialogueChoices(voice, topic, context)
        expect(choices).toHaveLength(3)
        expect(new Set(choices.map((choice) => choice.label)).size).toBe(3)
        expect(choices.every((choice) => choice.label.length <= 34)).toBe(true)
      }
  })
  it('offers a resource counterpoint and opens the relevant cards after discussing water', () => {
    const revised: DiscussionContext = {
      ...context,
      choices: { ...DEFAULT_CHOICES, cooling: 'hybrid' },
    }
    const choices = dialogueChoices('neighbor', 'water', revised)
    expect(
      choices.some(
        (choice) => choice.kind === 'say' && choice.topic === 'power',
      ),
    ).toBe(true)
    expect(choices.find((choice) => choice.kind === 'try')).toMatchObject({
      target: 'cooling',
    })
    // The global next challenge is nature; this water branch must still open cooling.
    expect(dialogueChoices('neighbor', 'next', revised)[0]).toMatchObject({
      target: 'land',
    })
  })
  it('lets players compare skills with shared space as separate paths', () => {
    const choices = dialogueChoices('student', undefined, context)
    expect(choices[0]).toMatchObject({ topic: 'training' })
    expect(choices[1]).toMatchObject({ topic: 'access' })
    const voice = communityVoices(context.choices, context.site)[2]
    if (!voice) throw new Error('Missing student')
    const training = scriptedDiscussion({
      voice,
      context,
      question: 'Share new skills',
      history: [],
      topic: 'training',
    })
    const access = scriptedDiscussion({
      voice,
      context,
      question: 'Share a green path',
      history: [],
      topic: 'access',
    })
    expect(training.text).toContain('12 planned places')
    expect(access.text).toContain('10 upgrade credits')
    expect(training.text).not.toBe(access.text)
  })
  it('keeps replies brief across characters and decision states', () => {
    const contexts: DiscussionContext[] = [
      context,
      {
        ...context,
        choices: {
          cooling: 'dry',
          trees: 60,
          restoration: 'rain-garden',
          training: true,
          access: true,
        },
      },
      {
        ...context,
        site: { buildings: 2, water: 1, parks: 1, trees: 3, flood: 0 },
        choices: {
          ...DEFAULT_CHOICES,
          cooling: 'hybrid',
          restoration: 'meadow',
          access: true,
        },
      },
    ]
    for (const current of contexts)
      for (const voice of communityVoices(current.choices, current.site))
        for (const topic of topics) {
          if (!topic) continue
          const reply = scriptedDiscussion({
            voice,
            context: current,
            question: '',
            history: [],
            topic,
          })
          expect(
            reply.text.trim().split(/\s+/).length,
            voice.id + '/' + topic,
          ).toBeLessThanOrEqual(35)
          expect(reply.topic).toBe(topic)
        }
  })
  it('does not mutate the plan while exploring any dialogue path', () => {
    const before = structuredClone(context)
    for (const topic of topics) dialogueChoices('student', topic, context)
    expect(context).toEqual(before)
  })
  it('keeps flood and site branches connected to comparison rather than approval', () => {
    expect(
      dialogueChoices('nature', 'flood', context).find(
        (choice) => choice.kind === 'try',
      ),
    ).toMatchObject({ target: 'move' })
    expect(
      dialogueChoices('nature', 'nature', context).some(
        (choice) => choice.kind === 'say' && choice.topic === 'flood',
      ),
    ).toBe(true)
  })
})
