import { LOADING_MESSAGES, MESSAGE_PERIOD_MS, messageAt } from '@/lib/messages'

describe('messageAt', () => {
  const messages = ['a', 'b', 'c']

  it('starts with the chosen message and moves on every period', () => {
    expect(messageAt(messages, 1, 0)).toBe('b')
    expect(messageAt(messages, 1, MESSAGE_PERIOD_MS - 1)).toBe('b')
    expect(messageAt(messages, 1, MESSAGE_PERIOD_MS)).toBe('c')
  })

  it('loops back to the first message', () => {
    expect(messageAt(messages, 2, MESSAGE_PERIOD_MS)).toBe('a')
  })

  it('has enough loading messages to cover the longest preparation without repeating', () => {
    expect(LOADING_MESSAGES.length * MESSAGE_PERIOD_MS).toBeGreaterThanOrEqual(8000)
  })
})
