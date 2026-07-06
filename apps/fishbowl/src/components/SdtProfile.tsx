import { SDT_NEEDS, SDT_TOTAL } from '@fishbowl/feedback-core'

type TeamNeed = { key: string; label: string; meanPoints: number; n: number }

// What You Fuel (SDT) — team only, no self overlay. A ranked horizontal bar list
// of the team's mean points per need (bar width ∝ meanPoints). The top need is
// highlighted as what the subject most leaves in their colleagues' tanks.
export default function SdtProfile({ team }: { team: TeamNeed[] }) {
  const stem = (key: string) => SDT_NEEDS.find((s) => s.key === key)?.feelStem
  const rows = [...team].filter((r) => r.n > 0).sort((a, b) => b.meanPoints - a.meanPoints)
  if (rows.length === 0) return null

  const top = rows[0]
  const max = rows[0].meanPoints || 1

  return (
    <div className="flex flex-col gap-4">
      <p className="serif text-lg text-ink">
        After working with you, your team most feels{' '}
        <span className="font-semibold text-pink-deep">{top.label.toLowerCase()}</span>, {stem(top.key)}.
      </p>

      <div className="flex flex-col gap-2.5">
        {rows.map((r, i) => {
          const isTop = i === 0
          const pct = Math.round((r.meanPoints / SDT_TOTAL) * 100)
          return (
            <div
              key={r.key}
              className={`rounded-2xl border-[2.5px] border-ink p-3 shadow-chunky-sm ${
                isTop ? 'bg-pink sc-pink' : 'bg-paper-hi'
              }`}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold text-ink">{r.label}</span>
                <span className="shrink-0 font-mono text-sm text-ink-soft">{r.meanPoints.toFixed(1)} pts</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full border-2 border-ink bg-paper-hi">
                <div
                  className={`h-full rounded-r-full ${isTop ? 'bg-pink-deep' : 'bg-blue'}`}
                  style={{ width: `${(r.meanPoints / max) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-soft">
                {stem(r.key)} <span className="font-semibold text-ink-soft">· {pct}% of the tank</span>
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
