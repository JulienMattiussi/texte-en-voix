const SILENCE_RATIO = 0.05
const PADDING_S = 0.03
const TARGET_PEAK = 0.8
const MAX_GAIN = 5
const WORD_GAP_S = 0.08

function peak(samples: Float32Array, start = 0, end = samples.length): number {
  let max = 0
  for (let i = start; i < end; i++) max = Math.max(max, Math.abs(samples[i]!))
  return max
}

export function voiceBounds(samples: Float32Array, sampleRate: number) {
  const threshold = peak(samples) * SILENCE_RATIO
  if (threshold === 0) return { start: 0, end: samples.length }
  let first = 0
  while (Math.abs(samples[first]!) < threshold) first++
  let last = samples.length - 1
  while (Math.abs(samples[last]!) < threshold) last--
  const padding = Math.round(PADDING_S * sampleRate)
  return { start: Math.max(0, first - padding), end: Math.min(samples.length, last + 1 + padding) }
}

export function normalizationGain(samples: Float32Array, start: number, end: number): number {
  const max = peak(samples, start, end)
  return max === 0 ? 1 : Math.min(MAX_GAIN, TARGET_PEAK / max)
}

export function timeline(durations: number[], gap = WORD_GAP_S) {
  const starts: number[] = []
  let cursor = 0
  for (const duration of durations) {
    starts.push(cursor)
    cursor += duration + gap
  }
  return { starts, total: Math.max(0, cursor - gap) }
}
