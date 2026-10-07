import { fetchFileInfos, type FileInfo } from '@/lib/commons'
import { downloadAudio } from '@/lib/download'
import { lookupSentence } from '@/lib/sentence'

export type Voice<T> = {
  word: string
  title: string
  location: string
  lemma?: string
  author: string
  license: string
  audio: T
}

export type Synthesis<T> =
  { status: 'ready'; voices: Voice<T>[] } | { status: 'impossible'; missing: string[] }

export type SynthesisCaches<T> = {
  wikitexts: Map<string, string | null>
  fileInfos: Map<string, FileInfo | null>
  audio: Map<string, T | null>
}

export function createCaches<T>(): SynthesisCaches<T> {
  return { wikitexts: new Map(), fileInfos: new Map(), audio: new Map() }
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
  const infos = await fetchFileInfos(files, { fetchFn, signal, cache: caches.fileInfos })
  const audio = await downloadAudio(
    [...infos.values()].map(({ url }) => url),
    {
      decode,
      fetchFn,
      signal,
      spacingMs,
      cache: caches.audio,
    },
  )

  const voices: Voice<T>[] = []
  const missing = new Set<string>()
  for (const { word, title, pronunciation, lemma } of lookup.voices) {
    const info = infos.get(pronunciation.audio)
    const decoded = info === undefined ? undefined : audio.get(info.url)
    if (info === undefined || decoded === undefined) missing.add(word)
    else {
      const { author, license } = info
      voices.push({
        word,
        title,
        location: pronunciation.location,
        lemma,
        author,
        license,
        audio: decoded,
      })
    }
  }

  return missing.size > 0
    ? { status: 'impossible', missing: [...missing] }
    : { status: 'ready', voices }
}
