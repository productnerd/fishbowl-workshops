const SEGMENTS = [1, 2, 3, 4, 5]

// Unipolar 1-5 agreement scale — fills left-to-right (more = more agreement).
export default function LikertScale({
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  value: number | null
  onChange: (v: number) => void
  lowLabel: string
  highLabel: string
}) {
  return (
    <div className="w-full select-none">
      <div className="card-3d flex gap-2 bg-sand p-2.5">
        {SEGMENTS.map((s) => {
          const filled = value != null && s <= value
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={`press grid h-16 flex-1 cursor-pointer place-items-center rounded-2xl border-[2.5px] border-ink font-display text-xl font-black ${
                filled ? 'bg-red text-paper-hi' : 'bg-paper-hi text-ink-soft/70'
              }`}
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
