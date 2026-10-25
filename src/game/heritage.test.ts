import { describe, expect, it } from 'vitest'
import { assessSite, DEFAULT_CHOICES, evaluatePlan } from './consequences.ts'
import type { DataPack } from './data.ts'
import type { FeatureCollection } from 'geojson'
import { rectangle } from './geometry.ts'
import {
  communityVoices,
  nextChallenge,
  challengeCompleted,
} from './community.ts'
import { neighborReaction } from './ambient-life.ts'
import { dialogueChoices } from './dialogue-choices.ts'
import { scriptedDiscussion } from './discussion.ts'
import type { DiscussionContext } from './discussion.ts'

const memorial: [number, number] = [-122.46889, 37.77293]
const empty: FeatureCollection = { type: 'FeatureCollection', features: [] }
function layers(): DataPack['layers'] {
  return {
    buildings: empty,
    water: empty,
    landuse: empty,
    roads: empty,
    trees: empty,
    project: empty,
    parcels: empty,
    zoning: empty,
    landcover: empty,
    trails: empty,
    flood: empty,
    parks: {
      type: 'FeatureCollection',
      features: [rectangle(memorial, 2000, 1200, 0)],
    },
    heritage: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'heroes-grove-wwi-memorial',
          properties: { source: 'NPS HALS CA-49-B' },
          geometry: { type: 'Point', coordinates: memorial },
        },
      ],
    },
  }
}
const upgrades = {
  ...DEFAULT_CHOICES,
  cooling: 'hybrid' as const,
  trees: 24 as const,
  restoration: 'rain-garden' as const,
  training: true,
  access: true,
}
describe('Heroes’ Grove cultural-place scenario', () => {
  it('detects the documented memorial point inside the complete campus pad', () => {
    const site = assessSite({ layers: layers() }, memorial, 28)
    expect(site.heritage).toBe(1)
    expect(site.parks).toBe(1)
    expect(nextChallenge(DEFAULT_CHOICES, site).id).toBe('heritage')
  })
  it('does not let upgrades buy away the memorial impact or silence its protest', () => {
    const site = assessSite({ layers: layers() }, memorial, 28)
    const result = evaluatePlan(site, upgrades, 10, 'drought')
    expect(result.remaining).toBeGreaterThanOrEqual(0)
    expect(result.blockers.some((text) => text.includes('memorial'))).toBe(true)
    expect(result.goals.at(-1)?.passed).toBe(false)
    expect(neighborReaction(upgrades, site)).toEqual({
      count: 12,
      text: 'Protect the memorial',
    })
  })
  it('clears only the memorial overlap when relocating within the same park', () => {
    const moved: [number, number] = [memorial[0] - 0.004, memorial[1]]
    const site = assessSite({ layers: layers() }, moved, 28)
    expect(site.heritage).toBe(0)
    expect(site.parks).toBe(1)
    expect(challengeCompleted('heritage', upgrades, site)).toBe(true)
    expect(challengeCompleted('site', upgrades, site)).toBe(false)
    expect(neighborReaction(upgrades, site).count).toBeGreaterThan(0)
    expect(communityVoices(upgrades, site)[0]?.name).toBe('Memorial steward')
  })
  it('opens short cultural-place dialogue rather than only cooling questions', () => {
    const context: DiscussionContext = {
      choices: upgrades,
      site: assessSite({ layers: layers() }, memorial, 28),
      year: 0,
      weather: 'drought',
    }
    const voice = communityVoices(context.choices, context.site)[0]
    if (!voice) throw new Error('Missing steward')
    const choices = dialogueChoices('neighbor', undefined, context)
    expect(choices[0]).toMatchObject({ kind: 'say', topic: 'heritage' })
    const reply = scriptedDiscussion({
      voice,
      context,
      history: [],
      question: 'Why does this memorial matter?',
      topic: 'heritage',
    })
    expect(reply.text).toContain('WWI remembrance')
    expect(reply.text).toContain('cannot replace')
    expect(reply.text.split(/\s+/).length).toBeLessThanOrEqual(35)
  })
  it('does not present training as compensation for losing a park or memorial', () => {
    const context: DiscussionContext = {
      choices: upgrades,
      site: assessSite({ layers: layers() }, memorial, 28),
      year: 10,
      weather: 'drought',
    }
    const voice = communityVoices(context.choices, context.site)[2]
    if (!voice) throw new Error('Missing park user')
    expect(
      scriptedDiscussion({
        voice,
        context,
        history: [],
        question: 'Could training make up for it?',
        topic: 'training',
      }).text,
    ).toContain('would not restore a memorial')
  })
})
