import { useRef, useState, type FormEvent } from 'react'
import { MAX_WORDS, revealedCount } from '@/lib/pacing'
import { tokenize } from '@/lib/tokenize'
import { wiktionaryPageUrl } from '@/lib/wiktionary'
import { useVoiceLookup } from '@/useVoiceLookup'
import { Title } from '@/Title'
import { WiktionaryLogo } from '@/WiktionaryLogo'
import { WordList } from '@/WordList'

const LINGUA_LIBRE_URL = 'https://lingualibre.org/app/'

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
  const { state, start, cancel, reset, stop, replay } = useVoiceLookup()
  const words = tokenize(text)
  const tooLong = words.length > MAX_WORDS
  const editing = state.status !== 'running' && state.status !== 'ready'

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
                href="https://fr.wiktionary.org/"
                target="wiktionnaire"
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
          ) : state.status === 'running' ? (
            <>
              <div className="flex items-center gap-4">
                <p className="font-semibold text-orange-800">Préparation de la voix…</p>
                <div
                  role="progressbar"
                  aria-label="Préparation de la voix"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(Math.min(1, state.progress) * 100)}
                  className="h-2 flex-1 overflow-hidden rounded-full bg-orange-200"
                >
                  <div
                    className="h-full rounded-full bg-orange-600 transition-[width] duration-100 ease-linear"
                    style={{ width: `${Math.min(1, state.progress) * 100}%` }}
                  />
                </div>
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

        {state.status === 'impossible' && (
          <div role="alert" className="rounded-3xl bg-red-50 p-6 text-center text-red-900">
            <p className="text-lg font-bold">La synthèse vocale n’est pas possible.</p>
            <p className="mt-1">Personne n’a encore enregistré ces mots :</p>
            <ul aria-label="Mots introuvables" className="mt-3 flex flex-wrap justify-center gap-2">
              {state.missing.map((word) => (
                <li key={word}>
                  <a
                    href={wiktionaryPageUrl(word.toLocaleLowerCase('fr'))}
                    target="wiktionnaire"
                    rel="noopener"
                    title={`« ${word} » sur le Wiktionnaire`}
                    className="inline-block rounded-2xl border-2 border-red-300 bg-white px-3 py-1 font-semibold text-red-900 transition outline-none hover:bg-red-100 focus-visible:ring-4 focus-visible:ring-red-300"
                  >
                    {word}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm">
              <span aria-hidden="true">🎙️ </span>
              Prêtez-leur votre voix sur{' '}
              <a
                href={LINGUA_LIBRE_URL}
                target="lingualibre"
                rel="noopener"
                className="font-semibold underline underline-offset-2 outline-none hover:text-red-700 focus-visible:ring-4 focus-visible:ring-red-300"
              >
                Lingua Libre
              </a>{' '}
              : vos enregistrements rejoindront le Wiktionnaire.
            </p>
          </div>
        )}

        {state.status === 'error' && (
          <p role="alert" className="rounded-3xl bg-red-50 p-6 text-center text-red-900">
            Le Wiktionnaire ne répond pas. Réessayez dans un instant.
          </p>
        )}
      </main>
    </div>
  )
}
