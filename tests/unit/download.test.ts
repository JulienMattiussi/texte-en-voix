import { downloadAudio } from '@/lib/download'
import { decodeText, fakeWiktionary, fileUrl } from '../fakeWiktionary'

describe('downloadAudio', () => {
  afterEach(() => vi.useRealTimers())

  it('downloads and decodes each file once', async () => {
    const fetchFn = fakeWiktionary({})
    const urls = [fileUrl('a.wav'), fileUrl('b.wav'), fileUrl('a.wav')]
    const result = await downloadAudio(urls, { decode: decodeText, fetchFn })
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(Object.fromEntries(result)).toEqual({ [urls[0]!]: 'a.wav', [urls[1]!]: 'b.wav' })
  })

  it('spaces out the downloads, one at a time', async () => {
    vi.useFakeTimers()
    const fetchFn = fakeWiktionary({})
    const done = downloadAudio([fileUrl('a.wav'), fileUrl('b.wav'), fileUrl('c.wav')], {
      decode: decodeText,
      fetchFn,
      spacingMs: 100,
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(100)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(100)
    expect((await done).size).toBe(3)
  })

  it('reuses the cache, including known failures', async () => {
    const cache = new Map<string, string | null>([
      [fileUrl('a.wav'), 'cached'],
      [fileUrl('broken.wav'), null],
    ])
    const fetchFn = fakeWiktionary({})
    const result = await downloadAudio([fileUrl('a.wav'), fileUrl('broken.wav')], {
      decode: decodeText,
      fetchFn,
      cache,
    })
    expect(fetchFn).not.toHaveBeenCalled()
    expect(Object.fromEntries(result)).toEqual({ [fileUrl('a.wav')]: 'cached' })
  })

  it('leaves out files that are gone or cannot be decoded', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('gone.wav')
        ? new Response('', { status: 404 })
        : new Response('garbage'),
    )
    const result = await downloadAudio([fileUrl('gone.wav'), fileUrl('bad.wav')], {
      decode: () => Promise.reject(new Error('EncodingError')),
      fetchFn,
    })
    expect(result.size).toBe(0)
  })

  it('throws on a server error', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 503 }))
    await expect(
      downloadAudio([fileUrl('a.wav')], { decode: decodeText, fetchFn }),
    ).rejects.toThrow('503')
  })

  it('passes the abort signal to fetch', async () => {
    const fetchFn = fakeWiktionary({})
    const { signal } = new AbortController()
    await downloadAudio([fileUrl('a.wav')], { decode: decodeText, fetchFn, signal })
    expect(fetchFn.mock.calls[0]![1]).toEqual({ signal })
  })
})
