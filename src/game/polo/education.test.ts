import { describe, expect, it } from 'vitest'
import { POLO_BASELINE } from './baseline.ts'
import { splitPoloCopy } from './copy-steps.ts'
import { poloEducation, POLO_TOPICS } from './education.ts'
import { INITIAL_POLO_STATE, POLO_PHASES, POLO_PROPOSALS } from './model.ts'
import type { PoloSceneState } from './model.ts'

const text = (
  state: PoloSceneState,
  topic: (typeof POLO_TOPICS)[number],
): string =>
  poloEducation(state, topic)
    .steps.map((item) => [item.value, item.text].filter(Boolean).join(' '))
    .join(' ')

describe('Polo educational evidence', () => {
  it('keeps every reading step short for all chapters and proposals', () => {
    for (const phase of POLO_PHASES)
      for (const proposal of [null, ...POLO_PROPOSALS])
        for (const recipientAvailable of [false, true])
          for (const topic of POLO_TOPICS) {
            const education = poloEducation(
              { ...INITIAL_POLO_STATE, phase, proposal, recipientAvailable },
              topic,
            )
            expect(education.steps.length).toBeGreaterThan(2)
            expect(education.title.length).toBeLessThanOrEqual(70)
            for (const item of education.steps) {
              expect(item.title.length).toBeLessThanOrEqual(70)
              expect(item.text.length).toBeLessThanOrEqual(70)
              expect(item.kind.length).toBeLessThanOrEqual(70)
              if (item.value) expect(item.value.length).toBeLessThanOrEqual(70)
            }
          }
  })

  it('preserves unknown demand rather than presenting zero consumption', () => {
    const today = text(INITIAL_POLO_STATE, 'electricity')
    expect(today).toContain('not established')
    expect(
      poloEducation(INITIAL_POLO_STATE, 'electricity')
        .steps.map((item) => item.title)
        .join(' '),
    ).toContain('Unknown does not mean zero')
    expect(today).not.toMatch(/0 (?:MW|kWh|GWh)/)
    const foundation = text({ ...INITIAL_POLO_STATE, phase: 'M1' }, 'water')
    expect(foundation).toContain('not separately assessed')
    expect(foundation).not.toContain('0 m³')
  })

  it('uses the frozen operating assumptions and keeps derived units clear', () => {
    const operating: PoloSceneState = {
      ...INITIAL_POLO_STATE,
      confirmed: true,
      phase: 'M6',
    }
    const water = text(operating, 'water')
    const electricity = text(operating, 'electricity')
    expect(water).toContain('80k US gal/day')
    expect(water).not.toContain('L/day')
    expect(electricity).toContain(
      `${String(POLO_BASELINE.reference.averageFacilityMW)} MW`,
    )
    expect(electricity).toContain('105 GWh/year')
    expect(electricity).toContain(
      'Peak load and grid headroom are not established',
    )
  })

  it('provides large values only where the baseline has quantities', () => {
    expect(
      poloEducation(INITIAL_POLO_STATE, 'water').steps.some(
        (item) => item.value === '3.2M US gal/year',
      ),
    ).toBe(true)
    for (const phase of POLO_PHASES) {
      const state = { ...INITIAL_POLO_STATE, phase }
      expect(
        poloEducation(state, 'land').steps.some(
          (item) => item.value === '10 acres',
        ),
      ).toBe(true)
      if (phase === 'M0' || phase === 'M1')
        expect(
          poloEducation(state, 'electricity').steps.every(
            (item) => item.value === undefined,
          ),
        ).toBe(true)
      else
        expect(
          poloEducation(state, 'electricity').steps.some(
            (item) => item.value !== undefined,
          ),
        ).toBe(true)
    }
  })

  it('does not turn visual proposals into quantitative savings', () => {
    for (const proposal of POLO_PROPOSALS)
      for (const topic of POLO_TOPICS) {
        const education = poloEducation(
          { ...INITIAL_POLO_STATE, phase: 'M6', proposal },
          topic,
        )
        expect(
          education.steps.some((item) => item.kind === 'Visual concept'),
        ).toBe(true)
        expect(
          education.steps
            .filter((item) => item.kind === 'Visual concept')
            .every((item) => item.value === undefined),
        ).toBe(true)
        expect(education.steps.at(-1)?.text).toContain('no calculated savings')
      }
  })

  it('keeps complete explanations across reading steps', () => {
    for (const phase of POLO_BASELINE.phases)
      for (const original of [
        phase.summary,
        phase.tradeoff,
        ...phase.details,
      ]) {
        const parts = splitPoloCopy(original)
        expect(parts.every((part) => part.length <= 70)).toBe(true)
        expect(parts.join(' ')).toBe(original.trim().replace(/\s+/g, ' '))
      }
  })
})

describe('education follows the selected campus size', () => {
  it('shows scaled quantities and labels the assumption', () => {
    const state = { ...INITIAL_POLO_STATE, areaHa: 6 }
    expect(
      poloEducation(state, 'water').steps.some(
        (item) => item.value === '4.8M US gal/year',
      ),
    ).toBe(true)
    expect(
      poloEducation(state, 'land').steps.some(
        (item) => item.value === '15 acres',
      ),
    ).toBe(true)
    const operating = { ...state, confirmed: true, phase: 'M6' as const }
    expect(
      poloEducation(operating, 'water').steps.some(
        (item) => item.value === '120k US gal/day',
      ),
    ).toBe(true)
    expect(
      poloEducation(operating, 'electricity').steps.some(
        (item) => item.value === '18 MW',
      ),
    ).toBe(true)
    for (const topic of POLO_TOPICS)
      expect(poloEducation(state, topic).steps[0]?.title).toBe(
        'A size-based estimate',
      )
  })
})
