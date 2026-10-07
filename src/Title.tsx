const WAVE_BARS = [3, 6, 10, 7, 14, 18, 11, 22, 16, 25, 19, 13, 21, 9, 15, 7, 11, 5, 8, 3]

function Pencil({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 24" className={className} aria-hidden="true">
      <g stroke="#44403c" strokeWidth="1.5" strokeLinejoin="round">
        <rect x="1" y="4" width="14" height="16" rx="4" fill="#f9a8d4" />
        <rect x="14" y="4" width="9" height="16" fill="#d6d3d1" />
        <path d="M17 4v16M20 4v16" fill="none" strokeWidth="1" />
        <rect x="23" y="4" width="67" height="16" fill="#fbbf24" />
        <path d="M23 10h67M23 14h67" fill="none" stroke="#d97706" strokeWidth="1" />
        <path d="M90 4 L112 12 L90 20 Z" fill="#fde7c4" />
        <path d="M104 9.1 L112 12 L104 14.9 Z" fill="#44403c" />
      </g>
    </svg>
  )
}

function VoiceWaves({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 48" className={className} aria-hidden="true">
      <g fill="none" stroke="#ea580c" strokeLinecap="round" strokeWidth="4">
        <path className="tv-wave" d="M6 17a10 10 0 0 1 0 14" />
        <path className="tv-wave [animation-delay:200ms]" d="M15 10a20 20 0 0 1 0 28" />
        <path className="tv-wave [animation-delay:400ms]" d="M24 3a30 30 0 0 1 0 42" />
      </g>
    </svg>
  )
}

function PencilToSound({ className, speaking }: { className: string; speaking: boolean }) {
  return (
    <svg
      viewBox="0 0 400 40"
      className={`${className} ${speaking ? 'tv-speaking' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M4 22c18-9 34 7 54-1s32-8 50-1 34 5 52-2 26-3 40 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g stroke="#ea580c" strokeWidth="5" strokeLinecap="round">
        {WAVE_BARS.map((height, index) => {
          const x = 214 + index * 9.5
          return (
            <line
              key={x}
              className="tv-bar"
              style={{ animationDelay: `${(index % 7) * 85}ms` }}
              x1={x}
              x2={x}
              y1={20 - height / 2}
              y2={20 + height / 2}
            />
          )
        })}
      </g>
    </svg>
  )
}

export function Title({ speaking }: { speaking: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <h1 className="font-hand flex items-end justify-center gap-2 leading-none text-stone-800 dark:text-stone-100 sm:gap-3">
        <span className="text-7xl font-bold sm:text-8xl">Texte</span>
        <span className="mb-1 text-4xl text-stone-500 dark:text-stone-400 sm:mb-2 sm:text-5xl">
          en
        </span>
        <span className="text-7xl font-bold text-orange-600 dark:text-orange-500 sm:text-8xl">
          voix
        </span>
        <VoiceWaves className="mb-2 w-8 sm:mb-4 sm:w-10" />
      </h1>
      <div className="-mt-1 flex items-center">
        <Pencil className="-mr-1 w-14 origin-right rotate-[35deg] sm:w-20" />
        <PencilToSound
          className="w-64 text-stone-600 sm:w-96 dark:text-stone-400"
          speaking={speaking}
        />
      </div>
    </div>
  )
}
