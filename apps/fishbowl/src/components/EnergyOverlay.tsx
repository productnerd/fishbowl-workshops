import type { EnergizerTags } from '@fishbowl/feedback-core'

type TeamEnergizer = { id: string; label: string; teamMean: number; n: number }

// Per-activity −2…+2 track with a team marker (blue) and, when present, the
// subject's own marker (pink). Sorted by what the team reads as most energizing.
export default function EnergyOverlay({ team, self }: { team: TeamEnergizer[]; self: EnergizerTags | null }) {
  const pos = (v: number) => ((v + 2) / 4) * 100
  const rows = [...team].filter((r) => r.n > 0).sort((a, b) => b.teamMean - a.teamMean)
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => {
        const s = self?.[r.id]
        return (
          <div key={r.id}>
            <p className="text-sm font-semibold text-ink">{r.label}</p>
            <div className="relative mt-1.5 h-3 rounded-full border-2 border-ink bg-paper-hi">
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink/20" />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-blue"
                style={{ left: `${pos(r.teamMean)}%` }}
                title={`team ${r.teamMean}`}
              />
              {typeof s === 'number' && (
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-pink"
                  style={{ left: `${pos(s)}%` }}
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
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-blue" /> team
        </span>
        {self && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-pink" /> you
          </span>
        )}
      </div>
    </div>
  )
}
