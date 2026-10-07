import { useState } from 'react'
import { CheckIcon, ShareIcon } from '@/icons'
import { shareUrl } from '@/lib/share'

const COPIED_MS = 2000

export function ShareButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = shareUrl(`${location.origin}${location.pathname}`, text)
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'Texte en voix', text: `« ${text} »`, url }).catch(() => {})
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_MS)
    } catch {
      window.prompt('Copiez ce lien pour partager la phrase :', url)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void share()}
        aria-label="Partager"
        title="Partager"
        className="flex size-12 items-center justify-center rounded-full border-2 border-orange-600 text-orange-700 transition outline-none hover:bg-orange-50 focus-visible:ring-4 focus-visible:ring-orange-300 dark:text-orange-300 dark:hover:bg-stone-800"
      >
        {copied ? <CheckIcon /> : <ShareIcon />}
      </button>
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-10 flex justify-center px-4"
      >
        {copied && (
          <p className="rounded-full bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white shadow-lg dark:bg-stone-100 dark:text-stone-900">
            Lien copié
          </p>
        )}
      </div>
    </>
  )
}
