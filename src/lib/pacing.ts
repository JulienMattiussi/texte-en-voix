export const MAX_WORDS = 50
export const CANCEL_COOLDOWN_MS = 3000
const MIN_DURATION_MS = 5000
const DURATION_JITTER_MS = 3000

export function synthesisDuration(random: () => number = Math.random): number {
  return MIN_DURATION_MS + Math.round(random() * DURATION_JITTER_MS)
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

export function revealedCount(progress: number, total: number): number {
  return Math.min(total, Math.floor(progress * total))
}
