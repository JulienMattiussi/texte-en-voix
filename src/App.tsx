import { useState } from 'react'
import { tokenize } from '@/lib/tokenize'

const EXAMPLE = 'Bonjour, aujourd’hui le chat mange une tarte aux myrtilles.'

export default function App() {
  const [text, setText] = useState(EXAMPLE)
  const words = tokenize(text)

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-100 text-stone-800">
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

        <section className="flex flex-col gap-4 rounded-3xl bg-white/80 p-6 shadow-xl shadow-orange-900/10">
          <label htmlFor="text" className="font-semibold">
            Votre texte
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            className="resize-y rounded-2xl border border-stone-200 bg-white p-4 text-lg outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
          />
          <button
            type="button"
            disabled
            className="self-center rounded-full bg-orange-600 px-8 py-3 text-lg font-bold text-white shadow-lg transition hover:bg-orange-700 focus-visible:ring-4 focus-visible:ring-orange-300 focus-visible:outline-none disabled:opacity-50"
          >
            Lire (bientôt)
          </button>
        </section>

        {words.length > 0 && (
          <ul aria-label="Mots à prononcer" className="flex flex-wrap justify-center gap-2">
            {words.map((word, index) => (
              <li
                key={`${index}-${word}`}
                className="rounded-full bg-white/70 px-3 py-1 text-sm text-stone-700"
              >
                {word}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
