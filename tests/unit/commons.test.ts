import { authorName, fetchFileInfos } from '@/lib/commons'
import {
  FAKE_AUTHOR,
  FAKE_LICENSE,
  fakeWikimedia,
  fileUrl,
  requestedTitles,
} from '../fakeWikimedia'

describe('authorName', () => {
  it('keeps the speaker of a Lingua Libre recording', () => {
    expect(
      authorName(
        '<ul><li>Speaker: <a href="//lingualibre.org/wiki/Q215420">LoquaxFR</a></li>\n<li>Recorder: <a>Someone</a></li></ul>',
      ),
    ).toBe('LoquaxFR')
  })

  it('reads a plain or linked author, decoding entities', () => {
    expect(authorName('Vion Nicolas')).toBe('Vion Nicolas')
    expect(authorName('<a href="//commons.wikimedia.org/wiki/User:X">Tom &amp; Jerry</a>')).toBe(
      'Tom & Jerry',
    )
    expect(authorName('')).toBe('')
  })
})

describe('fetchFileInfos', () => {
  it('asks Commons for URL, author and licence of each file in one query', async () => {
    const fetchFn = fakeWikimedia({}, { missingFiles: ['nope.wav'] })
    const result = await fetchFileInfos(['LL-Q150 (fra)-X-chat.wav', 'nope.wav'], { fetchFn })

    const url = new URL(String(fetchFn.mock.calls[0]![0]))
    expect(url.origin + url.pathname).toBe('https://commons.wikimedia.org/w/api.php')
    expect(url.searchParams.get('iiprop')).toBe('url|extmetadata')
    expect(url.searchParams.get('iiextmetadatafilter')).toBe('Artist|LicenseShortName')
    expect(requestedTitles(String(url))).toEqual(['File:LL-Q150 (fra)-X-chat.wav', 'File:nope.wav'])
    expect(Object.fromEntries(result)).toEqual({
      'LL-Q150 (fra)-X-chat.wav': {
        url: fileUrl('LL-Q150 (fra)-X-chat.wav'),
        author: FAKE_AUTHOR,
        license: FAKE_LICENSE,
      },
    })
  })

  it('follows the title normalization of Commons and tolerates missing metadata', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            query: {
              normalized: [{ from: 'File:fr-chat.ogg', to: 'File:Fr-chat.ogg' }],
              pages: [{ title: 'File:Fr-chat.ogg', imageinfo: [{ url: fileUrl('Fr-chat.ogg') }] }],
            },
          }),
        ),
    )
    const result = await fetchFileInfos(['fr-chat.ogg'], { fetchFn })
    expect(result.get('fr-chat.ogg')).toEqual({
      url: fileUrl('Fr-chat.ogg'),
      author: '',
      license: '',
    })
  })
})
