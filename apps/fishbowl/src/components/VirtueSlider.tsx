const SEGMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
// Pink ramp by distance from the virtuous middle (1 = nearest, 4 = the vice pole).
const VICE_PINK = ['', '#f6cdda', '#efaac4', '#e486a6', '#d56690']
const STAR_BLUE = '#bcd6ef'

// Bipolar Aristotelian slider, 1-9: the middle (5) is the virtue (dark Greek blue +
// light star); choices grow pinker the closer they sit to a vice.
export default function VirtueSlider({
  value,
  onChange,
  virtueLabel,
  deficientLabel,
  excessiveLabel,
  deficientTraits,
  virtueTraits,
  excessiveTraits,
  id,
}: {
  value: number | null
  onChange?: (v: number) => void
  virtueLabel: string
  deficientLabel: string
  excessiveLabel: string
  deficientTraits?: string[]
  virtueTraits?: string[]
  excessiveTraits?: string[]
  id?: string
}) {
  const showTraits = Boolean(deficientTraits?.length || virtueTraits?.length || excessiveTraits?.length)

  return (
    <div className="w-full select-none">
      {/* one line, all caps: vice · VIRTUE · vice */}
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
        <span className="kicker text-ink-soft">{deficientLabel}</span>
        <span className="kicker whitespace-nowrap text-center text-ink">{virtueLabel}</span>
        <span className="kicker text-right text-ink-soft">{excessiveLabel}</span>
      </div>

      {/* 9 keys, no outer tray — the middle is always the dark-blue virtue marker */}
      <div className="flex gap-1.5">
        {SEGMENTS.map((s) => {
          const isSel = value === s
          const center = s === 5
          const selVice = isSel && !center
          return (
            <button
              key={id ? `${id}-${s}` : s}
              type="button"
              onClick={() => onChange?.(s)}
              aria-label={`Position ${s} of 9`}
              style={selVice ? { backgroundColor: VICE_PINK[Math.abs(s - 5)] } : undefined}
              className={`depress-sm relative grid h-12 flex-1 cursor-pointer place-items-center rounded-lg border-[2.5px] border-ink ${
                center ? 'bg-blue sc-navy' : selVice ? 'sc-pink' : 'bg-paper-hi'
              } ${isSel ? 'is-on' : ''}`}
            >
              {center && <span className="text-base leading-none" style={{ color: STAR_BLUE }}>✦</span>}
            </button>
          )
        })}
      </div>

      {/* characteristic behaviours, aligned to their pole: vice (left) · virtue (center) · vice (right) */}
      {showTraits && (
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {[
            { traits: deficientTraits, align: 'text-left', center: false },
            { traits: virtueTraits, align: 'text-center', center: true },
            { traits: excessiveTraits, align: 'text-right', center: false },
          ].map((col, ci) => (
            <div
              key={ci}
              className={`${col.align} ${col.center ? 'rounded-2xl border-2 border-blue/35 bg-blue/10 px-3 py-3' : 'py-3'}`}
            >
              <ul className="space-y-0.5">
                {(col.traits ?? []).map((t, ti) => (
                  <li key={ti} className="text-xs font-medium leading-tight text-ink-soft">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
