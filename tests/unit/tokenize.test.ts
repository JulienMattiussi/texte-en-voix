import { tokenize } from '@/lib/tokenize'

describe('tokenize', () => {
  it('splits a sentence into lowercase words, dropping punctuation', () => {
    expect(tokenize('Bonjour, le Chat !')).toEqual(['bonjour', 'le', 'chat'])
  })

  it('keeps apostrophes and hyphens inside words, as Wiktionary titles do', () => {
    expect(tokenize("Aujourd'hui, c'est peut-être")).toEqual(['aujourd’hui', 'c’est', 'peut-être'])
  })

  it('returns an empty list for blank text', () => {
    expect(tokenize('  ... ')).toEqual([])
  })
})
