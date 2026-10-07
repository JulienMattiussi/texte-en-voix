/**
 * The page behind `public/og.png`, the picture social networks show for a shared link.
 *
 * Built from the site's own components (title, word bubbles) so the picture never
 * drifts from the real page. The words and places come from a real lookup.
 *
 *   make og      (served by Vite, captured at 1200x630 by headless Chrome)
 */
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/caveat'
import '@/index.css'
import { Title } from '@/Title'
import { WiktionaryLogo } from '@/WiktionaryLogo'
import { WordList } from '@/WordList'

const VOICES = [
  { word: 'Bonjour', detail: 'France (Vosges)' },
  { word: 'le', detail: 'Québec (Canada)' },
  { word: 'canard', detail: 'France (Toulouse)' },
  { word: 'mange', detail: 'France (Brétigny-sur-Orge)' },
  { word: 'une', detail: 'Québec (Canada)' },
  { word: 'brimbelles', detail: 'France (Vosges), via brimbelle' },
]

function OgCard() {
  return (
    <div className="flex h-[630px] w-[1200px] items-center justify-between px-16 text-stone-800">
      <div className="flex w-[560px] flex-col items-start gap-10">
        <div className="origin-left scale-[1.3]">
          <Title speaking />
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-[44px] leading-tight font-semibold text-stone-800">
            La synthèse vocale
            <br />
            sans IA ni synthétiseur
          </p>
          <p className="text-2xl text-stone-600">Chaque mot est lu par un véritable être humain.</p>
        </div>
        <p className="flex items-center gap-2 font-mono text-lg text-stone-500">
          Source : <WiktionaryLogo className="size-6" /> Wiktionnaire
        </p>
      </div>
      <div className="w-[400px] origin-right scale-[1.12] rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-sm">
        <WordList
          label="Voix trouvées"
          items={VOICES.map((voice, index) => ({ ...voice, active: index === 2 }))}
        />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<OgCard />)
