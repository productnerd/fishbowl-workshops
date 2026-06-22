import type { Tendency } from '@fishbowl/feedback-core'

// Compact bipolar gauge (1-9, 5 = the virtue). Communicates BALANCE, not a percentile.
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
  const label = tendency === 'balanced' ? 'in balance' : tendency === 'excessive' ? 'leans too far' : 'leans too little'
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className={big ? 'display text-2xl' : 'kicker text-ink'}>{name}</span>
        <span className={`kicker ${tendency === 'balanced' ? 'text-blue-deep' : 'text-pink-deep'}`}>{label}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => {
          const sel = s === pos
          const center = s === 5
          return (
            <div
              key={s}
              className={`${big ? 'h-10' : 'h-7'} flex-1 rounded-md border-2 border-ink ${
                sel ? (tendency === 'balanced' ? 'bg-blue' : 'bg-pink') : center ? 'bg-blue/25' : 'bg-paper-hi'
              }`}
            />
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
