import { WIKTIONARY_TARGET } from '@/lib/wiktionary'

type WordItem = { word: string; detail?: string; href?: string; active: boolean }

type WordListProps = { label: string; items: WordItem[]; minHeight?: number }

export function WordList({ label, items, minHeight }: WordListProps) {
  return (
    <ul
      aria-label={label}
      style={{ minHeight }}
      className="flex min-h-36 flex-wrap content-start gap-2 rounded-2xl border border-stone-200 bg-white p-4"
    >
      {items.map(({ word, detail, href, active }, index) => {
        const chip = `flex flex-col items-center rounded-2xl px-3 py-1 transition-colors duration-300 ${
          active ? 'bg-orange-600 text-white' : 'bg-orange-50 text-stone-800'
        }`
        const content = (
          <>
            <span className="text-lg">{word}</span>
            <span className={`text-xs ${active ? 'text-orange-100' : 'text-stone-500'}`}>
              {detail ?? ' '}
            </span>
          </>
        )
        return (
          <li key={`${index}-${word}`} aria-current={active ? 'true' : undefined}>
            {href ? (
              <a
                href={href}
                target={WIKTIONARY_TARGET}
                rel="noopener"
                title={`« ${word} » sur le Wiktionnaire`}
                className={`${chip} outline-none focus-visible:ring-4 focus-visible:ring-orange-300 ${
                  active ? '' : 'hover:bg-orange-100'
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
