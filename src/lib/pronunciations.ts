export type Pronunciation = {
  audio: string
  location: string
  ipa: string
}

const HTML_COMMENT = /<!--[\s\S]*?-->/g
const LISTEN_TEMPLATE = /\{\{écouter\|([^{}]*)\}\}/g
const PREFERRED_PLACES_BY_ACCENT = {
  vosgien: ['vosges'],
  québécois: ['québec', 'quebec', 'canada', 'montréal', 'shawinigan'],
  suisse: ['suisse', 'genève', 'lausanne', 'valais', 'vaud', 'neuchâtel', 'fribourg'],
  sudOuest: [
    'sud-ouest',
    'toulouse',
    'bordeaux',
    'gironde',
    'landes',
    'béarn',
    'pau',
    'bayonne',
    'biarritz',
    'pays basque',
    'gers',
    'agen',
    'tarbes',
    'périgord',
    'dordogne',
    'montauban',
    'albi',
    'aveyron',
    'millau',
  ],
}
// Lookarounds instead of \b, which ignores accented letters: "Gers" must not match "Angers".
const PREFERRED_ACCENTS = new RegExp(
  `(?<![\\p{L}])(?:${Object.values(PREFERRED_PLACES_BY_ACCENT).flat().join('|')})(?![\\p{L}])`,
  'iu',
)

export function parsePronunciations(wikitext: string, lang = 'fr'): Pronunciation[] {
  const result: Pronunciation[] = []
  for (const [, body = ''] of wikitext.replace(HTML_COMMENT, '').matchAll(LISTEN_TEMPLATE)) {
    const positional: string[] = []
    const named: Record<string, string> = {}
    for (const part of body.split('|')) {
      const eq = part.indexOf('=')
      if (eq === -1) positional.push(part.trim())
      else named[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
    }
    if (named.lang !== lang || !named.audio) continue
    result.push({ audio: named.audio, location: positional[0] ?? '', ipa: positional[1] ?? '' })
  }
  return result
}

function isPreferredAccent(pronunciation: Pronunciation): boolean {
  return PREFERRED_ACCENTS.test(pronunciation.location)
}

export function pickPronunciation(pronunciations: Pronunciation[]): Pronunciation | undefined {
  return pronunciations.find(isPreferredAccent) ?? pronunciations[0]
}
