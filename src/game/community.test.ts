import { describe, expect, it } from 'vitest'
import {
  communityVoices,
  nextChallenge,
  challengeCompleted,
} from './community.ts'
import { DEFAULT_CHOICES } from './consequences.ts'
import type { PlanChoices, SiteContext } from './consequences.ts'

const clear: SiteContext = {
  buildings: 0,
  water: 0,
  parks: 0,
  trees: 0,
  flood: 0,
}
const green: PlanChoices = {
  ...DEFAULT_CHOICES,
  cooling: 'hybrid',
  trees: 60,
  restoration: 'meadow',
  training: true,
}

describe('community mini challenges', () => {
  it('suggests a sequence of useful experiments without changing choices', () => {
    const choices = { ...DEFAULT_CHOICES }
    expect(nextChallenge(choices, clear).target).toBe('cooling')
    expect(choices).toEqual(DEFAULT_CHOICES)
    choices.cooling = 'hybrid'
    expect(nextChallenge(choices, clear).target).toBe('land')
    expect(nextChallenge({ ...choices, trees: 24 }, clear).target).toBe(
      'people',
    )
    expect(nextChallenge(green, clear).target).toBe('future')
  })
  it('prioritizes a mapped footprint conflict over upgrades', () => {
    for (const layer of ['buildings', 'water', 'parks'] as const) {
      const site = { ...clear, [layer]: 1 }
      expect(nextChallenge(green, site).id).toBe('site')
      expect(challengeCompleted('site', green, site)).toBe(false)
    }
  })
  it('asks to revise an over-budget plan rather than adding another upgrade', () => {
    const expensive = { ...green, cooling: 'dry' as const }
    expect(nextChallenge(expensive, clear).id).toBe('budget')
    expect(challengeCompleted('budget', expensive, clear)).toBe(false)
    expect(challengeCompleted('budget', green, clear)).toBe(true)
  })
  it('does not confuse a higher-priority problem with completing the current challenge', () => {
    expect(nextChallenge(DEFAULT_CHOICES, { ...clear, buildings: 1 }).id).toBe(
      'site',
    )
    expect(challengeCompleted('water', DEFAULT_CHOICES, clear)).toBe(false)
  })
  it('keeps mapped flood exposure unresolved after greening and training', () => {
    const flooded = { ...clear, flood: 1 }
    expect(nextChallenge(green, flooded).id).toBe('flood')
    expect(challengeCompleted('flood', green, flooded)).toBe(false)
    expect(challengeCompleted('flood', green, clear)).toBe(true)
  })
  it('accepts different nature and community experiments', () => {
    const alternative: PlanChoices = {
      ...DEFAULT_CHOICES,
      cooling: 'hybrid',
      restoration: 'rain-garden',
      access: true,
    }
    expect(challengeCompleted('nature', alternative, clear)).toBe(true)
    expect(challengeCompleted('share', alternative, clear)).toBe(true)
    expect(nextChallenge(alternative, clear).id).toBe('compare')
    expect(challengeCompleted('compare', alternative, clear)).toBe(false)
  })
})

describe('fictional speech bubbles', () => {
  it('keeps three distinct short perspectives', () => {
    const voices = communityVoices(DEFAULT_CHOICES, clear)
    expect(new Set(voices.map((voice) => voice.id)).size).toBe(3)
    expect(voices.every((voice) => voice.quote.length <= 48)).toBe(true)
  })
  it('does not let training erase the neighbor’s water concern', () => {
    const voices = communityVoices({ ...green, cooling: 'evaporative' }, clear)
    expect(voices.find((voice) => voice.id === 'neighbor')?.quote).toContain(
      'less water',
    )
    expect(voices.find((voice) => voice.id === 'student')?.quote).toContain(
      'training',
    )
  })
  it('retains the flood warning in otherwise improved resident feedback', () => {
    expect(communityVoices(green, { ...clear, flood: 1 })[0]?.quote).toContain(
      'Flood risk remains',
    )
  })
  it('keeps habitat conflicts visible even with proposed planting', () => {
    expect(communityVoices(green, { ...clear, parks: 1 })[1]?.quote).toContain(
      'Keep this habitat',
    )
  })
})
