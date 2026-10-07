const MAX_TITLES_PER_QUERY = 50

type TitleMapping = { from: string; to: string }

type MediaWikiPage = {
  title: string
  revisions?: { slots: { main: { content: string } } }[]
  imageinfo?: {
    url: string
    extmetadata?: Partial<Record<'Artist' | 'LicenseShortName', { value: string }>>
  }[]
}

type QueryResponse = {
  query?: { pages?: MediaWikiPage[]; normalized?: TitleMapping[]; redirects?: TitleMapping[] }
  continue?: Record<string, string>
}

export type FetchOptions<T = string> = {
  fetchFn?: typeof fetch
  signal?: AbortSignal
  cache?: Map<string, T | null>
}

type PageQuery<T> = {
  apiUrl: string
  params: Record<string, string>
  extract: (page: MediaWikiPage) => T | undefined
}

export function buildQueryUrl(
  apiUrl: string,
  params: Record<string, string>,
  titles: string[],
  continuation: Record<string, string> = {},
): string {
  const search = new URLSearchParams({
    action: 'query',
    redirects: '1',
    format: 'json',
    formatversion: '2',
    origin: '*',
    ...params,
    titles: titles.join('|'),
    ...continuation,
  })
  return `${apiUrl}?${search}`
}

async function queryChunk<T>(
  { apiUrl, params, extract }: PageQuery<T>,
  titles: string[],
  fetchFn: typeof fetch,
  signal?: AbortSignal,
): Promise<Map<string, T>> {
  const values = new Map<string, T>()
  const aliases = new Map<string, string>()
  let continuation: Record<string, string> | undefined = {}

  // Big pages can overflow the API response size limit; the rest then comes through `continue`.
  while (continuation) {
    const response = await fetchFn(buildQueryUrl(apiUrl, params, titles, continuation), { signal })
    if (!response.ok) throw new Error(`MediaWiki API error: ${response.status}`)
    const data = (await response.json()) as QueryResponse
    for (const { from, to } of [
      ...(data.query?.normalized ?? []),
      ...(data.query?.redirects ?? []),
    ]) {
      aliases.set(from, to)
    }
    for (const page of data.query?.pages ?? []) {
      const value = extract(page)
      if (value !== undefined) values.set(page.title, value)
    }
    continuation = data.continue
  }

  const result = new Map<string, T>()
  for (const title of titles) {
    let resolved = title
    while (aliases.has(resolved)) resolved = aliases.get(resolved)!
    const value = values.get(resolved)
    if (value !== undefined) result.set(title, value)
  }
  return result
}

export async function queryPages<T>(
  query: PageQuery<T>,
  titles: string[],
  { fetchFn = fetch, signal, cache = new Map() }: FetchOptions<T> = {},
): Promise<Map<string, T>> {
  const pending = [...new Set(titles)].filter((title) => !cache.has(title))
  // Sequential on purpose, to stay gentle with the Wikimedia servers.
  for (let i = 0; i < pending.length; i += MAX_TITLES_PER_QUERY) {
    const chunk = pending.slice(i, i + MAX_TITLES_PER_QUERY)
    const found = await queryChunk(query, chunk, fetchFn, signal)
    for (const title of chunk) cache.set(title, found.get(title) ?? null)
  }

  const result = new Map<string, T>()
  for (const title of titles) {
    const value = cache.get(title)
    if (value != null) result.set(title, value)
  }
  return result
}
