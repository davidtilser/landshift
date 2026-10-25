import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommunityAutoplay } from './community-autoplay.ts'

afterEach(() => {
  vi.useRealTimers()
})
describe('automatic community discussion', () => {
  it('starts without a CTA, paces rounds, and stops after a bounded exchange', async () => {
    vi.useFakeTimers()
    const run = vi.fn(() => Promise.resolve(true)),
      onIdle = vi.fn()
    const autoplay = new CommunityAutoplay({
      run,
      canRun: () => true,
      onIdle,
      delayMs: 1000,
    })
    autoplay.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(999)
    expect(run).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10000)
    expect(run).toHaveBeenCalledTimes(4)
    expect(autoplay.active).toBe(false)
    expect(onIdle).toHaveBeenCalledOnce()
  })
  it('does not request replies while the page is hidden or the player is composing', async () => {
    vi.useFakeTimers()
    let allowed = false
    const run = vi.fn(() => Promise.resolve(true))
    const autoplay = new CommunityAutoplay({
      run,
      canRun: () => allowed,
      onIdle: () => {},
      delayMs: 1000,
    })
    autoplay.start()
    await vi.advanceTimersByTimeAsync(3000)
    expect(run).not.toHaveBeenCalled()
    allowed = true
    await vi.advanceTimersByTimeAsync(1000)
    expect(run).toHaveBeenCalledOnce()
    autoplay.stop()
    await vi.advanceTimersByTimeAsync(10000)
    expect(run).toHaveBeenCalledOnce()
  })
  it('closing or typing invalidates a pending automatic continuation', async () => {
    vi.useFakeTimers()
    let finish: ((value: boolean) => void) | undefined
    const run = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve
        }),
    )
    const autoplay = new CommunityAutoplay({
      run,
      canRun: () => true,
      onIdle: () => {},
      delayMs: 1000,
    })
    autoplay.start()
    await vi.advanceTimersByTimeAsync(0)
    autoplay.stop()
    finish?.(true)
    await vi.advanceTimersByTimeAsync(10000)
    expect(run).toHaveBeenCalledOnce()
    expect(autoplay.active).toBe(false)
  })
  it('does not retry a failed model call automatically', async () => {
    vi.useFakeTimers()
    const run = vi.fn(() => Promise.reject(new Error('Provider unavailable')))
    const autoplay = new CommunityAutoplay({
      run,
      canRun: () => true,
      onIdle: () => {},
      delayMs: 1000,
    })
    autoplay.start()
    await vi.advanceTimersByTimeAsync(10000)
    expect(run).toHaveBeenCalledOnce()
    expect(autoplay.active).toBe(false)
  })
  it('a delayed restart after a plan change ignores an old in-flight round', async () => {
    vi.useFakeTimers()
    let finish: ((value: boolean) => void) | undefined
    const run = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            finish = resolve
          }),
      )
      .mockImplementation(() => Promise.resolve(true))
    const autoplay = new CommunityAutoplay({
      run,
      canRun: () => true,
      onIdle: () => {},
      delayMs: 1000,
      maxRounds: 1,
    })
    autoplay.start()
    await vi.advanceTimersByTimeAsync(0)
    autoplay.start(false)
    finish?.(false)
    await vi.advanceTimersByTimeAsync(999)
    expect(run).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1)
    expect(run).toHaveBeenCalledTimes(2)
    expect(autoplay.active).toBe(false)
  })
})
