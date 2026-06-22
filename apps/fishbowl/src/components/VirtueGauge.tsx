import type { Tendency } from '@fishbowl/feedback-core'

// Compact bipolar gauge (1-9, 5 = the virtue). The colour + position carry the
// meaning (blue = balanced, pink = a vice); the ✦ marks the virtuous middle.
export default function VirtueGauge({
  name,
  mu,
  tendency,
  deficientPole,
  excessivePole,
  big = false,
}: {
  name: string
  mu: number
  tendency: Tendency
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
          const sel = s === pos
          const center = s === 5
          return (
            <div
              key={s}
              className={`${big ? 'h-10' : 'h-7'} grid flex-1 place-items-center rounded-md border-2 border-ink ${
                sel ? (tendency === 'balanced' ? 'bg-blue' : 'bg-pink') : center ? 'bg-blue/25' : 'bg-paper-hi'
              }`}
            >
              {center && <span className={`text-xs leading-none ${sel ? 'text-paper-hi' : 'text-blue-deep'}`}>✦</span>}
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
