export default function StatBar({
  label,
  value,
  percent,
}: {
  label: string
  value: number
  percent?: number
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="font-semibold">{label}</span>
        {percent != null && percent <= 40 && (
          <span className="shrink-0 font-mono text-sm text-blue-deep">top {percent}%</span>
        )}
      </div>
      <div className="h-5 overflow-hidden rounded-full border-[2.5px] border-ink bg-paper-hi">
        <div className="h-full rounded-r-full bg-pink" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
    </div>
  )
}
