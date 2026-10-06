import { revealedCount, sleep, synthesisDuration } from '@/lib/pacing'

describe('synthesisDuration', () => {
  it('always lasts between 5 and 8 seconds', () => {
    expect(synthesisDuration(() => 0)).toBe(5000)
    expect(synthesisDuration(() => 0.5)).toBe(6500)
    expect(synthesisDuration(() => 0.9999)).toBe(8000)
  })
})

describe('sleep', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('resolves after the given delay', async () => {
    const done = vi.fn()
    void sleep(1000).then(done)
    await vi.advanceTimersByTimeAsync(999)
    expect(done).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toHaveBeenCalled()
  })

  it('rejects as soon as it is aborted', async () => {
    const controller = new AbortController()
    const sleeping = sleep(1000, controller.signal)
    controller.abort()
    await expect(sleeping).rejects.toThrow()
  })

  it('rejects immediately when already aborted', async () => {
    await expect(sleep(1000, AbortSignal.abort())).rejects.toThrow()
  })
})

describe('revealedCount', () => {
  it('reveals words proportionally to the progress, capped at the total', () => {
    expect(revealedCount(0, 4)).toBe(0)
    expect(revealedCount(0.5, 4)).toBe(2)
    expect(revealedCount(0.99, 4)).toBe(3)
    expect(revealedCount(1.2, 4)).toBe(4)
  })
})
