import type { EnergizerTags } from '@fishbowl/feedback-core'

type TeamEnergizer = { id: string; label: string; teamMean: number; n: number }

// Per-activity −2…+2 track with a team marker (blue) and, when present, the
// subject's own marker (pink). Sorted by what the team reads as most energizing.
// Falls back to a self-only view when the team hasn't been asked these.
export default function EnergyOverlay({ team, self }: { team: TeamEnergizer[]; self: EnergizerTags | null }) {
  const pos = (v: number) => ((v + 2) / 4) * 100
  // Map a 0–100 position to a `left` that keeps the 16px marker fully inside the
  // track at the extremes (inset by the 8px radius), so +2 / −2 never crop.
  const clp = (p: number) => `calc(8px + (100% - 16px) * ${p} / 100)`
  const teamHasData = team.some((r) => r.n > 0)
  const rows = team
    .filter((r) => r.n > 0 || (self && typeof self[r.id] === 'number'))
    .sort((a, b) => (teamHasData ? b.teamMean - a.teamMean : (self?.[b.id] ?? 0) - (self?.[a.id] ?? 0)))
  return (
    <div className="flex flex-col gap-3">
      {!teamHasData && self && (
        <p className="text-xs text-ink-soft">Your own read. Your team hasn't been asked about these yet.</p>
      )}
      {rows.map((r) => {
        const s = self?.[r.id]
        return (
          <div key={r.id}>
            <p className="text-sm font-semibold text-ink">{r.label}</p>
            <div className="relative mt-1.5 h-3 rounded-full border-2 border-ink bg-paper-hi">
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink/20" />
              {r.n > 0 && typeof s === 'number' && Math.abs(pos(r.teamMean) - pos(s)) > 4 && (
                <div
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
                  style={{ left: clp(Math.min(pos(r.teamMean), pos(s))), width: `calc((100% - 16px) * ${Math.abs(pos(r.teamMean) - pos(s))} / 100)`, backgroundColor: '#5e2746' }}
                />
              )}
              {r.n > 0 && (
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-blue"
                  style={{ left: clp(pos(r.teamMean)) }}
                  title={`team ${r.teamMean}`}
                />
              )}
              {typeof s === 'number' && (
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-pink"
                  style={{ left: clp(pos(s)) }}
                  title={`you ${s}`}
                />
              )}
            </div>
          </div>
        )
      })}
      <div className="mt-1 flex justify-between text-[12px] font-semibold text-ink-soft">
        <span>← Drains</span>
        <span>Energizes →</span>
      </div>
      <div className="mt-1 flex gap-4 text-xs font-semibold text-ink-soft">
        {teamHasData && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-blue" /> team
          </span>
        )}
        {self && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-pink" /> you
          </span>
        )}
      </div>
    </div>
  )
}
