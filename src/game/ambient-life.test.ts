import { describe, expect, it } from 'vitest'
import { neighborReaction } from './ambient-life.ts'
import { DEFAULT_CHOICES } from './consequences.ts'
import type { PlanChoices, SiteContext } from './consequences.ts'

const clearSite: SiteContext = {
  buildings: 0,
  trees: 0,
  water: 0,
  parks: 0,
  flood: 0,
}
const plan = (changes: Partial<PlanChoices> = {}): PlanChoices => ({
  ...DEFAULT_CHOICES,
  ...changes,
})

describe('fictional neighbor scenario cues', () => {
  it('keeps the cooling-water concern even after planting and funding training', () => {
    const reaction = neighborReaction(
      plan({ trees: 60, restoration: 'meadow', training: true, access: true }),
      clearSite,
    )
    expect(reaction).toEqual({ count: 9, text: 'Water matters' })
  })

  it.each([
    { site: { ...clearSite, water: 1 }, text: 'Protect the river' },
    { site: { ...clearSite, parks: 1 }, text: 'Keep our park' },
    { site: { ...clearSite, buildings: 1 }, text: 'People use this place' },
  ])(
    'does not let upgrades erase the footprint concern: $text',
    ({ site, text }) => {
      const reaction = neighborReaction(
        plan({
          cooling: 'dry',
          trees: 60,
          restoration: 'rain-garden',
          training: true,
          access: true,
        }),
        site,
      )
      expect(reaction).toEqual({ count: 12, text })
    },
  )

  it('progresses through nature and local-benefit concerns as the player revises', () => {
    const lowerWater = plan({ cooling: 'hybrid' })
    expect(neighborReaction(lowerWater, clearSite)).toEqual({
      count: 6,
      text: 'Make room for nature',
    })
    const withTrees = { ...lowerWater, trees: 24 as const }
    expect(neighborReaction(withTrees, clearSite)).toEqual({
      count: 4,
      text: 'What about our neighbors?',
    })
    expect(
      neighborReaction({ ...withTrees, training: true }, clearSite),
    ).toEqual({ count: 0, text: '' })
  })

  it('keeps nature a separate concern when a public path is offered without greening', () => {
    expect(
      neighborReaction(plan({ cooling: 'dry', access: true }), clearSite),
    ).toEqual({ count: 6, text: 'Make room for nature' })
  })

  it('ends the authored gathering cue without claiming that real residents approve', () => {
    const reaction = neighborReaction(
      plan({ cooling: 'hybrid', restoration: 'rain-garden', access: true }),
      { ...clearSite, flood: 1 },
    )
    // Mapped flood exposure is handled by the separate site warnings. Absence
    // of this particular fictional protest is not a safety or approval result.
    expect(reaction).toEqual({ count: 0, text: '' })
  })
})
