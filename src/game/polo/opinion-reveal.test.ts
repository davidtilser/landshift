import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE } from './model.ts'
import { PoloOpinionReveal } from './opinion-reveal.ts'

describe('staggered construction conversation invitations', () => {
  it('shows the first invitation at five seconds and the second at eight', () => {
    const reveal = new PoloOpinionReveal()
    reveal.setState(
      { ...INITIAL_POLO_STATE, confirmed: true, phase: 'M1' },
      1000,
    )
    expect(reveal.count(5999)).toBe(0)
    expect(reveal.count(6000)).toBe(1)
    expect(reveal.count(8999)).toBe(1)
    expect(reveal.count(9000)).toBe(2)
  })

  it('does not restart for rain or other updates within the same phase', () => {
    const reveal = new PoloOpinionReveal()
    const state = {
      ...INITIAL_POLO_STATE,
      confirmed: true,
      phase: 'M1' as const,
    }
    reveal.setState(state, 1000)
    reveal.setState({ ...state, rain: true }, 5000)
    expect(reveal.count(6000)).toBe(1)
    reveal.setState({ ...state, preview: true }, 8000)
    expect(reveal.count(9000)).toBe(2)
  })

  it('starts fresh for the next phase and cancels on Today or reset', () => {
    const reveal = new PoloOpinionReveal()
    const state = {
      ...INITIAL_POLO_STATE,
      confirmed: true,
      phase: 'M1' as const,
    }
    reveal.setState(state, 1000)
    expect(reveal.count(9000)).toBe(2)
    reveal.setState({ ...state, phase: 'M4' }, 10000)
    expect(reveal.count(14999)).toBe(0)
    expect(reveal.count(15000)).toBe(1)
    reveal.setState({ ...state, phase: 'M0' }, 15500)
    expect(reveal.count(30000)).toBe(0)
    reveal.setState(state, 30000)
    expect(reveal.count(35000)).toBe(1)
    reveal.setState(INITIAL_POLO_STATE, 36000)
    expect(reveal.count(50000)).toBe(0)
  })
})
