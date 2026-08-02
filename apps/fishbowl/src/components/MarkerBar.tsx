// A horizontal position bar with one or two markers, used by the report's spectrum-style
// reads (motivation intrinsic↔extrinsic, life satisfaction, rigidity self-vs-team). The
// filled pink marker is the primary value; the hollow one is an optional comparison.
export default function MarkerBar({
  value,
  value2,
  min = 0,
  max = 100,
  leftLabel,
  rightLabel,
}: {
  value: number
  value2?: number
  min?: number
  max?: number
  leftLabel: string
  rightLabel: string
}) {
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`
  return (
    <div className="w-full">
      <div className="relative h-3 rounded-full border-[2.5px] border-ink bg-gradient-to-r from-sand to-blue/40">
        {value2 != null && (
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-paper-hi"
            style={{ left: pos(value2) }}
          />
        )}
        <div
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-ink bg-pink shadow-chunky-sm"
          style={{ left: pos(value) }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs font-semibold text-ink-soft">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
}
