import { HATS, type HatScores } from '@fishbowl/feedback-core'

type TeamHat = { key: string; label: string; mu: number; n: number }

// Six bipolar 1-9 gauges (center = ideal). Shows the team marker (blue) and, when
// the subject has self-assessed, a self marker (pink). Sorted most-out-of-balance
// first. When the team hasn't been asked these (pooled survey didn't sample them),
// it falls back to a self-only view so the subject still sees what they rated.
export default function HatsProfile({ team, self }: { team: TeamHat[]; self: HatScores | null }) {
  const meta = (key: string) => HATS.find((h) => h.key === key)
  const pos = (v: number) => ((Math.min(9, Math.max(1, v)) - 1) / 8) * 100
  const teamRows = [...team].filter((r) => r.n > 0).sort((a, b) => Math.abs(b.mu - 5) - Math.abs(a.mu - 5))
  const teamHasData = teamRows.length > 0
  const rows: TeamHat[] = teamHasData
    ? teamRows
    : HATS.filter((h) => self && typeof self[h.key] === 'number').map((h) => ({ key: h.key, label: h.mode, mu: 5, n: 0 }))

  return (
    <div className="flex flex-col gap-4">
      {!teamHasData && self && (
        <p className="text-xs text-ink-soft">Your own read. Your team hasn't been asked about these yet.</p>
      )}
      {rows.map((r) => {
        const h = meta(r.key)
        const s = self?.[r.key]
        const teamShown = r.n > 0
        const diverges = teamShown && typeof s === 'number' && Math.abs(s - r.mu) >= 2
        return (
          <div key={r.key}>
            <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
              <span className="kicker text-ink-soft">{h?.tooLittle}</span>
              <span className="kicker whitespace-nowrap text-center text-ink">{r.label}</span>
              <span className="kicker text-right text-ink-soft">{h?.tooMuch}</span>
            </div>
            <div className="relative h-3 rounded-full border-2 border-ink bg-paper-hi">
              {/* center mark = ideal */}
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink/25" />
              {teamShown && (
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-blue"
                  style={{ left: `${pos(r.mu)}%` }}
                  title={`team ${r.mu}`}
                />
              )}
              {typeof s === 'number' && (
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-pink"
                  style={{ left: `${pos(s)}%` }}
                  title={`you ${s}`}
                />
              )}
            </div>
            {diverges && (
              <p className="mt-1.5 text-xs font-semibold text-pink-deep">
                You read this as {s}; your team puts you at {Math.round(r.mu)}, a notable gap.
              </p>
            )}
          </div>
        )
      })}
      <div className="mt-1 flex justify-between text-[12px] font-semibold text-ink-soft">
        <span>← Too little</span>
        <span className="text-ink">Ideal</span>
        <span>Too much →</span>
      </div>
      <div className="flex gap-4 text-xs font-semibold text-ink-soft">
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
