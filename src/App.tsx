import { useState, type FormEvent } from 'react'
import { MAX_WORDS, revealedCount } from '@/lib/pacing'
import { tokenize } from '@/lib/tokenize'
import { useVoiceLookup } from '@/useVoiceLookup'

const EXAMPLE = 'Bonjour, aujourd’hui le canard mange une tarte aux myrtilles.'

const PRIMARY_BUTTON =
  'self-center rounded-full px-8 py-3 text-lg font-bold shadow-lg transition focus-visible:ring-4 focus-visible:ring-orange-300 focus-visible:outline-none disabled:opacity-50'

export default function App() {
  const [text, setText] = useState(EXAMPLE)
  const { state, start, cancel, reset, stop, replay } = useVoiceLookup()
  const words = tokenize(text)
  const tooLong = words.length > MAX_WORDS
  const busy = state.status === 'running' || state.status === 'cancelling'
  const playing = state.status === 'ready' ? state.playing : null
  const revealed = state.status === 'running' ? revealedCount(state.progress, words.length) : 0

  const changeText = (value: string) => {
    setText(value)
    reset()
  }

  const read = (event: FormEvent) => {
    event.preventDefault()
    if (!busy && !tooLong && words.length > 0) void start(words)
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-orange-50 to-amber-100 text-stone-800">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 sm:py-20">
        <header className="flex flex-col gap-3 text-center">
          <h1 className="text-4xl font-black tracking-tight text-orange-700 sm:text-5xl">
            texte-en-voix
          </h1>
          <p className="text-lg text-stone-600">
            La synthèse vocale sans IA ni synthétiseur : chaque mot est lu par un vrai humain du
            Wiktionnaire, de préférence avec l’accent vosgien ou québécois.
          </p>
        </header>

        <form
          onSubmit={read}
          className="flex flex-col gap-4 rounded-3xl bg-white/80 p-6 shadow-xl shadow-orange-900/10"
        >
          <div className="flex items-baseline justify-between">
            <label htmlFor="text" className="font-semibold">
              Votre texte
            </label>
            <span className={`text-sm ${tooLong ? 'font-bold text-red-700' : 'text-stone-500'}`}>
              {words.length} / {MAX_WORDS} mots
            </span>
          </div>
          <textarea
            id="text"
            value={text}
            onChange={(event) => changeText(event.target.value)}
            disabled={busy}
            aria-describedby={tooLong ? 'too-long' : undefined}
            rows={4}
            className="resize-y rounded-2xl border border-stone-200 bg-white p-4 text-lg outline-none focus-visible:ring-4 focus-visible:ring-orange-300 disabled:bg-stone-50 disabled:text-stone-500"
          />
          {tooLong && (
            <p id="too-long" className="text-sm text-red-700">
              {MAX_WORDS} mots maximum : raccourcissez un peu votre texte.
            </p>
          )}
          {state.status === 'running' ? (
            <button
              type="button"
              onClick={() => void cancel()}
              className={`${PRIMARY_BUTTON} bg-stone-700 text-white hover:bg-stone-800`}
            >
              Annuler
            </button>
          ) : playing !== null ? (
            <button
              type="button"
              onClick={stop}
              className={`${PRIMARY_BUTTON} bg-stone-700 text-white hover:bg-stone-800`}
            >
              Arrêter
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy || tooLong || words.length === 0}
              className={`${PRIMARY_BUTTON} bg-orange-600 text-white hover:bg-orange-700`}
            >
              {state.status === 'cancelling' ? 'Annulation en cours…' : 'Lire'}
            </button>
          )}
        </form>

        {state.status === 'running' && (
          <div className="flex flex-col gap-2">
            <p className="text-center font-semibold text-orange-800">Préparation de la voix…</p>
            <div
              role="progressbar"
              aria-label="Préparation de la voix"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(1, state.progress) * 100)}
              className="h-2 overflow-hidden rounded-full bg-orange-200"
            >
              <div
                className="h-full rounded-full bg-orange-600 transition-[width] duration-100 ease-linear"
                style={{ width: `${Math.min(1, state.progress) * 100}%` }}
              />
            </div>
          </div>
        )}

        {state.status === 'impossible' && (
          <div role="alert" className="rounded-3xl bg-red-50 p-6 text-center text-red-900">
            <p className="text-lg font-bold">La synthèse vocale n’est pas possible.</p>
            <p className="mt-1">Mots introuvables : {state.missing.join(', ')}</p>
          </div>
        )}

        {state.status === 'error' && (
          <p role="alert" className="rounded-3xl bg-red-50 p-6 text-center text-red-900">
            Le Wiktionnaire ne répond pas. Réessayez dans un instant.
          </p>
        )}

        {state.status === 'ready' ? (
          <div className="flex flex-col items-center gap-4">
            <ul aria-label="Voix trouvées" className="flex flex-wrap justify-center gap-2">
              {state.voices.map(({ word, location }, index) => (
                <li
                  key={`${index}-${word}`}
                  aria-current={index === playing ? 'true' : undefined}
                  className={`flex flex-col items-center rounded-2xl px-3 py-1 transition ${
                    index === playing
                      ? 'bg-orange-600 text-white'
                      : 'bg-white/80'
                  }`}
                >
                  <span className="font-semibold">{word}</span>
                  <span
                    className={`text-xs ${index === playing ? 'text-orange-100' : 'text-stone-500'}`}
                  >
                    {location || 'lieu inconnu'}
                  </span>
                </li>
              ))}
            </ul>
            {playing === null && (
              <button
                type="button"
                onClick={replay}
                className="rounded-full border-2 border-orange-600 px-5 py-2 font-semibold text-orange-700 transition hover:bg-orange-50 focus-visible:ring-4 focus-visible:ring-orange-300 focus-visible:outline-none"
              >
                Réécouter
              </button>
            )}
          </div>
        ) : (
          words.length > 0 && (
            <ul aria-label="Mots à prononcer" className="flex flex-wrap justify-center gap-2">
              {words.map((word, index) => (
                <li
                  key={`${index}-${word}`}
                  className={`rounded-full px-3 py-1 text-sm transition-colors duration-300 ${
                    index < revealed
                      ? 'bg-orange-600 text-white'
                      : 'bg-white/70 text-stone-700'
                  }`}
                >
                  {word}
                </li>
              ))}
            </ul>
          )
        )}
      </main>
    </div>
  )
}
