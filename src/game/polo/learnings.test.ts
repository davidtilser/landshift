import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE, POLO_LEARNING_IDS, POLO_PHASES } from './model.ts'
import type { PoloSceneState, PoloLearnings } from './model.ts'
import {
  activePoloLearnings,
  applyPoloLearnings,
  poloProposalActive,
  selectedPoloLearnings,
} from './learnings.ts'
import { poloPhaseAt } from './placement.ts'
import { poloDiscussionContext } from './context.ts'
import { activePoloImprovements } from './interventions.ts'
import { poloReactions } from './reactions.ts'
import { poloImpact, poloSupport } from './impact.ts'
import { poloSceneStateSchema } from '../../shared/community-contract.ts'
import { poloDialogueReply } from './dialogue.ts'

const operating: PoloSceneState = {
  ...INITIAL_POLO_STATE,
  confirmed: true,
  phase: 'M6',
  areaHa: 3.5,
  bearing: 35,
  preview: false,
}

describe('learn, redesign and compare at the same site', () => {
  it('allows every combination and restores the original without changing location or size', () => {
    for (let mask = 0; mask < 16; mask++) {
      const choices: PoloLearnings = {}
      POLO_LEARNING_IDS.forEach((id, index) => {
        choices[id] = Boolean(mask & (1 << index))
      })
      const before = structuredClone(operating)
      const improved = applyPoloLearnings(operating, choices)
      expect(improved.center).toEqual(before.center)
      expect(improved.bearing).toBe(before.bearing)
      expect(improved.areaHa).toBe(before.areaHa)
      expect(operating).toEqual(before)
      expect(improved.proposal).toBeNull()
      expect(activePoloLearnings(improved).map((item) => item.id)).toEqual(
        POLO_LEARNING_IDS.filter((id) => choices[id]),
      )
      expect(poloProposalActive(improved, 'heat_reuse_neighbors')).toBe(
        Boolean(choices.heat),
      )
      expect(poloProposalActive(improved, 'recycled_water')).toBe(
        Boolean(choices.water),
      )
      expect(poloProposalActive(improved, 'green_roof')).toBe(
        Boolean(choices.roof),
      )
      const original = { ...improved, preview: false }
      expect(activePoloLearnings(original)).toEqual([])
      expect(activePoloImprovements(original)).toEqual([])
      expect(poloProposalActive(original, 'green_roof')).toBe(false)
      expect(selectedPoloLearnings(original)).toHaveLength(
        activePoloLearnings(improved).length,
      )
    }
  })
  it('keeps the five chapters free of automatic proposals and only activates learnings at the end', () => {
    const selected = applyPoloLearnings(operating, {
      soil: true,
      water: true,
      heat: true,
      roof: true,
    })
    for (const phase of POLO_PHASES) {
      const earlier = poloPhaseAt(selected, phase)
      expect(earlier.proposal).toBeNull()
      expect(earlier.learnings).toEqual(selected.learnings)
      expect(earlier.learnings).not.toBe(selected.learnings)
      expect(activePoloLearnings(earlier)).toEqual([])
    }
    expect(applyPoloLearnings(INITIAL_POLO_STATE, { soil: true })).toBe(
      INITIAL_POLO_STATE,
    )
    expect(
      applyPoloLearnings({ ...operating, phase: 'M1' }, { soil: true }).phase,
    ).toBe('M1')
  })
  it('combines all mechanisms without presenting original quantities as new results or granting consent', () => {
    const improved = applyPoloLearnings(operating, {
      soil: true,
      water: true,
      heat: true,
      roof: true,
    })
    const context = poloDiscussionContext(improved).polo
    expect(context?.baseline).toBeNull()
    expect(context?.mechanism).toContain('planned from the start')
    expect(context?.mechanism).toContain('separate supply-and-return circuit')
    expect(context?.mechanism).toContain('treatment/check point')
    expect(context?.mechanism).toContain('planted roof')
    expect(context?.mechanism).toContain('not recalculated')
    expect(
      poloDiscussionContext({ ...improved, preview: false }).polo?.baseline
        ?.length,
    ).toBeGreaterThan(0)
    expect(activePoloImprovements(improved).map((item) => item.id)).toEqual([
      'soil',
      'grounds',
    ])
    expect(poloReactions(improved).voices.student.text).toContain(
      'without this field',
    )
    expect(poloReactions(improved).voices.neighbor.sign).not.toBeNull()
    expect(poloSupport(improved)).toBe(poloSupport(operating))
    expect(
      poloImpact(improved).find(
        (card) => card.title === 'Water and energy savings',
      )?.current,
    ).toBe('Not quantified')
    if (!context) throw new Error('Missing context')
    const reply = poloDialogueReply(
      'nature',
      'Where does the water go?',
      context,
    )
    expect(reply.text).toContain('recycled-water supply')
    expect(reply.text).toContain('Savings are not quantified')
    expect(reply.text.length).toBeLessThanOrEqual(360)
  })
  it('validates only boolean learning flags at the server boundary', () => {
    const selected = applyPoloLearnings(operating, { soil: true, roof: false })
    expect(poloSceneStateSchema.parse(selected).learnings).toEqual(
      selected.learnings,
    )
    expect(
      poloSceneStateSchema.safeParse({
        ...selected,
        learnings: { water: 'saved' },
      }).success,
    ).toBe(false)
  })
})
