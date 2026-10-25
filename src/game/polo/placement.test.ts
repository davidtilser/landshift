import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE, POLO_CENTER, POLO_PHASES } from './model.ts'
import {
  confirmPoloPlacement,
  nudgePoloPlacement,
  poloPhaseAt,
  poloPlacementValid,
  movePoloCampus,
  normalizePoloBearing,
} from './placement.ts'
import { plannerStateSchema } from '../../shared/community-contract.ts'
import { DEFAULT_CHOICES } from '../consequences.ts'
import { poloDiscussionContext } from './context.ts'

describe('place, confirm, then follow the Polo story', () => {
  it('requires confirmation before any timeline navigation', () => {
    expect(INITIAL_POLO_STATE.confirmed).toBe(false)
    for (const phase of POLO_PHASES)
      expect(() => poloPhaseAt(INITIAL_POLO_STATE, phase)).toThrow(
        'Confirm a location',
      )
    const context = poloDiscussionContext(INITIAL_POLO_STATE)
    expect(context.polo?.stage).toContain('unconfirmed')
    expect(context.polo?.baseline).toBeNull()
  })
  it('allows free placement rather than restricting the campus to the field', () => {
    expect(poloPlacementValid(POLO_CENTER)).toBe(true)
    expect(poloPlacementValid(nudgePoloPlacement(POLO_CENTER, 100, 70))).toBe(
      true,
    )
    expect(poloPlacementValid([NaN, POLO_CENTER[1]])).toBe(false)
    expect(poloPlacementValid([181, POLO_CENTER[1]])).toBe(false)
    const outsideField = nudgePoloPlacement(POLO_CENTER, 100, 70)
    expect(
      confirmPoloPlacement({ ...INITIAL_POLO_STATE, center: outsideField })
        .center,
    ).toEqual(outsideField)
  })
  it('rotates through a full turn in either direction', () => {
    expect(normalizePoloBearing(-5)).toBe(355)
    expect(normalizePoloBearing(365)).toBe(5)
    expect(normalizePoloBearing(720)).toBe(0)
    expect(() => normalizePoloBearing(NaN)).toThrow('valid orientation')
  })
  it('moves and rotates a confirmed operating campus without rewinding or reconfirming', () => {
    const operating = poloPhaseAt(
      confirmPoloPlacement(INITIAL_POLO_STATE),
      'M6',
    )
    const moved = movePoloCampus(
      operating,
      nudgePoloPlacement(POLO_CENTER, 100, 70),
      -5,
    )
    expect(moved.confirmed).toBe(true)
    expect(moved.phase).toBe('M6')
    expect(moved.proposal).toBe('heat_reuse_neighbors')
    expect(moved.bearing).toBe(355)
    expect(moved.center).not.toEqual(operating.center)
  })
  it('preserves the chosen position through every phase, replayed phase and proposal', () => {
    const center = nudgePoloPlacement(POLO_CENTER, 20, 5)
    const confirmed = confirmPoloPlacement({
      ...INITIAL_POLO_STATE,
      center,
      bearing: 35,
    })
    for (const phase of [...POLO_PHASES, 'M0', 'M6'] as const) {
      const next = poloPhaseAt(confirmed, phase)
      expect(next.confirmed).toBe(true)
      expect(next.center).toEqual(center)
      expect(next.center).not.toBe(center)
      expect(next.phase).toBe(phase)
      expect(next.bearing).toBe(35)
      expect(next.proposal).toBe(phase === 'M6' ? 'heat_reuse_neighbors' : null)
    }
  })
  it('rejects unconfirmed phases and inconsistent or invalid coordinates at the server boundary', () => {
    const plan = {
      scenarioId: 'golden-gate-polo',
      center: [...POLO_CENTER],
      bearing: 0,
      choices: { ...DEFAULT_CHOICES },
      year: 0,
      weather: 'drought',
      polo: { ...INITIAL_POLO_STATE },
    }
    expect(plannerStateSchema.safeParse(plan).success).toBe(true)
    expect(
      plannerStateSchema.safeParse({
        ...plan,
        polo: { ...plan.polo, phase: 'M1' },
      }).success,
    ).toBe(false)
    expect(
      plannerStateSchema.safeParse({
        ...plan,
        polo: { ...plan.polo, center: nudgePoloPlacement(POLO_CENTER, 20, 5) },
      }).success,
    ).toBe(false)
    const bad: [number, number] = [181, POLO_CENTER[1]]
    expect(
      plannerStateSchema.safeParse({
        ...plan,
        center: bad,
        polo: { ...plan.polo, center: bad },
      }).success,
    ).toBe(false)
    const chosen = nudgePoloPlacement(POLO_CENTER, 100, 70)
    expect(
      plannerStateSchema.safeParse({
        ...plan,
        center: chosen,
        polo: { ...plan.polo, center: chosen, confirmed: true, phase: 'M1' },
      }).success,
    ).toBe(true)
  })
})
