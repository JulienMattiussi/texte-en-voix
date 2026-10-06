import { EXAMPLES } from '@/lib/examples'
import { MAX_WORDS } from '@/lib/pacing'
import { tokenize } from '@/lib/tokenize'

describe('EXAMPLES', () => {
  it('are distinct sentences that all fit within the word limit', () => {
    expect(new Set(EXAMPLES).size).toBe(EXAMPLES.length)
    for (const example of EXAMPLES) {
      expect(tokenize(example).length).toBeGreaterThan(0)
      expect(tokenize(example).length).toBeLessThanOrEqual(MAX_WORDS)
    }
  })
})
