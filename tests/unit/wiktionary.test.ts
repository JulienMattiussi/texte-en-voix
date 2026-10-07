import { API_USER_AGENT, buildQueryUrl } from '@/lib/mediawiki'
import { fetchWikitexts, WIKTIONARY_API_URL, wiktionaryPageUrl } from '@/lib/wiktionary'
import { apiResponse, fakeWikimedia, requestedTitles } from '../fakeWikimedia'

describe('buildQueryUrl', () => {
  it('asks for all titles with anonymous CORS and redirects', () => {
    const url = new URL(
      buildQueryUrl(WIKTIONARY_API_URL, { prop: 'revisions' }, ['chat', 'aujourd’hui']),
    )
    expect(url.origin + url.pathname).toBe('https://fr.wiktionary.org/w/api.php')
    expect(url.searchParams.get('prop')).toBe('revisions')
    expect(url.searchParams.get('titles')).toBe('chat|aujourd’hui')
    expect(url.searchParams.get('origin')).toBe('*')
    expect(url.searchParams.get('redirects')).toBe('1')
  })

  it('appends continuation parameters', () => {
    const url = new URL(buildQueryUrl(WIKTIONARY_API_URL, {}, ['chat'], { rvcontinue: '42' }))
    expect(url.searchParams.get('rvcontinue')).toBe('42')
  })
})

describe('wiktionaryPageUrl', () => {
  it('links to the page of a title, spaces as underscores', () => {
    expect(wiktionaryPageUrl('aujourd’hui')).toBe(
      'https://fr.wiktionary.org/wiki/aujourd%E2%80%99hui',
    )
    expect(wiktionaryPageUrl('pomme de terre')).toBe(
      'https://fr.wiktionary.org/wiki/pomme_de_terre',
    )
  })
})

describe('fetchWikitexts', () => {
  it('maps each requested title to its wikitext and omits missing pages', async () => {
    const fetchFn = fakeWikimedia({ chat: 'miaou' })
    const result = await fetchWikitexts(['chat', 'zzzqx'], { fetchFn })
    expect([...result]).toEqual([['chat', 'miaou']])
  })

  it('follows normalizations and redirects back to the requested title', async () => {
    const fetchFn = vi.fn(async () =>
      apiResponse([{ title: 'aujourd’hui', content: 'texte' }], {
        normalized: [{ from: 'aujourd_hui', to: "aujourd'hui" }],
        redirects: [{ from: "aujourd'hui", to: 'aujourd’hui' }],
      }),
    )
    const result = await fetchWikitexts(['aujourd_hui'], { fetchFn })
    expect(result.get('aujourd_hui')).toBe('texte')
  })

  it('splits more than 50 titles into several queries', async () => {
    const titles = Array.from({ length: 120 }, (_, i) => `mot${i}`)
    const fetchFn = fakeWikimedia(Object.fromEntries(titles.map((t) => [t, t])))
    const result = await fetchWikitexts(titles, { fetchFn })
    expect(fetchFn.mock.calls.map(([url]) => requestedTitles(String(url)).length)).toEqual([
      50, 50, 20,
    ])
    expect(result.size).toBe(120)
  })

  it('follows continuation until the response is complete', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            continue: { rvcontinue: '7', continue: '||' },
            query: {
              pages: [{ title: 'chat', revisions: [{ slots: { main: { content: 'a' } } }] }],
            },
          }),
        ),
      )
      .mockResolvedValueOnce(apiResponse([{ title: 'être', content: 'b' }]))
    const result = await fetchWikitexts(['chat', 'être'], { fetchFn })
    expect(new URL(fetchFn.mock.calls[1]![0]).searchParams.get('rvcontinue')).toBe('7')
    expect(Object.fromEntries(result)).toEqual({ chat: 'a', être: 'b' })
  })

  it('never asks twice for a cached title, found or missing', async () => {
    const cache = new Map<string, string | null>()
    await fetchWikitexts(['chat', 'zzzqx'], { fetchFn: fakeWikimedia({ chat: 'miaou' }), cache })

    const fetchFn = fakeWikimedia({ chien: 'ouaf' })
    const result = await fetchWikitexts(['chat', 'zzzqx', 'chien'], { fetchFn, cache })
    expect(fetchFn).toHaveBeenCalledOnce()
    expect(requestedTitles(String(fetchFn.mock.calls[0]![0]))).toEqual(['chien'])
    expect(Object.fromEntries(result)).toEqual({ chat: 'miaou', chien: 'ouaf' })
  })

  it('passes the abort signal and identifies itself to Wikimedia', async () => {
    const fetchFn = fakeWikimedia({})
    const { signal } = new AbortController()
    await fetchWikitexts(['chat'], { fetchFn, signal })
    expect(fetchFn.mock.calls[0]![1]).toEqual({
      signal,
      headers: { 'Api-User-Agent': API_USER_AGENT },
    })
    expect(API_USER_AGENT).toMatch(/^TexteEnVoix\/\S+ \(https:\/\/texte-en-voix\.yavadeus\.dev\//)
  })

  it('throws on an HTTP error', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 503 }))
    await expect(fetchWikitexts(['chat'], { fetchFn })).rejects.toThrow('503')
  })
})
