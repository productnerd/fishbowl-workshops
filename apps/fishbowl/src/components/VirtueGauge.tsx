import type { Tendency } from '@fishbowl/feedback-core'

// Compact bipolar gauge: 5 segments, the subject's mean marked, center = the virtue.
// Communicates BALANCE (the Aristotelian point), not a percentile.
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
  const pos = Math.min(5, Math.max(1, Math.round(mu)))
  const label = tendency === 'balanced' ? 'in balance' : tendency === 'excessive' ? 'leans too far' : 'leans too little'
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className={big ? 'display text-2xl' : 'kicker text-ink'}>{name}</span>
        <span className={`kicker ${tendency === 'balanced' ? 'text-cyan-deep' : 'text-red-deep'}`}>{label}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((s) => {
          const sel = s === pos
          const center = s === 3
          return (
            <div
              key={s}
              className={`${big ? 'h-12' : 'h-9'} flex-1 rounded-xl border-[2.5px] border-ink ${
                sel ? (tendency === 'balanced' ? 'bg-cyan' : 'bg-red') : center ? 'bg-cyan/25' : 'bg-paper-hi'
              }`}
            />
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-ink-soft">
        <span>{deficientPole}</span>
        <span>{excessivePole}</span>
      </div>
    </div>
  )
}
