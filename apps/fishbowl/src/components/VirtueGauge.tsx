// Bipolar 1-9 virtue gauge (5 = the virtue, the centre). A track with the team marker
// (blue) and, when present, the subject's own marker (pink). The span between the two
// is painted dark pink to flag a meaningful gap. Matches the energy/hats sliders so the
// team/you colours are consistent everywhere.
const GAP = '#5e2746' // dark pink/purple — the "you vs team" gap highlight

export default function VirtueGauge({
  name,
  mu,
  deficientPole,
  excessivePole,
  self,
}: {
  name: string
  mu: number
  deficientPole: string
  excessivePole: string
  self?: number
}) {
  const pos = (v: number) => ((Math.min(9, Math.max(1, v)) - 1) / 8) * 100
  const teamPos = pos(mu)
  const selfPos = typeof self === 'number' ? pos(self) : null
  const gap = selfPos !== null ? Math.abs(teamPos - selfPos) : 0
  return (
    <div>
      <div className="mb-1.5">
        <span className="kicker text-ink">{name}</span>
      </div>
      <div className="relative h-3 rounded-full border-2 border-ink bg-paper-hi">
        {/* centre = the virtue */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink/25" />
        {/* the gap between your read and the team's, when it's meaningful */}
        {selfPos !== null && gap > 4 && (
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
            style={{ left: `${Math.min(teamPos, selfPos)}%`, width: `${gap}%`, backgroundColor: GAP }}
          />
        )}
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-blue"
          style={{ left: `${teamPos}%` }}
          title={`team ${Math.round(mu)}`}
        />
        {selfPos !== null && (
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-pink"
            style={{ left: `${selfPos}%` }}
            title={`you ${Math.round(self as number)}`}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-wide text-ink-soft">
        <span>{deficientPole}</span>
        <span className="text-ink">the virtue</span>
        <span>{excessivePole}</span>
      </div>
    </div>
  )
}
