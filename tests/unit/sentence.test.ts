import { lookupSentence, titleCandidates } from '@/lib/sentence'
import { fakeWikimedia, listen } from '../fakeWikimedia'

describe('titleCandidates', () => {
  it('tries the word as typed, then in lowercase', () => {
    expect(titleCandidates('Paris')).toEqual(['Paris', 'paris'])
    expect(titleCandidates('chat')).toEqual(['chat'])
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
