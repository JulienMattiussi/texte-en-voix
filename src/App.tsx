import { useRef, useState, type FormEvent } from 'react'
import { MAX_WORDS, revealedCount } from '@/lib/pacing'
import { tokenize } from '@/lib/tokenize'
import { WIKTIONARY_TARGET, WIKTIONARY_URL, wiktionaryPageUrl } from '@/lib/wiktionary'
import { useSynthesis } from '@/useSynthesis'
import { MissingWords } from '@/MissingWords'
import { ProgressBar } from '@/ProgressBar'
import { Title } from '@/Title'
import { WiktionaryLogo } from '@/WiktionaryLogo'
import { WordList } from '@/WordList'

const EXAMPLE = 'Bonjour, aujourd’hui le canard mange une tarte aux brimbelles. C’est un brigand.'

const BUTTON =
  'rounded-full px-8 py-3 text-lg font-bold transition focus-visible:ring-4 focus-visible:ring-orange-300 focus-visible:outline-none disabled:opacity-50'
const PRIMARY = `${BUTTON} bg-orange-600 text-white shadow-lg hover:bg-orange-700`
const DARK = `${BUTTON} bg-stone-700 text-white shadow-lg hover:bg-stone-800`
const SECONDARY = `${BUTTON} border-2 border-orange-600 text-orange-700 hover:bg-orange-50`

export default function App() {
  const [text, setText] = useState(EXAMPLE)
  const [boxHeight, setBoxHeight] = useState<number>()
  const textarea = useRef<HTMLTextAreaElement>(null)
  const { state, start, cancel, reset, stop, replay } = useSynthesis()
  const words = tokenize(text)
  const tooLong = words.length > MAX_WORDS
  const editing = state.status !== 'preparing' && state.status !== 'ready'

  const changeText = (value: string) => {
    setText(value)
    reset()
  }

  const read = (event: FormEvent) => {
    event.preventDefault()
    if (state.status === 'cancelling' || tooLong || words.length === 0) return
    setBoxHeight(textarea.current?.offsetHeight)
    void start(words)
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-orange-50 to-amber-100 text-stone-800">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 sm:py-20">
        <header className="flex flex-col gap-3 text-center">
          <Title />
          <div className="flex flex-col items-center gap-2">
            <p className="text-lg text-stone-600">
              La synthèse vocale sans IA ni synthétiseur : chaque mot est lu par un véritable être
              humain.
            </p>
            <p className="flex items-center justify-center gap-1.5 text-sm text-stone-500">
              Source :
              <a
                href={WIKTIONARY_URL}
                target={WIKTIONARY_TARGET}
                rel="noopener"
                className="inline-flex items-center gap-1 font-medium text-stone-700 underline-offset-2 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-orange-300"
              >
                <WiktionaryLogo className="size-4" />
                Wiktionnaire
              </a>
            </p>
          </div>
        </header>

        <form
          onSubmit={read}
          className="flex flex-col gap-4 rounded-3xl bg-white/80 p-6 shadow-xl shadow-orange-900/10"
        >
          {editing ? (
            <>
              <div className="flex items-baseline justify-between">
                <label htmlFor="text" className="font-semibold">
                  Votre texte
                </label>
                <span
                  className={`text-sm ${tooLong ? 'font-bold text-red-700' : 'text-stone-500'}`}
                >
                  {words.length} / {MAX_WORDS} mots
                </span>
              </div>
              <textarea
                ref={textarea}
                id="text"
                value={text}
                onChange={(event) => changeText(event.target.value)}
                disabled={state.status === 'cancelling'}
                aria-describedby={tooLong ? 'too-long' : undefined}
                rows={4}
                className="min-h-36 resize-y rounded-2xl border border-stone-200 bg-white p-4 text-lg outline-none focus-visible:ring-4 focus-visible:ring-orange-300 disabled:bg-stone-50 disabled:text-stone-500"
              />
              {tooLong && (
                <p id="too-long" className="text-sm text-red-700">
                  {MAX_WORDS} mots maximum : raccourcissez un peu votre texte.
                </p>
              )}
              <button
                type="submit"
                disabled={state.status === 'cancelling' || tooLong || words.length === 0}
                className={`${PRIMARY} self-center`}
              >
                {state.status === 'cancelling' ? 'Annulation en cours…' : 'Lire'}
              </button>
            </>
          ) : state.status === 'preparing' ? (
            <>
              <div className="flex items-center gap-4">
                <p className="font-semibold text-orange-800">Préparation de la voix…</p>
                <ProgressBar label="Préparation de la voix" progress={state.progress} />
              </div>
              <WordList
                label="Mots en préparation"
                minHeight={boxHeight}
                items={words.map((word, index) => ({
                  word,
                  active: index < revealedCount(state.progress, words.length),
                }))}
              />
              <button type="button" onClick={() => void cancel()} className={`${DARK} self-center`}>
                Annuler
              </button>
            </>
          ) : (
            <>
              <p className="font-semibold">Votre texte</p>
              <WordList
                label="Voix trouvées"
                minHeight={boxHeight}
                items={state.voices.map(({ word, title, location, lemma }, index) => ({
                  word,
                  detail: [location || 'lieu inconnu', lemma && `via ${lemma}`]
                    .filter(Boolean)
                    .join(', '),
                  href: wiktionaryPageUrl(title),
                  active: index === state.playing,
                }))}
              />
              <div className="flex flex-wrap justify-center gap-3">
                {state.playing === null ? (
                  <button type="button" onClick={replay} className={PRIMARY}>
                    Réécouter
                  </button>
                ) : (
                  <button type="button" onClick={stop} className={DARK}>
                    Arrêter
                  </button>
                )}
                <button type="button" onClick={reset} className={SECONDARY}>
                  Modifier le texte
                </button>
              </div>
            </>
          )}
        </form>

        {state.status === 'impossible' && <MissingWords words={state.missing} />}

        {state.status === 'error' && (
          <p role="alert" className="rounded-3xl bg-red-50 p-6 text-center text-red-900">
            Le Wiktionnaire ne répond pas. Réessayez dans un instant.
          </p>
        )}
      </main>
    </div>
  )
}
