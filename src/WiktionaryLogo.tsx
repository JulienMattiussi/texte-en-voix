export function WiktionaryLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="3"
        fill="#fff"
        stroke="#44403c"
        strokeWidth="1.5"
      />
      <text
        x="12"
        y="17.5"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="16"
        fontWeight="bold"
        fill="#292524"
      >
        W
      </text>
    </svg>
  )
}
