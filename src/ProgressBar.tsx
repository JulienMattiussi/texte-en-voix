export function ProgressBar({ label, progress }: { label: string; progress: number }) {
  const percent = Math.min(1, progress) * 100
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="h-2 w-full shrink-0 overflow-hidden sm:w-auto sm:flex-1 rounded-full bg-orange-200 dark:bg-orange-950"
    >
      <div
        className="h-full rounded-full bg-orange-600 transition-[width] duration-100 ease-linear"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
