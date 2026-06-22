const SEGMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// Bipolar Aristotelian slider, 1-9: 1 & 9 are vices, 5 (the middle) is the virtue.
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
      {/* one line at the top: vice · virtue · vice */}
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-baseline gap-2">
        <span className="text-[13px] font-semibold text-ink-soft">{deficientLabel}</span>
        <span className="kicker whitespace-nowrap text-center text-ink">{virtueLabel}</span>
        <span className="text-right text-[13px] font-semibold text-ink-soft">{excessiveLabel}</span>
      </div>

      {/* 9 keys, no outer tray — each a tactile raised key that stays pressed when chosen */}
      <div className="flex gap-1.5">
        {SEGMENTS.map((s) => {
          const isSel = value === s
          const isCenter = s === 5
          const balanced = s >= 4 && s <= 6
          return (
            <button
              key={id ? `${id}-${s}` : s}
              type="button"
              onClick={() => onChange?.(s)}
              aria-label={`Position ${s} of 9`}
              className={`depress-sm relative grid h-12 flex-1 cursor-pointer place-items-center rounded-lg border-[2.5px] border-ink ${
                isSel ? `${balanced ? 'bg-blue' : 'bg-red'} is-on` : isCenter ? 'bg-blue/25' : 'bg-paper-hi'
              }`}
            >
              {isCenter && !isSel && <span className="text-base leading-none text-blue-deep">✦</span>}
            </button>
          )
        })}
      </div>

      {/* characteristic behaviours: vice (3) · virtue (3) · vice (3) */}
      {showTraits && (
        <div className="mt-6 grid grid-cols-3 gap-2.5 text-center">
          {[
            { head: deficientLabel, traits: deficientTraits, tone: 'text-red-deep', center: false },
            { head: virtueLabel, traits: virtueTraits, tone: 'text-blue-deep', center: true },
            { head: excessiveLabel, traits: excessiveTraits, tone: 'text-red-deep', center: false },
          ].map((col, ci) => (
            <div
              key={ci}
              className={col.center ? 'rounded-2xl border-2 border-blue/35 bg-blue/10 px-2 py-3' : 'px-1 py-3'}
            >
              <p className={`kicker mb-2.5 ${col.tone}`}>{col.head}</p>
              <ul className="space-y-2">
                {(col.traits ?? []).map((t, ti) => (
                  <li key={ti} className="text-base font-medium leading-tight text-ink">
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
