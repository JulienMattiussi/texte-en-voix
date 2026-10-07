import { WIKTIONARY_TARGET } from '@/lib/wiktionary'

type WordItem = { word: string; detail?: string; href?: string; active: boolean }

type WordListProps = { label: string; items: WordItem[]; minHeight?: number }

export function WordList({ label, items, minHeight }: WordListProps) {
  return (
    <ul
      aria-label={label}
      style={{ minHeight }}
      className="flex min-h-36 flex-wrap content-start gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4"
    >
      {items.map(({ word, detail, href, active }, index) => {
        const chip = `flex max-w-full flex-col items-center rounded-2xl px-3 py-1 transition-colors duration-300 ${
          active
            ? 'bg-orange-600 text-white'
            : 'bg-orange-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100'
        }`
        const content = (
          <>
            <span className="max-w-full text-lg [overflow-wrap:anywhere]">{word}</span>
            <span
              className={`font-mono text-[11px] ${active ? 'text-orange-100' : 'text-stone-500 dark:text-stone-400'}`}
            >
              {detail ?? ' '}
            </span>
          </>
        )
        return (
          <li
            key={`${index}-${word}`}
            className="max-w-full"
            aria-current={active ? 'true' : undefined}
          >
            {href ? (
              <a
                href={href}
                target={WIKTIONARY_TARGET}
                rel="noopener"
                title={`« ${word} » sur le Wiktionnaire`}
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
