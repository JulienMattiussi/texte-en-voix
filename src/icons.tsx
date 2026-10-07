import type { ReactNode } from 'react'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const PlayIcon = () => (
  <Icon>
    <path d="M7 4.5v15l12-7.5Z" fill="currentColor" />
  </Icon>
)

export const ReplayIcon = () => (
  <Icon>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 3v5h5" />
  </Icon>
)

export const StopIcon = () => (
  <Icon>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
  </Icon>
)

export const CrossIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" strokeWidth="2.5" />
  </Icon>
)

export const PencilIcon = () => (
  <Icon>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z" />
    <path d="m13.5 6.5 4 4" />
  </Icon>
)

export const ShareIcon = () => (
  <Icon>
    <path d="M14 5l7 7-7 7" />
    <path d="M21 12H10a6 6 0 0 0-6 6v1" />
  </Icon>
)

export const CheckIcon = () => (
  <Icon>
    <path d="M5 12.5 10 17.5 19 7" strokeWidth="2.5" />
  </Icon>
)
