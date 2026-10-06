import { queryPages, type FetchOptions } from '@/lib/mediawiki'

export const WIKTIONARY_API_URL = 'https://fr.wiktionary.org/w/api.php'

export function wiktionaryPageUrl(title: string): string {
  return `https://fr.wiktionary.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`
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
