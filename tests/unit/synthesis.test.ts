import { COMMONS_API_URL } from '@/lib/commons'
import { createCaches, prepareSynthesis, voiceCredit, voiceSounds } from '@/lib/synthesis'
import { decodeText, FAKE_AUTHOR, FAKE_LICENSE, fakeWikimedia, listen } from '../fakeWikimedia'

const credit = { author: FAKE_AUTHOR, license: FAKE_LICENSE }

const WIKITEXTS = {
  salut: listen('France (Vosges)', 'salut.wav'),
  la: listen('Canada (Québec)', 'la.wav'),
  'l’': listen('France (Lyon)', 'l.wav'),
  ami: listen('Suisse', 'ami.wav'),
}

describe('prepareSynthesis', () => {
  it('returns one decoded recording per word, in order', async () => {
    const result = await prepareSynthesis(['Salut', 'la', 'salut'], {
      decode: decodeText,
      caches: createCaches(),
      fetchFn: fakeWikimedia(WIKITEXTS),
    })
    expect(result).toEqual({
      status: 'ready',
      voices: [
        {
          word: 'Salut',
          title: 'salut',
          location: 'France (Vosges)',
          ...credit,
          audio: 'salut.wav',
        },
        { word: 'la', title: 'la', location: 'Canada (Québec)', ...credit, audio: 'la.wav' },
        {
          word: 'salut',
          title: 'salut',
          location: 'France (Vosges)',
          ...credit,
          audio: 'salut.wav',
        },
      ],
    })
  })

  it('carries the recording of an elision with its word', async () => {
    const result = await prepareSynthesis(['l’ami'], {
      decode: decodeText,
      caches: createCaches(),
      fetchFn: fakeWikimedia(WIKITEXTS),
    })
    expect(result).toEqual({
      status: 'ready',
      voices: [
        {
          word: 'l’ami',
          title: 'ami',
          location: 'Suisse',
          ...credit,
          audio: 'ami.wav',
          elision: { ...credit, audio: 'l.wav' },
        },
      ],
    })
  })

  it('gives up when the recording of an elision is missing from Commons', async () => {
    const result = await prepareSynthesis(['l’ami'], {
      decode: decodeText,
      caches: createCaches(),
      fetchFn: fakeWikimedia(WIKITEXTS, { missingFiles: ['l.wav'] }),
    })
    expect(result).toEqual({ status: 'impossible', missing: ['l’ami'] })
  })

  it('makes no network call at all the second time', async () => {
    const caches = createCaches<string>()
    await prepareSynthesis(['salut', 'la'], {
      decode: decodeText,
      caches,
      fetchFn: fakeWikimedia(WIKITEXTS),
    })
    const fetchFn = fakeWikimedia(WIKITEXTS)
    await prepareSynthesis(['salut', 'la'], { decode: decodeText, caches, fetchFn })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('stops before Commons when a word has no recording', async () => {
    const fetchFn = fakeWikimedia(WIKITEXTS)
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
      fetchFn: fakeWikimedia(WIKITEXTS, { missingFiles: ['la.wav'] }),
    })
    expect(result).toEqual({ status: 'impossible', missing: ['la'] })
  })
})

describe('voiceSounds and voiceCredit', () => {
  const voice = { word: 'l’ami', title: 'ami', location: '', author: 'B', license: 'CC0', audio: 2 }

  it('list the sounds of a word, elision first', () => {
    expect(voiceSounds(voice)).toEqual([2])
    expect(voiceSounds({ ...voice, elision: { author: 'A', license: 'CC0', audio: 1 } })).toEqual([
      1, 2,
    ])
  })

  it('credit every distinct author and license', () => {
    expect(voiceCredit(voice)).toEqual({ author: 'B', license: 'CC0' })
    expect(
      voiceCredit({ ...voice, elision: { author: 'A', license: 'CC BY-SA 4.0', audio: 1 } }),
    ).toEqual({ author: 'A, B', license: 'CC BY-SA 4.0, CC0' })
    expect(voiceCredit({ ...voice, elision: { author: 'B', license: '', audio: 1 } })).toEqual({
      author: 'B',
      license: 'CC0',
    })
  })
})
