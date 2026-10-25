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
  it('shows opposition from announcement and distinct concerns at every phase', () => {
    expect(poloReactions(INITIAL_POLO_STATE).turnout).toBe(8)
    for (const reaction of Object.values(
      poloReactions(INITIAL_POLO_STATE).voices,
    )) {
      expect(reaction.text.length).toBeLessThanOrEqual(70)
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
  it('shows 100 people only after location confirmation and before construction', () => {
    expect(poloProtestTurnout(INITIAL_POLO_STATE)).toBe(0)
    expect(poloProtestTurnout(confirmed)).toBe(100)
    for (const phase of POLO_PHASES.slice(1))
      for (const proposal of [null, ...POLO_PROPOSALS])
        expect(poloProtestTurnout({ ...confirmed, phase, proposal })).toBe(0)
  })
  it('spreads 100 distinct protesters across the original field', () => {
    const positions = new Set<string>()
    for (let index = 0; index < 100; index++) {
      positions.add(poloProtesterPosition(index, 0).join(','))
      for (const elapsed of [0, 10, 100]) {
        const [x, y] = poloProtesterPosition(index, elapsed)
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
        expect(Math.abs(x)).toBeLessThanOrEqual(110)
        expect(Math.abs(y)).toBeLessThanOrEqual(56)
      }
    }
    expect(positions.size).toBe(100)
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
      expect(concept.turnout).toBeLessThan(baseline.turnout)
      expect(concept.turnout).toBeGreaterThanOrEqual(17)
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
