import { sleep } from '@/lib/pacing'

export type DownloadOptions<T> = {
  decode: (data: ArrayBuffer) => Promise<T>
  fetchFn?: typeof fetch
  signal?: AbortSignal
  cache?: Map<string, T | null>
  spacingMs?: number
}

export async function downloadAudio<T>(
  urls: string[],
  { decode, fetchFn = fetch, signal, cache = new Map(), spacingMs = 0 }: DownloadOptions<T>,
): Promise<Map<string, T>> {
  let first = true
  for (const url of new Set(urls)) {
    if (cache.has(url)) continue
    if (!first) await sleep(spacingMs, signal)
    first = false
    const response = await fetchFn(url, { signal })
    if (response.status === 404) {
      cache.set(url, null)
      continue
    }
    if (!response.ok) throw new Error(`Audio download error: ${response.status}`)
    const data = await response.arrayBuffer()
    cache.set(url, await decode(data).catch(() => null))
  }

  const result = new Map<string, T>()
  for (const url of urls) {
    const audio = cache.get(url)
    if (audio != null) result.set(url, audio)
  }
  return result
}
