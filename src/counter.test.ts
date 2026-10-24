import { describe, expect, it } from 'vitest'
import { setupCounter } from './counter.ts'

describe('setupCounter', () => {
  it('renders the count and increments on click', () => {
    const button = Object.assign(new EventTarget(), {
      innerHTML: '',
    }) as unknown as HTMLButtonElement

    setupCounter(button)
    expect(button.innerHTML).toBe('Count is 0')

    button.dispatchEvent(new Event('click'))
    expect(button.innerHTML).toBe('Count is 1')
  })
})
