import { WIKTIONARY_TARGET, wiktionaryPageUrl } from '@/lib/wiktionary'

const LINGUA_LIBRE_URL = 'https://lingualibre.org/app/'

export function MissingWords({ words }: { words: string[] }) {
  return (
    <div
      role="alert"
      className="rounded-3xl bg-red-50 dark:bg-red-950/60 p-6 text-center text-red-900 dark:text-red-200"
    >
      <p className="text-lg font-bold">La synthèse vocale n’est pas possible.</p>
      <p className="mt-1">Personne n’a encore enregistré ces mots :</p>
      <ul aria-label="Mots introuvables" className="mt-3 flex flex-wrap justify-center gap-2">
        {words.map((word) => (
          <li key={word}>
            <a
              href={wiktionaryPageUrl(word.toLocaleLowerCase('fr'))}
              target={WIKTIONARY_TARGET}
              rel="noopener"
              title={`« ${word} » sur le Wiktionnaire`}
              className="inline-block rounded-2xl border-2 border-red-300 dark:border-red-800 bg-white dark:bg-stone-950 px-3 py-1 font-semibold text-red-900 dark:text-red-200 transition outline-none hover:bg-red-100 dark:hover:bg-red-900/60 focus-visible:ring-4 focus-visible:ring-red-300"
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
          className="font-semibold underline underline-offset-2 outline-none hover:text-red-700 dark:hover:text-red-400 focus-visible:ring-4 focus-visible:ring-red-300"
        >
          Lingua Libre
        </a>{' '}
        : vos enregistrements rejoindront le Wiktionnaire.
      </p>
    </div>
  )
}
