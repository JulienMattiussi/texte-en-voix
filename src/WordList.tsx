import { WIKTIONARY_TARGET } from '@/lib/wiktionary'

type Credit = { author: string; license: string }

type WordItem = {
  word: string
  detail?: string
  credit?: Credit
  href?: string
  active: boolean
  current?: boolean
}

function linkTitle(word: string, credit?: Credit): string {
  const page = `« ${word} » sur le Wiktionnaire`
  if (!credit?.author) return page
  return `${page}. Voix : ${credit.author}${credit.license ? `, licence ${credit.license}` : ''}`
}

type WordListProps = { label: string; items: WordItem[]; minHeight?: number }

export function WordList({ label, items, minHeight }: WordListProps) {
  return (
    <ul
      aria-label={label}
      style={{ minHeight }}
      className="flex min-h-36 flex-wrap content-start gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4"
    >
      {items.map(({ word, detail, credit, href, active, current }, index) => {
        const chip = `flex max-w-full flex-col items-center rounded-2xl px-3 py-1 transition-colors duration-300 ${
          active
            ? 'bg-orange-600 text-white'
            : 'bg-orange-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100'
        }`
        const muted = `font-mono ${active ? 'text-orange-100' : 'text-stone-500 dark:text-stone-400'}`
        const content = (
          <>
            <span className="max-w-full text-lg [overflow-wrap:anywhere]">{word}</span>
            <span className={`${muted} text-[11px]`}>{detail ?? ' '}</span>
            {credit?.author && (
              <span
                className={`${muted} max-w-full text-[9px] opacity-75 [overflow-wrap:anywhere]`}
              >
                <span aria-hidden="true">🎙 </span>
                <span className="sr-only">voix : </span>
                {credit.author}
              </span>
            )}
          </>
        )
        return (
          <li
            key={`${index}-${word}`}
            className="max-w-full"
            aria-current={current ? 'true' : undefined}
          >
            {href ? (
              <a
                href={href}
                target={WIKTIONARY_TARGET}
                rel="noopener"
                title={linkTitle(word, credit)}
                className={`${chip} outline-none focus-visible:ring-4 focus-visible:ring-orange-300 ${
                  active ? '' : 'hover:bg-orange-100 dark:hover:bg-stone-700'
                }`}
              >
                {content}
              </a>
            ) : (
              <div className={chip}>{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
