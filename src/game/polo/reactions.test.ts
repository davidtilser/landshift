import { describe, expect, it } from 'vitest'
import { communityMoodBreakdownSchema } from '../../shared/community-contract.ts'
import { initialCommunityMoodBreakdown } from '../community-mood.ts'
import { communityProfiles } from '../community-profiles.ts'
import { poloDiscussionContext } from './context.ts'
import { INITIAL_POLO_STATE, POLO_PHASES, POLO_PROPOSALS } from './model.ts'
import type { PoloSceneState } from './model.ts'
import {
  poloProtesterPosition,
  poloProtestTurnout,
  poloReactionLines,
  poloReactions,
} from './reactions.ts'

const confirmed: PoloSceneState = { ...INITIAL_POLO_STATE, confirmed: true }

describe('fictional Polo phase reactions', () => {
  it('keeps initial field users peaceful and gives each voice a different concern at every phase', () => {
    expect(poloReactions(INITIAL_POLO_STATE).turnout).toBe(0)
    for (const reaction of Object.values(
      poloReactions(INITIAL_POLO_STATE).voices,
    )) {
      expect(reaction.sign).toBeNull()
      expect(reaction.mood).not.toBe('angry')
    }
    for (const id of ['neighbor', 'nature', 'student', 'operator'] as const) {
      const lines = POLO_PHASES.map(
        (phase) => poloReactions({ ...confirmed, phase }).voices[id].text,
      )
      expect(new Set(lines).size).toBe(POLO_PHASES.length)
      for (const text of lines) {
        expect(text.length).toBeLessThan(80)
        expect(
          poloReactionLines(text)
            .split('\n')
            .every((line) => line.length <= 36),
        ).toBe(true)
      }
    }
  })
  it('grows the rally during each stage without adding duplicate people on replay', () => {
    let previous = 0
    for (const phase of POLO_PHASES.slice(1)) {
      const scene = { ...confirmed, phase }
      expect(poloProtestTurnout(scene, 0)).toBe(previous)
      const end = poloProtestTurnout(scene, 1)
      expect(poloProtestTurnout(scene, 0.5)).toBeGreaterThanOrEqual(previous)
      expect(poloProtestTurnout(scene, 0.5)).toBeLessThanOrEqual(end)
      expect(poloProtestTurnout(scene, 4)).toBe(end)
      expect(poloProtestTurnout(scene, 1)).toBe(end)
      previous = end
    }
    expect(previous).toBe(20)
    expect(
      poloProtestTurnout({ ...confirmed, confirmed: false, phase: 'M4' }, 1),
    ).toBe(0)
    expect(
      poloReactions({ ...confirmed, confirmed: false, phase: 'M4' }).turnout,
    ).toBe(0)
  })
  it('keeps gathering routes outside the work band and people anchored to the field', () => {
    for (let index = 0; index < 20; index++) {
      for (const turnout of [index, index + 0.5, 20]) {
        for (const elapsed of [0, 10, 100]) {
          const [x, y] = poloProtesterPosition(index, elapsed, turnout)
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
          expect(Math.abs(x)).toBeLessThanOrEqual(182)
          expect(y).toBeLessThan(-80)
          expect(y).toBeGreaterThan(-110)
        }
      }
    }
  })
  it('recognizes concept trade-offs without removing the field-loss protest', () => {
    const baseline = poloReactions({
      ...confirmed,
      phase: 'M6',
      preview: false,
    })
    for (const proposal of POLO_PROPOSALS) {
      const scene = {
        ...confirmed,
        phase: 'M6' as const,
        proposal,
        preview: true,
      }
      const concept = poloReactions(scene)
      expect(concept.turnout).toBe(baseline.turnout)
      expect(concept.voices.neighbor.sign).not.toBeNull()
      expect(concept.voices.neighbor.mood).toBe('angry')
      expect(concept.voices.neighbor.text).not.toBe(
        baseline.voices.neighbor.text,
      )
      expect(poloReactions({ ...scene, preview: false })).toEqual(baseline)
    }
    const heat = {
      ...confirmed,
      phase: 'M6' as const,
      proposal: 'heat_reuse_neighbors' as const,
    }
    expect(
      poloReactions({ ...heat, recipientAvailable: false }).voices.operator
        .text,
    ).toContain('Computing still needs cooling')
  })
  it('uses the same phase opinions and moods in map bubbles, chat greetings and the community feed', () => {
    for (const phase of POLO_PHASES) {
      const scene = { ...confirmed, phase }
      const profiles = communityProfiles(poloDiscussionContext(scene))
      const reactions = poloReactions(scene)
      for (const profile of profiles) {
        expect(profile.post).toBe(reactions.voices[profile.id].text)
        expect(profile.initialMood.mood).toBe(reactions.voices[profile.id].mood)
      }
      expect(
        communityMoodBreakdownSchema.safeParse(
          initialCommunityMoodBreakdown(profiles),
        ).success,
      ).toBe(true)
    }
    const mood = (phase: PoloSceneState['phase']): number =>
      initialCommunityMoodBreakdown(
        communityProfiles(poloDiscussionContext({ ...confirmed, phase })),
      ).angry
    expect(mood('M4')).toBeGreaterThan(mood('M1'))
    expect(mood('M1')).toBeGreaterThan(mood('M0'))
  })
})
