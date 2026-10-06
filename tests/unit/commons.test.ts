import { fetchFileUrls } from '@/lib/commons'
import { apiResponse, fakeWiktionary, fileUrl, requestedTitles } from '../fakeWiktionary'

describe('fetchFileUrls', () => {
  it('asks Commons for the file pages and returns clean upload URLs', async () => {
    const fetchFn = fakeWiktionary({}, { missingFiles: ['nope.wav'] })
    const result = await fetchFileUrls(['LL-Q150 (fra)-X-chat.wav', 'nope.wav'], { fetchFn })

    const url = String(fetchFn.mock.calls[0]![0])
    expect(url).toMatch(/^https:\/\/commons\.wikimedia\.org\/w\/api\.php\?/)
    expect(new URL(url).searchParams.get('prop')).toBe('imageinfo')
    expect(requestedTitles(url)).toEqual(['File:LL-Q150 (fra)-X-chat.wav', 'File:nope.wav'])
    expect(Object.fromEntries(result)).toEqual({
      'LL-Q150 (fra)-X-chat.wav': fileUrl('LL-Q150 (fra)-X-chat.wav'),
    })
  })

  it('follows the title normalization of Commons', async () => {
    const fetchFn = vi.fn(async () =>
      apiResponse([{ title: 'File:Fr-chat.ogg', url: fileUrl('Fr-chat.ogg') }], {
        normalized: [{ from: 'File:fr-chat.ogg', to: 'File:Fr-chat.ogg' }],
      }),
    )
    const result = await fetchFileUrls(['fr-chat.ogg'], { fetchFn })
    expect(result.get('fr-chat.ogg')).toBe(fileUrl('Fr-chat.ogg'))
  })
})
