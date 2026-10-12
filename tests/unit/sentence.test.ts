import { lookupSentence, splitElision, titleCandidates } from '@/lib/sentence'
import { fakeWikimedia, listen } from '../fakeWikimedia'

describe('titleCandidates', () => {
  it('tries the word as typed, then in lowercase', () => {
    expect(titleCandidates('Paris')).toEqual(['Paris', 'paris'])
    expect(titleCandidates('chat')).toEqual(['chat'])
  })
})

describe('splitElision', () => {
  it('splits the elided word from the rest, with its full form', () => {
    expect(splitElision('j’aime')).toEqual({ elision: 'j’', fullForm: 'je', rest: 'aime' })
    expect(splitElision('Lorsqu’il')).toEqual({
      elision: 'Lorsqu’',
      fullForm: 'Lorsque',
      rest: 'il',
    })
    expect(splitElision('qu’aujourd’hui')).toEqual({
      elision: 'qu’',
      fullForm: 'que',
      rest: 'aujourd’hui',
    })
  })

  it('ignores words without elision', () => {
    expect(splitElision('chat')).toBeUndefined()
    expect(splitElision('peut-être')).toBeUndefined()
  })
})

describe('lookupSentence', () => {
  const wikitexts = {
    bonjour: listen('France (Vosges)', 'bonjour.wav'),
    le: listen('Canada (Québec)', 'le.wav'),
    chat: listen('France (Paris)', 'chat.wav'),
    Le: '== {{langue|en}} ==',
  }

  it('finds a voice for every word, falling back to lowercase titles', async () => {
    const result = await lookupSentence(['Bonjour', 'Le', 'chat'], {
      fetchFn: fakeWikimedia(wikitexts),
    })
    expect(result).toEqual({
      status: 'found',
      voices: [
        {
          word: 'Bonjour',
          title: 'bonjour',
          pronunciation: { location: 'France (Vosges)', ipa: '', audio: 'bonjour.wav' },
        },
        {
          word: 'Le',
          title: 'le',
          pronunciation: { location: 'Canada (Québec)', ipa: '', audio: 'le.wav' },
        },
        {
          word: 'chat',
          title: 'chat',
          pronunciation: { location: 'France (Paris)', ipa: '', audio: 'chat.wav' },
        },
      ],
    })
  })

  it('queries each title only once', async () => {
    const fetchFn = fakeWikimedia(wikitexts)
    await lookupSentence(['chat', 'chat', 'Chat'], { fetchFn })
    expect(new URL(String(fetchFn.mock.calls[0]![0])).searchParams.get('titles')).toBe('chat|Chat')
  })

  describe('flexions without recording', () => {
    const flexion = (ipa: string, lemma: string) =>
      `== {{langue|fr}} ==\n'''x''' {{pron|${ipa}|fr}}\n# ''Pluriel de'' [[${lemma}]].`
    const lemmaPage = (ipa: string, audio: string) =>
      `== {{langue|fr}} ==\n'''x''' {{pron|${ipa}|fr}}\n${listen('France (Vosges)', audio)}`

    it('borrow the voice of their base word when it sounds the same', async () => {
      const fetchFn = fakeWikimedia({
        mirabelles: flexion('mi.ʁa.bɛl', 'mirabelle'),
        mirabelle: lemmaPage('mi.ʁa.bɛl', 'mirabelle.wav'),
      })
      const result = await lookupSentence(['Mirabelles'], { fetchFn })
      expect(result).toEqual({
        status: 'found',
        voices: [
          {
            word: 'Mirabelles',
            title: 'mirabelles',
            lemma: 'mirabelle',
            pronunciation: { location: 'France (Vosges)', ipa: '', audio: 'mirabelle.wav' },
          },
        ],
      })
      expect(fetchFn).toHaveBeenCalledTimes(2)
    })

    it('stay missing when the base word sounds different', async () => {
      const result = await lookupSentence(['mangeons'], {
        fetchFn: fakeWikimedia({
          mangeons: flexion('mɑ̃.ʒɔ̃', 'manger'),
          manger: lemmaPage('mɑ̃.ʒe', 'manger.wav'),
        }),
      })
      expect(result).toEqual({ status: 'impossible', missing: ['mangeons'] })
    })
  })

  describe('elided words', () => {
    const ljai = listen('France (Lyon)', 'j.wav')
    const aime = listen('France (Vosges)', 'aime.wav')

    it('keep their own recording when the whole form has one', async () => {
      const fetchFn = fakeWikimedia({ 'c’est': listen('Suisse', 'c-est.wav') })
      const result = await lookupSentence(['C’est'], { fetchFn })
      expect(result).toMatchObject({ status: 'found', voices: [{ title: 'c’est' }] })
      expect(fetchFn).toHaveBeenCalledOnce()
    })

    it('otherwise play the elision glued to the word, in one extra query', async () => {
      const fetchFn = fakeWikimedia({ 'j’': ljai, aime })
      const result = await lookupSentence(['J’aime'], { fetchFn })
      expect(result).toEqual({
        status: 'found',
        voices: [
          {
            word: 'J’aime',
            title: 'aime',
            pronunciation: { location: 'France (Vosges)', ipa: '', audio: 'aime.wav' },
            elision: {
              title: 'j’',
              pronunciation: { location: 'France (Lyon)', ipa: '', audio: 'j.wav' },
            },
          },
        ],
      })
      expect(fetchFn).toHaveBeenCalledTimes(2)
    })

    it('fall back to the full form of the elision', async () => {
      const result = await lookupSentence(['j’aime'], {
        fetchFn: fakeWikimedia({ je: listen('Canada', 'je.wav'), aime }),
      })
      expect(result).toMatchObject({
        status: 'found',
        voices: [{ word: 'j’aime', elision: { title: 'je' } }],
      })
    })

    it('stay missing as a whole when a part has no recording', async () => {
      const result = await lookupSentence(['j’aime', 'l’avion'], {
        fetchFn: fakeWikimedia({ 'j’': ljai, aime, 'l’': ljai }),
      })
      expect(result).toEqual({ status: 'impossible', missing: ['l’avion'] })
    })
  })

  it('makes no extra query when every word has a recording', async () => {
    const fetchFn = fakeWikimedia(wikitexts)
    await lookupSentence(['chat'], { fetchFn })
    expect(fetchFn).toHaveBeenCalledOnce()
  })

  it('gives up when any word has no French recording, listing each missing word once', async () => {
    const result = await lookupSentence(['chat', 'zzzqx', 'Le', 'zzzqx'], {
      fetchFn: fakeWikimedia({}),
    })
    expect(result).toEqual({ status: 'impossible', missing: ['chat', 'zzzqx', 'Le'] })
  })
})
