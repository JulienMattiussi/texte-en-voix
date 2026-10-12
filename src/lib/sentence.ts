import { flexionLemma, frenchIpas, sameIpa } from '@/lib/lemma'
import { parsePronunciations, pickPronunciation, type Pronunciation } from '@/lib/pronunciations'
import type { FetchOptions } from '@/lib/mediawiki'
import { fetchWikitexts } from '@/lib/wiktionary'

type Elision = { title: string; pronunciation: Pronunciation }

type WordVoice = {
  word: string
  title: string
  pronunciation: Pronunciation
  lemma?: string
  elision?: Elision
}

export type SentenceLookup =
  { status: 'found'; voices: WordVoice[] } | { status: 'impossible'; missing: string[] }

// Wiktionary titles are case-sensitive: "Paris" has its own page, "Bonjour" does not.
export function titleCandidates(word: string): string[] {
  const lower = word.toLocaleLowerCase('fr')
  return lower === word ? [word] : [word, lower]
}

const ELISION = /^([\p{L}]+’)([\p{L}\p{N}].*)$/u

// The full form ("je" for "j’", "lorsque" for "lorsqu’") is the fallback when the elision has no recording.
export function splitElision(word: string) {
  const [, elision, rest] = ELISION.exec(word) ?? []
  if (!elision || !rest) return undefined
  return { elision, fullForm: `${elision.slice(0, -1)}e`, rest }
}

type Flexion = { title: string; lemma: string; ipas: string[] }

function findFlexion(word: string, wikitexts: Map<string, string>): Flexion | undefined {
  for (const title of titleCandidates(word)) {
    const wikitext = wikitexts.get(title)
    if (wikitext === undefined) continue
    const lemma = flexionLemma(wikitext)
    const ipas = frenchIpas(wikitext)
    if (lemma && ipas.length > 0) return { title, lemma, ipas }
  }
  return undefined
}

// Only when the IPA matches: "mirabelles" may borrow "mirabelle", "mangeons" must not borrow "manger".
function borrowLemmaVoice(
  word: string,
  { title, lemma, ipas }: Flexion,
  lemmaWikitext: string,
): WordVoice | undefined {
  const pronunciations = parsePronunciations(lemmaWikitext)
  const lemmaIpas = [...frenchIpas(lemmaWikitext), ...pronunciations.map(({ ipa }) => ipa)]
  const pronunciation = pickPronunciation(pronunciations)
  const soundsAlike = ipas.some((ipa) => lemmaIpas.some((other) => sameIpa(ipa, other)))
  return pronunciation && soundsAlike ? { word, title, pronunciation, lemma } : undefined
}

async function findVoices(
  words: string[],
  options: FetchOptions,
): Promise<(WordVoice | undefined)[]> {
  const wikitexts = await fetchWikitexts([...new Set(words.flatMap(titleCandidates))], options)

  const voices = words.map((word) =>
    titleCandidates(word)
      .map((title) => {
        const pronunciation = pickPronunciation(parsePronunciations(wikitexts.get(title) ?? ''))
        return pronunciation && { word, title, pronunciation }
      })
      .find((candidate): candidate is WordVoice => candidate !== undefined),
  )

  const flexions = new Map<number, Flexion>()
  voices.forEach((voice, index) => {
    const flexion = voice ? undefined : findFlexion(words[index]!, wikitexts)
    if (flexion) flexions.set(index, flexion)
  })
  if (flexions.size > 0) {
    const lemmas = [...new Set([...flexions.values()].map(({ lemma }) => lemma))]
    const lemmaWikitexts = await fetchWikitexts(lemmas, options)
    for (const [index, flexion] of flexions) {
      const lemmaWikitext = lemmaWikitexts.get(flexion.lemma)
      if (lemmaWikitext !== undefined) {
        voices[index] = borrowLemmaVoice(words[index]!, flexion, lemmaWikitext)
      }
    }
  }
  return voices
}

// Whole forms first ("c’est", "aujourd’hui" have their own recordings), then elision + word.
async function splitElisions(
  words: string[],
  voices: (WordVoice | undefined)[],
  options: FetchOptions,
) {
  const splits = new Map<number, NonNullable<ReturnType<typeof splitElision>>>()
  voices.forEach((voice, index) => {
    const split = voice ? undefined : splitElision(words[index]!)
    if (split) splits.set(index, split)
  })
  if (splits.size === 0) return

  const parts = [...new Set([...splits.values()].flatMap((split) => Object.values(split)))]
  const found = await findVoices(parts, options)
  const partVoice = (part: string) => found[parts.indexOf(part)]
  for (const [index, { elision, fullForm, rest }] of splits) {
    const elided = partVoice(elision) ?? partVoice(fullForm)
    const main = partVoice(rest)
    if (elided && main) {
      const { title, pronunciation } = elided
      voices[index] = { ...main, word: words[index]!, elision: { title, pronunciation } }
    }
  }
}

export async function lookupSentence(
  words: string[],
  options: FetchOptions = {},
): Promise<SentenceLookup> {
  const voices = await findVoices(words, options)
  await splitElisions(words, voices, options)

  const missing = [...new Set(words.filter((_, index) => voices[index] === undefined))]
  return missing.length > 0
    ? { status: 'impossible', missing }
    : { status: 'found', voices: voices.filter((voice) => voice !== undefined) }
}
