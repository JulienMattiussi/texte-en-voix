export function ProgressBar({ label, progress }: { label: string; progress: number }) {
  const percent = Math.min(1, progress) * 100
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="h-2 flex-1 overflow-hidden rounded-full bg-orange-200"
    >
      <div
        className="h-full rounded-full bg-orange-600 transition-[width] duration-100 ease-linear"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
