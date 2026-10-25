import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE, POLO_LEARNING_IDS, POLO_PHASES } from './model.ts'
import type { PoloSceneState, PoloLearnings } from './model.ts'
import {
  POLO_LEARNINGS,
  activePoloLearnings,
  activeCustomPoloLearnings,
  selectedCustomPoloLearnings,
  hasActivePoloLearningPlan,
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
  it('supports custom-only ideas, selection, original comparison and phase persistence without inventing map features', () => {
    const ideas = [
      { id: 'solar', text: '  Add rooftop solar panels.  ', selected: true },
      { id: 'noise', text: 'Reduce noise for park visitors.', selected: false },
    ]
    const customOnly = applyPoloLearnings(operating, {}, ideas)
    expect(
      activeCustomPoloLearnings(customOnly).map((item) => item.text),
    ).toEqual(['Add rooftop solar panels.'])
    expect(hasActivePoloLearningPlan(customOnly)).toBe(true)
    expect(activePoloLearnings(customOnly)).toEqual([])
    expect(activePoloImprovements(customOnly)).toEqual([])
    expect(poloProposalActive(customOnly, 'green_roof')).toBe(false)
    expect(customOnly.center).toEqual(operating.center)
    expect(poloSupport(customOnly)).toBe(poloSupport(operating))
    const original = { ...customOnly, preview: false }
    expect(activeCustomPoloLearnings(original)).toEqual([])
    expect(selectedCustomPoloLearnings(original)).toHaveLength(1)
    expect(poloDiscussionContext(original).polo?.mechanism).not.toContain(
      'solar panels',
    )
    const earlier = poloPhaseAt(customOnly, 'M4')
    expect(earlier.customLearnings).toEqual(customOnly.customLearnings)
    expect(earlier.customLearnings?.[0]).not.toBe(
      customOnly.customLearnings?.[0],
    )
    expect(activeCustomPoloLearnings(earlier)).toEqual([])
    const context = poloDiscussionContext(customOnly).polo
    expect(context?.baseline).toBeNull()
    expect(context?.mechanism).toContain('not implemented or verified')
    expect(context?.mechanism).toContain('Add rooftop solar panels.')
    expect(context?.mechanism).not.toContain('Reduce noise')
    expect(poloImpact(customOnly)[0]?.current).toBe('Proposed · not mapped')
    if (!context) throw new Error('Missing context')
    const reply = poloDialogueReply(
      'operator',
      'What matters most to you?',
      context,
    )
    expect(reply.text).toContain('Add rooftop solar panels.')
    expect(reply.text.length).toBeLessThanOrEqual(360)
    expect(ideas[0]?.text.startsWith('  ')).toBe(true)
    const removed = applyPoloLearnings(customOnly, {}, [])
    expect(removed.customLearnings).toEqual([])
    expect(removed.preview).toBe(false)
    expect(hasActivePoloLearningPlan(removed)).toBe(false)
  })
  it('validates custom text and count at the server boundary', () => {
    const idea = { id: 'solar', text: 'Add rooftop solar.', selected: true }
    expect(
      poloSceneStateSchema.parse({ ...operating, customLearnings: [idea] })
        .customLearnings,
    ).toEqual([idea])
    for (const customLearnings of [
      [{ ...idea, text: ' ' }],
      [{ ...idea, text: 'x'.repeat(161) }],
      [{ ...idea, selected: 'yes' }],
      Array.from({ length: 6 }, () => idea),
    ])
      expect(
        poloSceneStateSchema.safeParse({ ...operating, customLearnings })
          .success,
      ).toBe(false)
  })
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
        POLO_LEARNINGS.filter((item) => choices[item.id]).map(
          (item) => item.id,
        ),
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
