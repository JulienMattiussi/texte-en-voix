const API_URL = 'https://fr.wiktionary.org/w/api.php'
const MAX_TITLES_PER_QUERY = 50

type TitleMapping = { from: string; to: string }

type QueryPage = {
  title: string
  missing?: boolean
  revisions?: { slots: { main: { content: string } } }[]
}

type QueryResponse = {
  query?: { pages?: QueryPage[]; normalized?: TitleMapping[]; redirects?: TitleMapping[] }
  continue?: Record<string, string>
}

export function buildQueryUrl(titles: string[], continuation: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    redirects: '1',
    format: 'json',
    formatversion: '2',
    origin: '*',
    titles: titles.join('|'),
    ...continuation,
  })
  return `${API_URL}?${params}`
}

async function queryChunk(
  titles: string[],
  fetchFn: typeof fetch,
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  const contents = new Map<string, string>()
  const aliases = new Map<string, string>()
  let continuation: Record<string, string> | undefined = {}

  // Big pages can overflow the API response size limit; the rest then comes through `continue`.
  while (continuation) {
    const response = await fetchFn(buildQueryUrl(titles, continuation), { signal })
    if (!response.ok) throw new Error(`Wiktionary API error: ${response.status}`)
    const data = (await response.json()) as QueryResponse
    for (const { from, to } of [
      ...(data.query?.normalized ?? []),
      ...(data.query?.redirects ?? []),
    ]) {
      aliases.set(from, to)
    }
    for (const page of data.query?.pages ?? []) {
      const content = page.revisions?.[0]?.slots.main.content
      if (content !== undefined) contents.set(page.title, content)
    }
    continuation = data.continue
  }

  const result = new Map<string, string>()
  for (const title of titles) {
    let resolved = title
    while (aliases.has(resolved)) resolved = aliases.get(resolved)!
    const content = contents.get(resolved)
    if (content !== undefined) result.set(title, content)
  }
  return result
}

export type FetchOptions = {
  fetchFn?: typeof fetch
  signal?: AbortSignal
  cache?: Map<string, string | null>
}

export async function fetchWikitexts(
  titles: string[],
  { fetchFn = fetch, signal, cache = new Map() }: FetchOptions = {},
): Promise<Map<string, string>> {
  const pending = [...new Set(titles)].filter((title) => !cache.has(title))
  // Sequential on purpose, to stay gentle with the Wikimedia servers.
  for (let i = 0; i < pending.length; i += MAX_TITLES_PER_QUERY) {
    const chunk = pending.slice(i, i + MAX_TITLES_PER_QUERY)
    const found = await queryChunk(chunk, fetchFn, signal)
    for (const title of chunk) cache.set(title, found.get(title) ?? null)
  }

  const result = new Map<string, string>()
  for (const title of titles) {
    const content = cache.get(title)
    if (content != null) result.set(title, content)
  }
  return result
}
