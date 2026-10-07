import { shareUrl, textFromHash } from '@/lib/share'

describe('shareUrl', () => {
  it('puts the text after a #, so the server never sees it', () => {
    expect(shareUrl('https://texte-en-voix.yavadeus.dev/', 'Le canard est un brigand')).toBe(
      'https://texte-en-voix.yavadeus.dev/#texte=Le+canard+est+un+brigand',
    )
  })

  it('round-trips accents, apostrophes and punctuation', () => {
    const text = 'Aujourd’hui, l’été : « déjà » ! & 100 % ?'
    expect(textFromHash(new URL(shareUrl('https://x.dev/', text)).hash)).toBe(text)
  })
})

describe('textFromHash', () => {
  it('reads the shared text, with or without the leading #', () => {
    expect(textFromHash('#texte=Salut%20la%20compagnie')).toBe('Salut la compagnie')
    expect(textFromHash('texte=Salut')).toBe('Salut')
  })

  it('ignores an empty, blank or unrelated hash', () => {
    expect(textFromHash('')).toBeUndefined()
    expect(textFromHash('#texte=%20%20')).toBeUndefined()
    expect(textFromHash('#autre=chose')).toBeUndefined()
  })
})
