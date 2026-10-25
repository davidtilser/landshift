import { describe, expect, it } from 'vitest'
import { DEFAULT_CHOICES } from '../consequences.ts'
import { plannerStateSchema } from '../../shared/community-contract.ts'
import { communityProfiles } from '../community-profiles.ts'
import { CommunitySession } from '../community-session.ts'
import { INITIAL_POLO_STATE, POLO_CENTER, POLO_PROPOSALS } from './model.ts'
import { poloDiscussionContext } from './context.ts'

const plan = {
  scenarioId: 'golden-gate-polo' as const,
  center: POLO_CENTER,
  bearing: 0,
  choices: { ...DEFAULT_CHOICES },
  year: 0 as const,
  weather: 'drought' as const,
  polo: { ...INITIAL_POLO_STATE },
}
describe('separate Polo Fields research context', () => {
  it('requires a valid Polo scene and limits proposals to operation', () => {
    expect(plannerStateSchema.safeParse(plan).success).toBe(true)
    expect(
      plannerStateSchema.safeParse({ ...plan, polo: undefined }).success,
    ).toBe(false)
    expect(
      plannerStateSchema.safeParse({ ...plan, scenarioId: 'golden-gate-park' })
        .success,
    ).toBe(false)
    expect(
      plannerStateSchema.safeParse({
        ...plan,
        polo: { ...plan.polo, proposal: 'green_roof' },
      }).success,
    ).toBe(false)
  })
  it('rejects removed preparation stops and keeps foundation-only budgets out of chat', () => {
    for (const phase of ['M2', 'M3'])
      expect(
        plannerStateSchema.safeParse({
          ...plan,
          polo: { ...plan.polo, confirmed: true, phase },
        }).success,
      ).toBe(false)
    const context = poloDiscussionContext({
      ...plan.polo,
      confirmed: true,
      phase: 'M1',
    })
    expect(context.polo?.stage).toBe('Foundations')
    expect(context.polo?.baseline?.map((metric) => metric.label)).toEqual([
      'Turf disturbed',
      'Foundation footprint',
    ])
    expect(context.polo?.mechanism).toContain('not separately assessed')
  })
  it('hides baseline figures from every visual concept and restores them for original comparison', () => {
    for (const proposal of POLO_PROPOSALS) {
      const state = {
        ...INITIAL_POLO_STATE,
        phase: 'M6' as const,
        confirmed: true,
        proposal,
      }
      const preview = poloDiscussionContext(state)
      expect(preview.polo?.baseline).toBeNull()
      expect(preview.polo?.mechanism).toContain('Visual concept only')
      expect(
        poloDiscussionContext({ ...state, preview: false }).polo?.baseline
          ?.length,
      ).toBeGreaterThan(0)
    }
  })
  it('grounds the unavailable-recipient case without inventing a heat result', () => {
    const context = poloDiscussionContext({
      ...INITIAL_POLO_STATE,
      phase: 'M6',
      confirmed: true,
      proposal: 'heat_reuse_neighbors',
      recipientAvailable: false,
    })
    expect(context.polo?.mechanism).toContain('delivery stops')
    expect(context.polo?.mechanism).toContain('computing continues')
    expect(context.polo?.baseline).toBeNull()
  })
  it('uses Polo characters and keeps one timeline through phase and proposal changes', () => {
    const session = new CommunitySession()
    const profiles = communityProfiles(poloDiscussionContext(plan.polo))
    session.sync(plan, profiles)
    expect(profiles.map((profile) => profile.name)).toContain('Young player')
    expect(profiles.map((profile) => profile.name)).not.toContain(
      'Memorial steward',
    )
    const opening = session.publicThread.lines[0]
    const next = {
      ...plan,
      polo: {
        ...plan.polo,
        phase: 'M6' as const,
        confirmed: true,
        proposal: 'green_roof' as const,
      },
    }
    session.sync(next, communityProfiles(poloDiscussionContext(next.polo)))
    expect(session.publicThread.lines[0]).toBe(opening)
    expect(
      session.publicThread.lines.some(
        (line) => line.kind === 'update' && line.text.includes('Green roof'),
      ),
    ).toBe(true)
  })
})
