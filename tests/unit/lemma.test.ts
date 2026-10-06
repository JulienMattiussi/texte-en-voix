import { flexionLemma, frenchIpas, sameIpa } from '@/lib/lemma'

const MIRABELLES = `== {{langue|fr}} ==
=== {{S|nom|fr|flexion}} ===
{{fr-rég|mi.ʁa.bɛl|s=mirabelle}}
'''mirabelles''' {{pron|mi.ʁa.bɛl|fr}} {{f}}
# ''Pluriel de'' [[mirabelle]].

== {{langue|en}} ==
'''mirabelles''' {{pron|ˈmɪɹəbɛlz|en}}
# ''Plural of'' [[mirabelle#en|mirabelle]].`

describe('flexionLemma', () => {
  it('reads the base word of a French flexion page', () => {
    expect(flexionLemma(MIRABELLES)).toBe('mirabelle')
  })

  it('reads conjugated and feminine forms too', () => {
    expect(
      flexionLemma(
        `== {{langue|fr}} ==\n# ''Première personne du pluriel du présent de'' [[manger]].`,
      ),
    ).toBe('manger')
    expect(flexionLemma(`== {{langue|fr}} ==\n# ''Féminin pluriel de'' [[petit#fr|petit]].`)).toBe(
      'petit',
    )
  })

  it('falls back on the singular parameter of the inflection table', () => {
    expect(flexionLemma(`== {{langue|fr}} ==\n{{fr-rég|bʁɛ̃.bɛl|s=brimbelle}}`)).toBe('brimbelle')
  })

  it('ignores other languages and non-flexion pages', () => {
    expect(flexionLemma(`== {{langue|en}} ==\n# ''Plural of'' [[cat]].`)).toBeUndefined()
    expect(flexionLemma(`== {{langue|fr}} ==\n# [[Animal]] domestique.`)).toBeUndefined()
  })
})

describe('frenchIpas', () => {
  it('lists the French pronunciations only', () => {
    expect(frenchIpas(MIRABELLES)).toEqual(['mi.ʁa.bɛl'])
    expect(frenchIpas(`== {{langue|fr}} ==\n{{pron|ʃa|lang=fr}}`)).toEqual(['ʃa'])
  })
})

describe('sameIpa', () => {
  it('ignores syllable dots, stress marks and liaison ties', () => {
    expect(sameIpa('mi.ʁa.bɛl', 'miʁabɛl')).toBe(true)
    expect(sameIpa('ˈbõ.ʒuːʁ', 'bõʒuːʁ')).toBe(true)
  })

  it('tells different sounds apart and never matches an empty IPA', () => {
    expect(sameIpa('mɑ̃.ʒɔ̃', 'mɑ̃.ʒe')).toBe(false)
    expect(sameIpa('', '')).toBe(false)
  })
})
