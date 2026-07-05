// Subtle brown ramp by distance from the neutral middle (bipolar mode).
const BROWN = ['bg-paper-hi', 'bg-sand', 'bg-sand-deep']

// Two modes:
//  - default: a unipolar agreement meter (fills left-to-right, numbered).
//  - bipolar: a position scale where the middle is neutral and the edges are the
//    strong positions. Only the pressed cell highlights (pink); the rest carry a
//    subtle brown tint that deepens toward the edges. No numbers.
// `points` sets how many cells (default 5; the personality scale uses 7).
export default function LikertScale({
  value,
  onChange,
  lowLabel,
  highLabel,
  bipolar = false,
  points = 5,
}: {
  value: number | null
  onChange: (v: number) => void
  lowLabel: string
  highLabel: string
  bipolar?: boolean
  points?: number
}) {
  const segments = Array.from({ length: points }, (_, i) => i + 1)
  const middle = (points + 1) / 2
  return (
    <div className="w-full select-none">
      <div className="card-3d flex gap-2 bg-sand p-2.5">
        {segments.map((s) => {
          const isSel = value === s
          if (bipolar) {
            const dist = Math.floor(Math.abs(s - middle)) // 0 (middle) .. edge
            const shade = BROWN[Math.min(dist, BROWN.length - 1)]
            return (
              <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                aria-label={`Position ${s} of ${points}`}
                className={`depress-sm h-16 flex-1 cursor-pointer rounded-2xl border-[2.5px] border-ink ${
                  isSel ? 'bg-pink sc-pink is-on' : shade
                }`}
              />
            )
          }
          const filled = value != null && s <= value
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={`depress-sm grid h-16 flex-1 cursor-pointer place-items-center rounded-2xl border-[2.5px] border-ink font-display text-xl font-black ${
                filled ? 'bg-pink text-ink sc-pink' : 'bg-paper-hi text-ink-soft/70'
              } ${isSel ? 'is-on' : ''}`}
            >
              {s}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-[13px] font-semibold text-ink-soft">
        <span>← {lowLabel}</span>
        <span>{highLabel} →</span>
      </div>
    </div>
  )
}
