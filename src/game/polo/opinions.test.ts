import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE, POLO_PHASES, POLO_PROPOSALS } from './model.ts'
import { lockPoloForProtest, poloExploreAfterProtest } from './protest.ts'
import { poloOpinions, poloPortraitOpinions } from './opinions.ts'
import { poloPhaseAt } from './placement.ts'
import type { ConversationReactions } from '../community-reactions.ts'

describe('portrait speech bubbles', () => {
  it('shows all four voices immediately after confirmation, including during the protest', () => {
    expect(poloPortraitOpinions(INITIAL_POLO_STATE)).toEqual([])
    const confirmed = lockPoloForProtest(INITIAL_POLO_STATE)
    expect(poloPortraitOpinions(confirmed).map((person) => person.id)).toEqual([
      'neighbor',
      'nature',
      'student',
      'operator',
    ])
    expect(poloPortraitOpinions(confirmed)[0]?.text).toContain(
      'Keep our park public',
    )
  })

  it('updates portrait opinions with the construction phase and completed improvements', () => {
    const confirmed = lockPoloForProtest(INITIAL_POLO_STATE)
    const built = {
      ...confirmed,
      phase: 'M5' as const,
      improvements: { grounds: true },
    }
    expect(poloPortraitOpinions(built)[0]?.text).toContain('The path helps')
    expect(poloPortraitOpinions(built)[2]?.text).toContain(
      'still needs a pitch',
    )
  })

  it('uses personal replies for matching portraits and map bubbles without changing the plan', () => {
    const state = {
      ...INITIAL_POLO_STATE,
      confirmed: true,
      phase: 'M1' as const,
    }
    const before = structuredClone(state)
    const reactions: ConversationReactions = new Map([
      [
        'neighbor',
        {
          text: 'I appreciate being heard. I still want our field.',
          mood: 'concerned',
          scope: 'private',
        },
      ],
      [
        'operator',
        {
          text: 'I think comparing sites is worth exploring.',
          mood: 'hopeful',
          scope: 'community',
        },
      ],
    ])
    const portraits = poloPortraitOpinions(state, reactions)
    expect(portraits[0]).toMatchObject({
      text: reactions.get('neighbor')?.text,
      scope: 'private',
    })
    expect(portraits[3]).toMatchObject({
      text: reactions.get('operator')?.text,
      mood: 'hopeful',
      scope: 'community',
    })
    expect(portraits[1]?.text).toBe(poloPortraitOpinions(state)[1]?.text)
    expect(poloOpinions(state, reactions)[0]?.text).toBe(
      reactions.get('neighbor')?.text,
    )
    expect(poloOpinions(state, reactions)[1]?.tone).toBe('possibility')
    expect(poloPortraitOpinions(INITIAL_POLO_STATE, reactions)).toEqual([])
    expect(state).toEqual(before)
  })
})

describe('community invitations begin with construction', () => {
  it('keeps placement and the protest free of conversation bubbles', () => {
    expect(poloOpinions(INITIAL_POLO_STATE)).toEqual([])
    expect(poloOpinions(lockPoloForProtest(INITIAL_POLO_STATE))).toEqual([])
  })

  it('keeps Today quiet after the protest and offers people once construction starts', () => {
    const today = poloExploreAfterProtest(
      lockPoloForProtest(INITIAL_POLO_STATE),
      { stage: 'finished', step: 4, outcome: 'heard' },
    )
    expect(today.phase).toBe('M0')
    expect(poloOpinions(today)).toEqual([])
    const state = poloPhaseAt(today, 'M1')
    expect(poloOpinions(state).map((person) => person.id)).toEqual([
      'neighbor',
      'operator',
    ])
  })

  it('keeps one or two unique invitations across every later milestone and proposal', () => {
    for (const phase of POLO_PHASES.slice(1))
      for (const proposal of [null, ...POLO_PROPOSALS])
        for (const preview of [false, true]) {
          const people = poloOpinions({
            ...INITIAL_POLO_STATE,
            confirmed: true,
            phase,
            proposal,
            preview,
          })
          expect(people.length).toBeGreaterThanOrEqual(1)
          expect(people.length).toBeLessThanOrEqual(2)
          expect(new Set(people.map((person) => person.id)).size).toBe(
            people.length,
          )
        }
  })
})
