import { normalizationGain, timeline, voiceBounds } from '@/lib/audio'

const SAMPLE_RATE = 1000

function signal(silenceBefore: number, voice: number, silenceAfter: number, amplitude = 0.5) {
  return new Float32Array([
    ...Array<number>(silenceBefore).fill(0.001),
    ...Array<number>(voice).fill(amplitude),
    ...Array<number>(silenceAfter).fill(0.001),
  ])
}

describe('voiceBounds', () => {
  it('trims the leading and trailing silence, keeping a 30 ms margin', () => {
    expect(voiceBounds(signal(500, 200, 400), SAMPLE_RATE)).toEqual({ start: 470, end: 730 })
  })

  it('never goes past the edges', () => {
    expect(voiceBounds(signal(10, 100, 10), SAMPLE_RATE)).toEqual({ start: 0, end: 120 })
  })

  it('keeps a fully silent clip whole', () => {
    expect(voiceBounds(new Float32Array(50), SAMPLE_RATE)).toEqual({ start: 0, end: 50 })
  })
})

describe('normalizationGain', () => {
  it('brings the peak of the voice to 0.8', () => {
    expect(normalizationGain(signal(0, 10, 0, 0.4), 0, 10)).toBeCloseTo(2)
    expect(normalizationGain(signal(0, 10, 0, 1), 0, 10)).toBeCloseTo(0.8)
  })

  it('caps the gain of very quiet recordings and ignores silence', () => {
    expect(normalizationGain(signal(0, 10, 0, 0.01), 0, 10)).toBe(5)
    expect(normalizationGain(new Float32Array(10), 0, 10)).toBe(1)
  })
})

describe('timeline', () => {
  it('chains the words with a short gap', () => {
    const { starts, total } = timeline([0.5, 0.25, 1], 0.1)
    expect(starts[0]).toBe(0)
    expect(starts[1]).toBeCloseTo(0.6)
    expect(starts[2]).toBeCloseTo(0.95)
    expect(total).toBeCloseTo(1.95)
  })

  it('is empty without words', () => {
    expect(timeline([])).toEqual({ starts: [], total: 0 })
  })
})
