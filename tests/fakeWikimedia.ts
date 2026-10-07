import { vi } from 'vitest'
import { COMMONS_API_URL } from '@/lib/commons'

type FakePage = { title: string; content?: string; url?: string }

export function listen(location: string, audio: string): string {
  return `* {{écouter|lang=fr|${location}||audio=${audio}}}`
}

export const fileUrl = (file: string) => `https://upload.wikimedia.org/fake/${file}`

export const FAKE_AUTHOR = 'LoquaxFR'
export const FAKE_LICENSE = 'CC BY-SA 4.0'
const FAKE_ARTIST = `<ul><li>Speaker: <a href="//lingualibre.org/wiki/Q1">${FAKE_AUTHOR}</a></li>\n<li>Recorder: <a>Someone</a></li></ul>`

export function apiResponse(pages: FakePage[], extra: Record<string, unknown> = {}): Response {
  const query = {
    ...extra,
    pages: pages.map(({ title, content, url }) =>
      content !== undefined
        ? { title, revisions: [{ slots: { main: { content } } }] }
        : url !== undefined
          ? {
              title,
              imageinfo: [
                {
                  url: `${url}?utm_source=commons.wikimedia.org`,
                  extmetadata: {
                    Artist: { value: FAKE_ARTIST },
                    LicenseShortName: { value: FAKE_LICENSE },
                  },
                },
              ],
            }
          : { title, missing: true },
    ),
  }
  return new Response(JSON.stringify({ query }), { status: 200 })
}

export function requestedTitles(url: string): string[] {
  return new URL(url).searchParams.get('titles')!.split('|')
}

export function fakeWikimedia(
  wikitexts: Record<string, string>,
  { missingFiles = [] }: { missingFiles?: string[] } = {},
) {
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input)
    if (url.startsWith(COMMONS_API_URL)) {
      return apiResponse(
        requestedTitles(url).map((title) => {
          const file = title.slice('File:'.length)
          return { title, url: missingFiles.includes(file) ? undefined : fileUrl(file) }
        }),
      )
    }
    if (url.startsWith(fileUrl(''))) {
      return new Response(url.slice(fileUrl('').length), { status: 200 })
    }
    return apiResponse(requestedTitles(url).map((title) => ({ title, content: wikitexts[title] })))
  })
}

export const decodeText = async (data: ArrayBuffer) => new TextDecoder().decode(data)
