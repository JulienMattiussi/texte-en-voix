const FRENCH_SECTION = /==\s*\{\{langue\|fr\}\}\s*==([\s\S]*?)(?=\n==\s*\{\{langue\||$)/
const FLEXION_DEFINITION = /^#\s*''[^'\n]*?\bde''\s*\[\[([^\]|#]+)/m
const SINGULAR_PARAM = /\{\{fr-[^{}]*\|s=([^|}]+)/
const PRON = /\{\{pron\|([^|}]+)\|(?:lang=)?fr\}\}/g

function frenchSection(wikitext: string): string {
  return FRENCH_SECTION.exec(wikitext)?.[1] ?? ''
}

export function flexionLemma(wikitext: string): string | undefined {
  const section = frenchSection(wikitext)
  const lemma = FLEXION_DEFINITION.exec(section)?.[1] ?? SINGULAR_PARAM.exec(section)?.[1]
  return lemma?.trim()
}

export function frenchIpas(wikitext: string): string[] {
  return [...frenchSection(wikitext).matchAll(PRON)].map(([, ipa = '']) => ipa.trim())
}

function normalizeIpa(ipa: string): string {
  return ipa.replace(/[.ˈˌ‿\s/[\]]/g, '')
}

export function sameIpa(a: string, b: string): boolean {
  const left = normalizeIpa(a)
  return left !== '' && left === normalizeIpa(b)
}
