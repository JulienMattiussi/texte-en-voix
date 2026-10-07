import { useEffect, useRef, useState, type FormEvent } from 'react'
import { EXAMPLES } from '@/lib/examples'
import { MAX_WORDS, revealedCount } from '@/lib/pacing'
import { pickRandom } from '@/lib/random'
import { textFromHash } from '@/lib/share'
import { tokenize } from '@/lib/tokenize'
import { WIKTIONARY_TARGET, WIKTIONARY_URL, wiktionaryPageUrl } from '@/lib/wiktionary'
import { useSynthesis } from '@/useSynthesis'
import { CrossIcon, PencilIcon, PlayIcon, ReplayIcon, StopIcon } from '@/icons'
import { MissingWords } from '@/MissingWords'
import { ProgressBar } from '@/ProgressBar'
import { ShareButton } from '@/ShareButton'
import { Title } from '@/Title'
import { WiktionaryLogo } from '@/WiktionaryLogo'
import { WordList } from '@/WordList'

const COMMONS_URL = 'https://commons.wikimedia.org/'
const AUTHOR_URL = 'https://yavadeus.vercel.app/'

const BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-lg font-bold transition focus-visible:ring-4 focus-visible:ring-orange-300 focus-visible:outline-none disabled:opacity-50'
const PRIMARY = `${BUTTON} bg-orange-600 text-white shadow-lg hover:bg-orange-700`
const DARK = `${BUTTON} bg-stone-700 dark:bg-stone-600 text-white shadow-lg hover:bg-stone-800 dark:hover:bg-stone-500`
const SECONDARY = `${BUTTON} border-2 border-orange-600 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-stone-800`

export default function App() {
  const [text, setText] = useState(() => textFromHash(location.hash) ?? pickRandom(EXAMPLES))
  const [boxHeight, setBoxHeight] = useState<number>()
  const textarea = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (location.hash) history.replaceState(null, '', `${location.pathname}${location.search}`)
  }, [])
  const { state, start, cancel, reset, stop, replay } = useSynthesis()
  const words = tokenize(text)
  const tooLong = words.length > MAX_WORDS
  const busy = state.status === 'preparing' || state.status === 'cancelling'

  const changeText = (value: string) => {
    setText(value)
    reset()
  }

  const read = (event: FormEvent) => {
    event.preventDefault()
    if (tooLong || words.length === 0) return
    setBoxHeight(textarea.current?.offsetHeight)
    void start(words)
  }

  return (
    <div className="min-h-screen text-stone-800 dark:text-stone-100">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 sm:py-20">
        <header className="flex flex-col gap-3 text-center">
          <Title speaking={state.status === 'ready' && state.playing !== null} />
          <div className="flex flex-col items-center gap-2">
            <p className="text-lg text-stone-600 dark:text-stone-300">
              La synthèse vocale sans IA ni synthétiseur : chaque mot est lu par un véritable être
              humain.
            </p>
            <p className="flex items-center justify-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
              Source :
              <a
                href={WIKTIONARY_URL}
                target={WIKTIONARY_TARGET}
                rel="noopener"
                className="inline-flex items-center gap-1 font-medium text-stone-700 dark:text-stone-200 underline-offset-2 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-orange-300"
              >
                <WiktionaryLogo className="size-4" />
                Wiktionnaire
              </a>
            </p>
          </div>
        </header>

        <form
          onSubmit={read}
          className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white/85 p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/85"
        >
          {busy ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <p className="min-h-10 font-mono text-sm text-orange-800 sm:min-h-0 dark:text-orange-300">
                  <span aria-hidden="true">&gt; </span>
                  {state.message}
                </p>
                <ProgressBar
                  label={state.status === 'preparing' ? 'Préparation de la voix' : 'Annulation'}
                  progress={state.progress}
                />
              </div>
              <WordList
                label="Mots en préparation"
                minHeight={boxHeight}
                items={words.map((word, index) => ({
                  word,
                  active: index < revealedCount(state.progress, words.length),
                }))}
              />
              {state.status === 'preparing' ? (
                <button
                  type="button"
                  onClick={() => void cancel()}
                  className={`${DARK} self-center`}
                >
                  <CrossIcon />
                  Annuler
                </button>
              ) : (
                <button type="button" disabled className={`${DARK} self-center`}>
                  <CrossIcon />
                  Annulation en cours…
                </button>
              )}
            </>
          ) : state.status === 'ready' ? (
            <>
              <p className="font-semibold">Votre texte</p>
              <WordList
                label="Voix trouvées"
                minHeight={boxHeight}
                items={state.voices.map(
                  ({ word, title, location, lemma, author, license }, index) => ({
                    word,
                    detail: [location || 'lieu inconnu', lemma && `via ${lemma}`]
                      .filter(Boolean)
                      .join(', '),
                    credit: { author, license },
                    href: wiktionaryPageUrl(title),
                    active: index === state.playing,
                    current: index === state.playing,
                  }),
                )}
              />
              <div className="flex flex-wrap items-center justify-center gap-3">
                {state.playing === null ? (
                  <button type="button" onClick={replay} className={PRIMARY}>
                    <ReplayIcon />
                    Réécouter
                  </button>
                ) : (
                  <button type="button" onClick={stop} className={DARK}>
                    <StopIcon />
                    Arrêter
                  </button>
                )}
                <ShareButton text={text} />
                <button type="button" onClick={reset} className={SECONDARY}>
                  <PencilIcon />
                  Modifier le texte
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <label htmlFor="text" className="font-semibold">
                  Votre texte
                </label>
                <span
                  className={`font-mono text-sm ${tooLong ? 'font-bold text-red-700 dark:text-red-400' : 'text-stone-500 dark:text-stone-400'}`}
                >
                  {words.length} / {MAX_WORDS} mots
                </span>
              </div>
              <textarea
                ref={textarea}
                id="text"
                value={text}
                onChange={(event) => changeText(event.target.value)}
                aria-describedby={tooLong ? 'too-long' : undefined}
                rows={4}
                className="min-h-36 resize-y rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-lg outline-none focus-visible:ring-4 focus-visible:ring-orange-300 disabled:bg-stone-50 dark:disabled:bg-stone-900 disabled:text-stone-500 dark:disabled:text-stone-400"
              />
              {tooLong && (
                <p id="too-long" className="text-sm text-red-700 dark:text-red-400">
                  {MAX_WORDS} mots maximum : raccourcissez un peu votre texte.
                </p>
              )}
              <button
                type="submit"
                disabled={tooLong || words.length === 0}
                className={`${PRIMARY} self-center`}
              >
                <PlayIcon />
                Lire
              </button>
            </>
          )}
        </form>

        {state.status === 'impossible' && <MissingWords words={state.missing} />}

        {state.status === 'error' && (
          <p
            role="alert"
            className="rounded-3xl bg-red-50 dark:bg-red-950/60 p-6 text-center text-red-900 dark:text-red-200"
          >
            Le Wiktionnaire ne répond pas. Réessayez dans un instant.
          </p>
        )}
      </main>
      <footer className="flex flex-col gap-1 px-4 pb-8 text-center text-sm text-stone-500 dark:text-stone-400">
        <p className="text-xs">
          Voix :{' '}
          <a
            href={COMMONS_URL}
            target="commons"
            rel="noopener"
            className="underline underline-offset-2 outline-none hover:text-stone-700 focus-visible:ring-4 focus-visible:ring-orange-300 dark:hover:text-stone-200"
          >
            Wikimedia Commons
          </a>
          , licences libres
        </p>
        <p>
          Fait avec <span aria-label="amour">❤️</span> par{' '}
          <a
            href={AUTHOR_URL}
            className="font-semibold text-stone-700 underline-offset-2 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-orange-300 dark:text-stone-200"
          >
            YavaDeus
          </a>
        </p>
      </footer>
    </div>
  )
}
