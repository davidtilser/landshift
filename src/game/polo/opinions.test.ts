import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE, POLO_PHASES, POLO_PROPOSALS } from './model.ts'
import { lockPoloForProtest, poloExploreAfterProtest } from './protest.ts'
import { poloOpinions } from './opinions.ts'
import { poloPhaseAt } from './placement.ts'

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
