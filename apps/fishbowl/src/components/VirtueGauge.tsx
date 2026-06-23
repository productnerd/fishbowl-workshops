// Pink ramp by distance from the virtuous middle (1 = nearest, 4 = the vice pole).
const VICE_PINK = ['', '#f6cdda', '#efaac4', '#e486a6', '#d56690']
const STAR_BLUE = '#bcd6ef'

// Compact bipolar gauge (1-9, 5 = the virtue). The middle is dark Greek blue with
// a light star; the marked position grows pinker the closer it sits to a vice.
export default function VirtueGauge({
  name,
  mu,
  deficientPole,
  excessivePole,
  big = false,
}: {
  name: string
  mu: number
  deficientPole: string
  excessivePole: string
  big?: boolean
}) {
  const pos = Math.min(9, Math.max(1, Math.round(mu)))
  return (
    <div>
      <div className="mb-1.5">
        <span className={big ? 'display text-2xl' : 'kicker text-ink'}>{name}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => {
          const center = s === 5
          const isPos = s === pos && !center
          return (
            <div
              key={s}
              style={isPos ? { backgroundColor: VICE_PINK[Math.abs(s - 5)] } : undefined}
              className={`${big ? 'h-10' : 'h-7'} grid flex-1 place-items-center rounded-md border-2 border-ink ${
                center ? 'bg-blue' : isPos ? '' : 'bg-paper-hi'
              }`}
            >
              {center && <span className="text-xs leading-none" style={{ color: STAR_BLUE }}>✦</span>}
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-wide text-ink-soft">
        <span>{deficientPole}</span>
        <span>{excessivePole}</span>
      </div>
    </div>
  )
}
