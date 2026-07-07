const SEGMENTS = [1, 2, 3, 4, 5, 6, 7]
const CENTER = 4
// Pink ramp by distance from the balanced middle (1 = nearest, 3 = the extreme pole).
const VICE_PINK = ['', '#f6cdda', '#efaac4', '#e486a6']
const STAR_BLUE = '#bcd6ef'

// A situational spectrum, 7 points: the middle (4) is the balanced move (dark Greek blue
// + light star); the two ends are the deficient / excessive extremes of that behaviour.
// Same Aristotelian language as the virtue sliders, but the labels are the real options.
export default function ScenarioSlider({
  value,
  onChange,
  deficientLabel,
  balancedLabel,
  excessiveLabel,
  id,
}: {
  value: number | null
  onChange?: (v: number) => void
  deficientLabel: string
  balancedLabel: string
  excessiveLabel: string
  id?: string
}) {
  return (
    <div className="w-full select-none">
      {/* the three real options: extreme · THE BALANCE · extreme */}
      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
        <span className="text-left text-xs font-semibold leading-tight text-ink-soft">{deficientLabel}</span>
        <span className="max-w-[9.5rem] rounded-xl border-2 border-blue/40 bg-blue/10 px-3 py-2 text-center text-xs font-bold leading-tight text-ink">
          <span style={{ color: STAR_BLUE }}>✦</span> {balancedLabel}
        </span>
        <span className="text-right text-xs font-semibold leading-tight text-ink-soft">{excessiveLabel}</span>
      </div>

      {/* 7 keys, no outer tray — the middle is always the dark-blue balanced marker */}
      <div className="flex gap-1.5">
        {SEGMENTS.map((s) => {
          const isSel = value === s
          const center = s === CENTER
          const selVice = isSel && !center
          return (
            <button
              key={id ? `${id}-${s}` : s}
              type="button"
              onClick={() => onChange?.(s)}
              aria-label={`Position ${s} of 7`}
              style={selVice ? { backgroundColor: VICE_PINK[Math.abs(s - CENTER)] } : undefined}
              className={`depress-sm relative grid h-12 flex-1 cursor-pointer place-items-center rounded-lg border-[2.5px] border-ink ${
                center ? 'bg-blue sc-navy' : selVice ? 'sc-pink' : 'bg-paper-hi'
              } ${isSel ? 'is-on' : ''}`}
            >
              {center && <span className="text-base leading-none" style={{ color: STAR_BLUE }}>✦</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
