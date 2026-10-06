import { pickRandom, pickRandomIndex } from '@/lib/random'

describe('pickRandomIndex', () => {
  it('maps the random number onto a valid index', () => {
    expect(pickRandomIndex(['a', 'b', 'c'], () => 0)).toBe(0)
    expect(pickRandomIndex(['a', 'b', 'c'], () => 0.5)).toBe(1)
    expect(pickRandomIndex(['a', 'b', 'c'], () => 0.99999)).toBe(2)
  })
})

describe('pickRandom', () => {
  it('returns the item at the random index', () => {
    expect(pickRandom(['a', 'b', 'c'], () => 0.7)).toBe('c')
  })
})
