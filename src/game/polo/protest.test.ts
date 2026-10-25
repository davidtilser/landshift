import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHOICES } from '../consequences.ts'
import { plannerStateSchema } from '../../shared/community-contract.ts'
import { INITIAL_POLO_STATE } from './model.ts'
import { nudgePoloPlacement, poloPhaseAt } from './placement.ts'
import { poloReactions, poloProtestTurnout } from './reactions.ts'
import { poloTransitionFrame } from './transitions.ts'
import {
  INITIAL_POLO_PROTEST,
  PoloProtestFlow,
  POLO_PROTEST_STEPS,
  lockPoloForProtest,
  poloConstructionAfterProtest,
  poloProtestTransition,
} from './protest.ts'
import type { PoloProtestProgress } from './protest.ts'

function invitation(): PoloProtestProgress {
  return poloProtestTransition(
    poloProtestTransition(INITIAL_POLO_PROTEST, 'confirm'),
    'crowd-ready',
  )
}

describe('confirm, hear the protest, then construct', () => {
  it('locks placement at Today with a visible rally and no construction', () => {
    const chosen = {
      ...INITIAL_POLO_STATE,
      areaHa: 3.5,
      bearing: 35,
      center: nudgePoloPlacement(INITIAL_POLO_STATE.center, 20, 5),
    }
    const before = structuredClone(chosen)
    const locked = lockPoloForProtest(chosen)
    expect(locked).toMatchObject({
      confirmed: true,
      phase: 'M0',
      areaHa: chosen.areaHa,
      bearing: chosen.bearing,
      center: chosen.center,
      proposal: null,
    })
    expect(locked.center).not.toBe(chosen.center)
    expect(chosen).toEqual(before)
    expect(poloReactions(locked).turnout).toBeGreaterThan(0)
    expect(poloProtestTurnout(locked, 0)).toBeGreaterThan(0)
    expect(
      Object.values(poloReactions(locked).voices).some(
        (voice) => voice.sign !== null,
      ),
    ).toBe(true)
    expect(poloTransitionFrame(locked.phase, 60).foundation).toBe(0)
    expect(
      plannerStateSchema.safeParse({
        scenarioId: 'golden-gate-polo',
        center: locked.center,
        bearing: locked.bearing,
        choices: { ...DEFAULT_CHOICES },
        year: 0,
        weather: 'drought',
        polo: locked,
      }).success,
    ).toBe(true)
  })

  it('cannot start construction during gathering, invitation or any dialogue step', () => {
    const locked = lockPoloForProtest(INITIAL_POLO_STATE)
    let progress = poloProtestTransition(INITIAL_POLO_PROTEST, 'confirm')
    expect(progress.stage).toBe('gathering')
    for (const event of ['next', 'talk', 'skip'] as const)
      expect(poloProtestTransition(progress, event)).toBe(progress)
    expect(() => poloConstructionAfterProtest(locked, progress)).toThrow(
      'Hear or skip',
    )
    progress = poloProtestTransition(progress, 'crowd-ready')
    expect(progress.stage).toBe('invitation')
    expect(() => poloConstructionAfterProtest(locked, progress)).toThrow(
      'Hear or skip',
    )
    progress = poloProtestTransition(progress, 'talk')
    for (let step = 0; step < POLO_PROTEST_STEPS.length; step++) {
      expect(progress).toMatchObject({
        stage: 'conversation',
        step,
        outcome: null,
      })
      expect(() => poloConstructionAfterProtest(locked, progress)).toThrow(
        'Hear or skip',
      )
      progress = poloProtestTransition(progress, 'next')
    }
    expect(progress).toMatchObject({ stage: 'finished', outcome: 'heard' })
    const construction = poloConstructionAfterProtest(locked, progress)
    expect(construction).toMatchObject({
      confirmed: true,
      phase: 'M1',
      areaHa: locked.areaHa,
      center: locked.center,
      bearing: locked.bearing,
    })
    expect(
      poloTransitionFrame(construction.phase, 4).foundation,
    ).toBeGreaterThan(0)
    expect(poloPhaseAt(construction, 'M4').phase).toBe('M4')
  })

  it('supports an explicit skip from the invitation or conversation without claiming consent', () => {
    const locked = lockPoloForProtest(INITIAL_POLO_STATE)
    for (const progress of [
      invitation(),
      poloProtestTransition(invitation(), 'talk'),
    ]) {
      const skipped = poloProtestTransition(progress, 'skip')
      expect(skipped).toMatchObject({ stage: 'finished', outcome: 'skipped' })
      expect(poloConstructionAfterProtest(locked, skipped).phase).toBe('M1')
      expect(poloProtestTransition(skipped, 'skip')).toBe(skipped)
      expect(poloProtestTransition(skipped, 'next')).toBe(skipped)
    }
  })

  it('lets the player revisit arguments and resets without a delayed release', () => {
    let progress = poloProtestTransition(invitation(), 'talk')
    progress = poloProtestTransition(progress, 'next')
    progress = poloProtestTransition(progress, 'next')
    expect(progress.step).toBe(2)
    progress = poloProtestTransition(progress, 'back')
    expect(progress).toMatchObject({
      stage: 'conversation',
      step: 1,
      outcome: null,
    })
    progress = poloProtestTransition(progress, 'reset')
    expect(progress).toEqual(INITIAL_POLO_PROTEST)
    expect(poloProtestTransition(progress, 'crowd-ready')).toBe(progress)
    expect(poloProtestTransition(progress, 'next')).toBe(progress)
    expect(() =>
      poloConstructionAfterProtest(
        lockPoloForProtest(INITIAL_POLO_STATE),
        progress,
      ),
    ).toThrow('Hear or skip')
    expect(poloProtestTransition(progress, 'confirm').stage).toBe('gathering')
  })

  it('emits one completion per finished or skipped flow, after the UI update', () => {
    for (const finish of ['heard', 'skipped'] as const) {
      const states: PoloProtestProgress[] = []
      const complete = vi.fn((progress: PoloProtestProgress) => {
        expect(states.at(-1)).toBe(progress)
        expect(progress.stage).toBe('finished')
      })
      const flow = new PoloProtestFlow((progress) => {
        states.push(progress)
      }, complete)
      flow.dispatch('confirm')
      flow.dispatch('next')
      flow.dispatch('skip')
      expect(complete).not.toHaveBeenCalled()
      flow.dispatch('crowd-ready')
      expect(complete).not.toHaveBeenCalled()
      if (finish === 'heard') {
        flow.dispatch('talk')
        expect(complete).not.toHaveBeenCalled()
        for (let step = 0; step < POLO_PROTEST_STEPS.length; step++)
          flow.dispatch('next')
      } else flow.dispatch('skip')
      flow.dispatch('next')
      flow.dispatch('skip')
      flow.dispatch('crowd-ready')
      expect(complete).toHaveBeenCalledOnce()
      expect(complete.mock.calls[0]?.[0].outcome).toBe(finish)
      flow.dispatch('reset')
      expect(states.at(-1)).toEqual(INITIAL_POLO_PROTEST)
      flow.destroy()
      for (const event of ['confirm', 'crowd-ready', 'talk', 'skip'] as const)
        flow.dispatch(event)
      expect(complete).toHaveBeenCalledOnce()
    }
  })

  it('returns a programmatically closed dialogue to the invitation without releasing the gate', () => {
    const complete = vi.fn()
    let current = { ...INITIAL_POLO_PROTEST }
    const flow = new PoloProtestFlow((progress) => {
      current = progress
    }, complete)
    for (const event of [
      'confirm',
      'crowd-ready',
      'talk',
      'next',
      'close',
    ] as const)
      flow.dispatch(event)
    expect(current).toMatchObject({
      stage: 'invitation',
      step: 1,
      outcome: null,
    })
    expect(complete).not.toHaveBeenCalled()
    flow.dispatch('talk')
    expect(current).toMatchObject({ stage: 'conversation', step: 1 })
    expect(() =>
      poloConstructionAfterProtest(
        lockPoloForProtest(INITIAL_POLO_STATE),
        current,
      ),
    ).toThrow('Hear or skip')
  })

  it('keeps every argument short and names the site conflict despite efficiency', () => {
    expect(POLO_PROTEST_STEPS).toHaveLength(5)
    for (const step of POLO_PROTEST_STEPS)
      for (const copy of Object.values(step))
        expect(Array.from(copy).length).toBeLessThanOrEqual(70)
    const text = POLO_PROTEST_STEPS.map(
      (step) => step.answer + ' ' + step.detail,
    ).join(' ')
    expect(text).toContain('shared public space')
    expect(text).toContain('living turf')
    expect(text).toContain('water and electricity')
    expect(text).toContain('Players, neighbors and park users')
    expect(text).toContain('wrong site')
    expect(text).toContain('Efficiency does not replace our field')
  })
})
