import { queryPages, type FetchOptions } from '@/lib/mediawiki'

export const COMMONS_API_URL = 'https://commons.wikimedia.org/w/api.php'

export async function fetchFileUrls(
  files: string[],
  options?: FetchOptions,
): Promise<Map<string, string>> {
  const urls = await queryPages(
    {
      apiUrl: COMMONS_API_URL,
      params: { prop: 'imageinfo', iiprop: 'url' },
      extract: (page) => page.imageinfo?.[0]?.url.split('?')[0],
    },
    files.map((file) => `File:${file}`),
    options,
  )
  return new Map([...urls].map(([title, url]) => [title.slice('File:'.length), url]))
}
