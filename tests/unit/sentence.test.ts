import { lookupSentence, titleCandidates } from '@/lib/sentence'
import { fakeWiktionary, listen } from '../fakeWiktionary'

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
      fetchFn: fakeWiktionary(wikitexts),
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
    const fetchFn = fakeWiktionary(wikitexts)
    await lookupSentence(['chat', 'chat', 'Chat'], { fetchFn })
    expect(new URL(String(fetchFn.mock.calls[0]![0])).searchParams.get('titles')).toBe('chat|Chat')
  })

  it('gives up when any word has no French recording, listing each missing word once', async () => {
    const result = await lookupSentence(['chat', 'zzzqx', 'Le', 'zzzqx'], {
      fetchFn: fakeWiktionary({}),
    })
    expect(result).toEqual({ status: 'impossible', missing: ['chat', 'zzzqx', 'Le'] })
  })
})
