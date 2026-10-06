import { fetchFileUrls } from '@/lib/commons'
import { downloadAudio } from '@/lib/download'
import { lookupSentence } from '@/lib/sentence'

export type Voice<T> = {
  word: string
  title: string
  location: string
  lemma?: string
  audio: T
}

export type Synthesis<T> =
  { status: 'ready'; voices: Voice<T>[] } | { status: 'impossible'; missing: string[] }

export type SynthesisCaches<T> = {
  wikitexts: Map<string, string | null>
  fileUrls: Map<string, string | null>
  audio: Map<string, T | null>
}

export function createCaches<T>(): SynthesisCaches<T> {
  return { wikitexts: new Map(), fileUrls: new Map(), audio: new Map() }
}

type SynthesisOptions<T> = {
  decode: (data: ArrayBuffer) => Promise<T>
  caches: SynthesisCaches<T>
  fetchFn?: typeof fetch
  signal?: AbortSignal
  spacingMs?: number
}

export async function prepareSynthesis<T>(
  words: string[],
  { decode, caches, fetchFn, signal, spacingMs }: SynthesisOptions<T>,
): Promise<Synthesis<T>> {
  const lookup = await lookupSentence(words, { fetchFn, signal, cache: caches.wikitexts })
  if (lookup.status === 'impossible') return lookup

  const files = lookup.voices.map((voice) => voice.pronunciation.audio)
  const urls = await fetchFileUrls(files, { fetchFn, signal, cache: caches.fileUrls })
  const audio = await downloadAudio([...urls.values()], {
    decode,
    fetchFn,
    signal,
    spacingMs,
    cache: caches.audio,
  })

  const voices: Voice<T>[] = []
  const missing = new Set<string>()
  for (const { word, title, pronunciation, lemma } of lookup.voices) {
    const url = urls.get(pronunciation.audio)
    const decoded = url === undefined ? undefined : audio.get(url)
    if (decoded === undefined) missing.add(word)
    else voices.push({ word, title, location: pronunciation.location, lemma, audio: decoded })
  }

  return missing.size > 0
    ? { status: 'impossible', missing: [...missing] }
    : { status: 'ready', voices }
}
