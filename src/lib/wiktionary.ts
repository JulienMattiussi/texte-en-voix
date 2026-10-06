import { queryPages, type FetchOptions } from '@/lib/mediawiki'

export const WIKTIONARY_URL = 'https://fr.wiktionary.org/'
export const WIKTIONARY_TARGET = 'wiktionnaire'
export const WIKTIONARY_API_URL = `${WIKTIONARY_URL}w/api.php`

export function wiktionaryPageUrl(title: string): string {
  return `${WIKTIONARY_URL}wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`
}

export function fetchWikitexts(
  titles: string[],
  options?: FetchOptions,
): Promise<Map<string, string>> {
  return queryPages(
    {
      apiUrl: WIKTIONARY_API_URL,
      params: { prop: 'revisions', rvprop: 'content', rvslots: 'main' },
      extract: (page) => page.revisions?.[0]?.slots.main.content,
    },
    titles,
    options,
  )
}
