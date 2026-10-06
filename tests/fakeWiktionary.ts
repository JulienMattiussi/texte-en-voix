import { vi } from 'vitest'

type FakePage = { title: string; content?: string }

export function listen(location: string, audio: string): string {
  return `* {{écouter|lang=fr|${location}||audio=${audio}}}`
}

export function apiResponse(pages: FakePage[], extra: Record<string, unknown> = {}): Response {
  const query = {
    ...extra,
    pages: pages.map(({ title, content }) =>
      content === undefined
        ? { title, missing: true }
        : { title, revisions: [{ slots: { main: { content } } }] },
    ),
  }
  return new Response(JSON.stringify({ query }), { status: 200 })
}

export function requestedTitles(url: string): string[] {
  return new URL(url).searchParams.get('titles')!.split('|')
}

export function fakeWiktionary(wikitexts: Record<string, string>) {
  return vi.fn<typeof fetch>(async (input) =>
    apiResponse(
      requestedTitles(String(input)).map((title) => ({ title, content: wikitexts[title] })),
    ),
  )
}
