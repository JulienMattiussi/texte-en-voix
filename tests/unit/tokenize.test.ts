import { tokenize } from '@/lib/tokenize'

describe('tokenize', () => {
  it('splits a sentence into words, dropping punctuation and keeping case', () => {
    expect(tokenize('Bonjour, le Chat !')).toEqual(['Bonjour', 'le', 'Chat'])
  })

  it('keeps apostrophes and hyphens inside words, as Wiktionary titles do', () => {
    expect(tokenize("Aujourd'hui, c'est peut-être")).toEqual(['Aujourd’hui', 'c’est', 'peut-être'])
  })

  it('returns an empty list for blank text', () => {
    expect(tokenize('  ... ')).toEqual([])
  })
})
