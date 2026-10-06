import { parsePronunciations, pickPronunciation } from '@/lib/pronunciations'

const WIKITEXT = `
* {{écouter|France (Paris)|ˈbõ.ʒuːʁ|audio=Fr-bonjour.ogg|lang=fr}}
* {{écouter|lang=fr|Canada (Shawinigan)|ˈbɔ̃.ʒuː|audio=LL-Q150 (fra)-DenisdeShawi-bonjour.wav}}
* {{écouter|lang=fr|France (Vosges)|ˈbõ.ʒuːʁ|audio=LL-Q150 (fra)-LoquaxFR-bonjour.wav}}
* {{écouter|lang=oc|France (Béarn)|bun.ˈdju|audio=LL-Q14185 (oci)-x-bonjour.wav}}
* {{écouter|lang=fr|France|ʃa}}
`

describe('parsePronunciations', () => {
  it('extracts location, IPA and audio file of French recordings only', () => {
    expect(parsePronunciations(WIKITEXT)).toEqual([
      { audio: 'Fr-bonjour.ogg', location: 'France (Paris)', ipa: 'ˈbõ.ʒuːʁ' },
      {
        audio: 'LL-Q150 (fra)-DenisdeShawi-bonjour.wav',
        location: 'Canada (Shawinigan)',
        ipa: 'ˈbɔ̃.ʒuː',
      },
      {
        audio: 'LL-Q150 (fra)-LoquaxFR-bonjour.wav',
        location: 'France (Vosges)',
        ipa: 'ˈbõ.ʒuːʁ',
      },
    ])
  })
})

describe('parsePronunciations with HTML comments', () => {
  it('ignores comments, including commented-out recordings', () => {
    const wikitext = `
* {{écouter|lang=fr|France <!-- précisez svp la ville -->||audio=aux.wav}}
<!-- * {{écouter|lang=fr|France (Vosges)||audio=old.wav}} -->`
    expect(parsePronunciations(wikitext)).toEqual([
      { audio: 'aux.wav', location: 'France', ipa: '' },
    ])
  })
})

describe('pickPronunciation', () => {
  it('prefers a Vosges or Quebec accent', () => {
    expect(pickPronunciation(parsePronunciations(WIKITEXT))?.location).toBe('Canada (Shawinigan)')
  })

  it('falls back to the first recording', () => {
    const [paris] = parsePronunciations(WIKITEXT)
    expect(pickPronunciation([paris!])).toBe(paris)
  })

  it('returns undefined when there is no recording', () => {
    expect(pickPronunciation([])).toBeUndefined()
  })
})
