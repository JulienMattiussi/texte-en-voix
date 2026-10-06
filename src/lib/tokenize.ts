const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu

export function tokenize(text: string): string[] {
  return (text.match(WORD) ?? []).map((word) => word.replace(/'/g, '’'))
}
