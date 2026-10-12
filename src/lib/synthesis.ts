import { fetchFileInfos, type FileInfo } from '@/lib/commons'
import { downloadAudio } from '@/lib/download'
import { lookupSentence } from '@/lib/sentence'

type Sound<T> = { author: string; license: string; audio: T }

export type Voice<T> = Sound<T> & {
  word: string
  title: string
  location: string
  lemma?: string
  elision?: Sound<T>
}

export function voiceSounds<T>({ elision, audio }: Voice<T>): T[] {
  return elision ? [elision.audio, audio] : [audio]
}

export function voiceCredit({ elision, author, license }: Voice<unknown>) {
  const join = (values: string[]) => [...new Set(values.filter(Boolean))].join(', ')
  const sounds = elision ? [elision, { author, license }] : [{ author, license }]
  return {
    author: join(sounds.map((sound) => sound.author)),
    license: join(sounds.map((sound) => sound.license)),
  }
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

  const files = lookup.voices.flatMap(({ elision, pronunciation }) =>
    elision ? [elision.pronunciation.audio, pronunciation.audio] : [pronunciation.audio],
  )
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

  const sound = (file: string): Sound<T> | undefined => {
    const info = infos.get(file)
    const decoded = info && audio.get(info.url)
    return info && decoded !== undefined
      ? { author: info.author, license: info.license, audio: decoded }
      : undefined
  }

  const voices: Voice<T>[] = []
  const missing = new Set<string>()
  for (const { word, title, pronunciation, lemma, elision } of lookup.voices) {
    const main = sound(pronunciation.audio)
    const elided = elision && sound(elision.pronunciation.audio)
    if (!main || (elision && !elided)) missing.add(word)
    else {
      voices.push({
        word,
        title,
        location: pronunciation.location,
        lemma,
        ...main,
        ...(elided && { elision: elided }),
      })
    }
  }

  return missing.size > 0
    ? { status: 'impossible', missing: [...missing] }
    : { status: 'ready', voices }
}
