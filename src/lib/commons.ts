import { queryPages, type FetchOptions } from '@/lib/mediawiki'

export const COMMONS_API_URL = 'https://commons.wikimedia.org/w/api.php'

export type FileInfo = { url: string; author: string; license: string }

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }

function plainText(html: string): string {
  return html
    .replace(/<\/li>/g, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39);/g, (_, name: string) => ENTITIES[name]!)
}

// Lingua Libre credits "Speaker: X / Recorder: Y": the speaker is the voice we play.
export function authorName(artistHtml: string): string {
  const text = plainText(artistHtml)
  const speaker = /Speaker:\s*(.+)/.exec(text)?.[1] ?? text
  return speaker.replace(/\s+/g, ' ').trim()
}

export async function fetchFileInfos(
  files: string[],
  options?: FetchOptions<FileInfo>,
): Promise<Map<string, FileInfo>> {
  const infos = await queryPages<FileInfo>(
    {
      apiUrl: COMMONS_API_URL,
      params: {
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        iiextmetadatafilter: 'Artist|LicenseShortName',
      },
      extract: (page) => {
        const info = page.imageinfo?.[0]
        if (!info) return undefined
        return {
          url: info.url.split('?')[0]!,
          author: authorName(info.extmetadata?.Artist?.value ?? ''),
          license: info.extmetadata?.LicenseShortName?.value ?? '',
        }
      },
    },
    files.map((file) => `File:${file}`),
    options,
  )
  return new Map([...infos].map(([title, info]) => [title.slice('File:'.length), info]))
}
