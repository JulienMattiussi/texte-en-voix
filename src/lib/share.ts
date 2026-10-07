const TEXT_KEY = 'texte'

export function shareUrl(pageUrl: string, text: string): string {
  return `${pageUrl}#${new URLSearchParams({ [TEXT_KEY]: text })}`
}

export function textFromHash(hash: string): string | undefined {
  const text = new URLSearchParams(hash.replace(/^#/, '')).get(TEXT_KEY)?.trim()
  return text || undefined
}
