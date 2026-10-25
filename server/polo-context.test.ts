import { describe, expect, it } from 'vitest'
import { communityContext, communityPrompt } from './community-engine.ts'
import { DEFAULT_CHOICES } from '../src/game/consequences.ts'
import { INITIAL_POLO_STATE, POLO_CENTER } from '../src/game/polo/model.ts'
import type { CommunityRequest } from '../src/shared/community-contract.ts'

const request: CommunityRequest = {
  mode: 'private',
  target: 'operator',
  message: 'Could we use this heat?',
  history: [],
  plan: {
    scenarioId: 'golden-gate-polo',
    center: POLO_CENTER,
    bearing: 0,
    choices: { ...DEFAULT_CHOICES },
    year: 0,
    weather: 'drought',
    polo: {
      ...INITIAL_POLO_STATE,
      phase: 'M6',
      confirmed: true,
      proposal: 'heat_reuse_neighbors',
    },
  },
}
describe('Polo community server grounding', () => {
  it('uses the prepared scenario and avoids importing old sandbox consequences', async () => {
    const context = await communityContext(request.plan)
    const prompt = communityPrompt(request, context)
    expect(prompt).toContain('fictional model pool')
    expect(prompt).toContain('VISUAL CONCEPTS')
    expect(prompt).not.toContain('waterM3PerDay')
    expect(prompt).not.toContain('remainingGameCredits')
    expect(prompt).not.toContain('105.12')
    expect(prompt).toContain('"id":"operator"')
    expect(prompt).not.toContain('"id":"neighbor"')
  })
  it('returns stage-specific baseline facts only in the original view', async () => {
    const state = request.plan.polo
    if (!state) throw new Error('Missing test scene')
    const context = await communityContext({
      ...request.plan,
      polo: { ...state, preview: false },
    })
    expect(
      context.polo?.baseline?.some((metric) => metric.value.includes('300')),
    ).toBe(true)
    expect(
      context.polo?.baseline?.some((metric) => metric.value.includes('105.12')),
    ).toBe(true)
  })
})
