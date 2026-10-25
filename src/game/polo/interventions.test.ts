import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE } from './model.ts'
import type { PoloSceneState } from './model.ts'
import {
  activePoloImprovements,
  nextPoloIntervention,
  paintPoloIntervention,
  POLO_INTERVENTIONS,
} from './interventions.ts'
import { poloDiscussionContext } from './context.ts'
import { poloDialogueReply } from './dialogue.ts'
import { poloReactions } from './reactions.ts'
import { poloImpact } from './impact.ts'
import { poloSceneStateSchema } from '../../shared/community-contract.ts'
import { poloPhaseAt } from './placement.ts'
import { poloEducation } from './education.ts'

const foundations: PoloSceneState = {
  ...INITIAL_POLO_STATE,
  confirmed: true,
  phase: 'M1',
}
describe('optional construction improvements', () => {
  it('offers the soil strip before clearing and reinforcement only at its own checkpoint', () => {
    expect(nextPoloIntervention(INITIAL_POLO_STATE, 1, {})).toBeUndefined()
    expect(nextPoloIntervention(foundations, -1, {})).toBeUndefined()
    expect(nextPoloIntervention(foundations, NaN, {})).toBeUndefined()
    expect(nextPoloIntervention(foundations, 0, {})?.id).toBe('soil')
    expect(
      nextPoloIntervention(foundations, 0.49, { soil: 'skipped' }),
    ).toBeUndefined()
    expect(
      nextPoloIntervention(foundations, 0.5, { soil: 'skipped' })?.id,
    ).toBe('foundation')
    expect(
      nextPoloIntervention(foundations, 1, {
        soil: 'done',
        foundation: 'skipped',
      }),
    ).toBeUndefined()
  })
  it('lets players skip every intervention without changing the plan', () => {
    const before = structuredClone(foundations)
    for (const progress of [0, 0.5, 1])
      nextPoloIntervention(foundations, progress, {
        soil: 'skipped',
        foundation: 'skipped',
      })
    expect(foundations).toEqual(before)
    expect(activePoloImprovements(foundations)).toEqual([])
    const ready: PoloSceneState = { ...foundations, phase: 'M5' }
    expect(nextPoloIntervention(ready, 0.64, {})).toBeUndefined()
    expect(nextPoloIntervention(ready, 0.65, {})?.id).toBe('grounds')
    expect(
      nextPoloIntervention(ready, 1, { grounds: 'skipped' }),
    ).toBeUndefined()
  })
  it('applies each section once, even when a stroke crosses it repeatedly', () => {
    for (const item of POLO_INTERVENTIONS) {
      let cells: number[] = []
      for (const index of [0, 0, -1, NaN, 1.5, 99, 3, 2, 1, 5, 4, 4])
        cells = paintPoloIntervention(item, cells, index)
      expect(cells).toEqual([0, 1, 2, 3, 4, 5])
      expect(paintPoloIntervention(item, cells, 3)).toEqual(cells)
      expect(item.cells).toHaveLength(6)
    }
  })
  it('preserves completed choices on replay and only shows them from their relevant phase', () => {
    const improved: PoloSceneState = {
      ...foundations,
      improvements: { soil: true, foundation: true, grounds: true },
    }
    expect(nextPoloIntervention(improved, 1, {})).toBeUndefined()
    expect(activePoloImprovements(improved).map((item) => item.id)).toEqual([
      'soil',
      'foundation',
    ])
    expect(activePoloImprovements({ ...improved, phase: 'M0' })).toEqual([])
    expect(activePoloImprovements({ ...improved, phase: 'M5' })).toHaveLength(3)
    expect(activePoloImprovements({ ...improved, confirmed: false })).toEqual(
      [],
    )
    expect(activePoloImprovements({ ...INITIAL_POLO_STATE })).toEqual([])
    const ready = poloPhaseAt(improved, 'M5')
    expect(ready.improvements).toEqual(improved.improvements)
    expect(ready.improvements).not.toBe(improved.improvements)
    expect(poloPhaseAt(poloPhaseAt(ready, 'M0'), 'M6').improvements).toEqual(
      improved.improvements,
    )
  })
  it('accepts only boolean improvement flags at the server boundary and does not present old quantities as recalculated', () => {
    const improved: PoloSceneState = {
      ...foundations,
      improvements: { soil: true, foundation: true },
    }
    expect(poloSceneStateSchema.parse(improved).improvements).toEqual(
      improved.improvements,
    )
    expect(
      poloSceneStateSchema.safeParse({
        ...improved,
        improvements: { foundation: 'safe' },
      }).success,
    ).toBe(false)
    const facts = poloDiscussionContext(improved).polo
    expect(facts?.baseline).toBeNull()
    expect(facts?.mechanism).toContain('require structural assessment')
    expect(
      poloImpact(improved).find(
        (card) => card.title === 'Water, power and materials',
      )?.current,
    ).toBe('Not recalculated')
    expect(poloDiscussionContext(foundations).polo?.baseline).not.toBeNull()
    expect(poloEducation(improved, 'water').steps[0]?.text).toContain(
      'original plan',
    )
  })
  it('makes communities acknowledge improvements without erasing opposition or promising engineering safety', () => {
    const improved: PoloSceneState = {
      ...foundations,
      phase: 'M5',
      improvements: { soil: true, foundation: true, grounds: true },
    }
    const reactions = poloReactions(improved)
    expect(reactions.voices.neighbor.text).toContain('Our field is still gone')
    expect(reactions.voices.student.text).toContain('still needs a pitch')
    expect(reactions.voices.neighbor.sign).not.toBeNull()
    const facts = poloDiscussionContext(improved).polo
    if (!facts) throw new Error('Missing context')
    const reply = poloDialogueReply(
      'operator',
      'What needs electricity?',
      facts,
    )
    expect(reply.text).toContain('not been recalculated')
    expect(reply.text).toContain('do not')
  })
})
