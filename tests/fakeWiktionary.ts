import { vi } from 'vitest'
import { COMMONS_API_URL } from '@/lib/commons'

type FakePage = { title: string; content?: string; url?: string }

export function listen(location: string, audio: string): string {
  return `* {{écouter|lang=fr|${location}||audio=${audio}}}`
}

export const fileUrl = (file: string) => `https://upload.wikimedia.org/fake/${file}`

export function apiResponse(pages: FakePage[], extra: Record<string, unknown> = {}): Response {
  const query = {
    ...extra,
    pages: pages.map(({ title, content, url }) =>
      content !== undefined
        ? { title, revisions: [{ slots: { main: { content } } }] }
        : url !== undefined
          ? { title, imageinfo: [{ url: `${url}?utm_source=commons.wikimedia.org` }] }
          : { title, missing: true },
    ),
  }
  return new Response(JSON.stringify({ query }), { status: 200 })
}

export function requestedTitles(url: string): string[] {
  return new URL(url).searchParams.get('titles')!.split('|')
}

export function fakeWiktionary(
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
