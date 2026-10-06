import { COMMONS_API_URL } from '@/lib/commons'
import { createCaches, prepareSynthesis } from '@/lib/synthesis'
import { decodeText, fakeWiktionary, listen } from '../fakeWiktionary'

const WIKITEXTS = {
  salut: listen('France (Vosges)', 'salut.wav'),
  la: listen('Canada (Québec)', 'la.wav'),
}

describe('prepareSynthesis', () => {
  it('returns one decoded recording per word, in order', async () => {
    const result = await prepareSynthesis(['Salut', 'la', 'salut'], {
      decode: decodeText,
      caches: createCaches(),
      fetchFn: fakeWiktionary(WIKITEXTS),
    })
    expect(result).toEqual({
      status: 'ready',
      voices: [
        { word: 'Salut', title: 'salut', location: 'France (Vosges)', audio: 'salut.wav' },
        { word: 'la', title: 'la', location: 'Canada (Québec)', audio: 'la.wav' },
        { word: 'salut', title: 'salut', location: 'France (Vosges)', audio: 'salut.wav' },
      ],
    })
  })

  it('makes no network call at all the second time', async () => {
    const caches = createCaches<string>()
    await prepareSynthesis(['salut', 'la'], {
      decode: decodeText,
      caches,
      fetchFn: fakeWiktionary(WIKITEXTS),
    })
    const fetchFn = fakeWiktionary(WIKITEXTS)
    await prepareSynthesis(['salut', 'la'], { decode: decodeText, caches, fetchFn })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('stops before Commons when a word has no recording', async () => {
    const fetchFn = fakeWiktionary(WIKITEXTS)
    const result = await prepareSynthesis(['salut', 'zzzqx'], {
      decode: decodeText,
      caches: createCaches(),
      fetchFn,
    })
    expect(result).toEqual({ status: 'impossible', missing: ['zzzqx'] })
    expect(fetchFn.mock.calls.some(([url]) => String(url).startsWith(COMMONS_API_URL))).toBe(false)
  })

  it('gives up when a recording file is missing from Commons', async () => {
    const result = await prepareSynthesis(['salut', 'la'], {
      decode: decodeText,
      caches: createCaches(),
      fetchFn: fakeWiktionary(WIKITEXTS, { missingFiles: ['la.wav'] }),
    })
    expect(result).toEqual({ status: 'impossible', missing: ['la'] })
  })
})
