import { parsePronunciations, pickPronunciation, type Pronunciation } from '@/lib/pronunciations'
import { fetchWikitexts, type FetchOptions } from '@/lib/wiktionary'

type WordVoice = {
  word: string
  title: string
  pronunciation: Pronunciation
}

export type SentenceLookup =
  { status: 'found'; voices: WordVoice[] } | { status: 'impossible'; missing: string[] }

// Wiktionary titles are case-sensitive: "Paris" has its own page, "Bonjour" does not.
export function titleCandidates(word: string): string[] {
  const lower = word.toLocaleLowerCase('fr')
  return lower === word ? [word] : [word, lower]
}

export async function lookupSentence(
  words: string[],
  options: FetchOptions = {},
): Promise<SentenceLookup> {
  const titles = [...new Set(words.flatMap(titleCandidates))]
  const wikitexts = await fetchWikitexts(titles, options)

  const voices: WordVoice[] = []
  const missing = new Set<string>()
  for (const word of words) {
    const voice = titleCandidates(word)
      .map((title) => {
        const pronunciation = pickPronunciation(parsePronunciations(wikitexts.get(title) ?? ''))
        return pronunciation && { word, title, pronunciation }
      })
      .find((candidate) => candidate !== undefined)
    if (voice) voices.push(voice)
    else missing.add(word)
  }

  return missing.size > 0
    ? { status: 'impossible', missing: [...missing] }
    : { status: 'found', voices }
}
