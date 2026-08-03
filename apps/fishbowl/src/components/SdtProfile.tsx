import { motion } from 'framer-motion'
import { SDT_NEEDS, SDT_TOTAL } from '@fishbowl/feedback-core'
import { rowItem } from '../lib/motion'

type TeamNeed = { key: string; label: string; meanPoints: number; n: number }

// What You Fuel (SDT) — team only, no self overlay. A ranked horizontal bar list
// of the team's mean points per need (bar width ∝ meanPoints). The top need is
// highlighted as what the subject most leaves in their colleagues' tanks.
export default function SdtProfile({ team, topPct }: { team: TeamNeed[]; topPct?: Record<string, number> }) {
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
            <motion.div
              key={r.key}
              variants={rowItem}
              className={`rounded-2xl border-[2.5px] border-ink p-3 shadow-chunky-sm ${
                isTop ? 'bg-pink sc-pink' : 'bg-paper-hi'
              }`}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2 text-sm font-bold text-ink">
                  {r.label}
                  {/* Only surfaced when the comparison population is big enough to be real. */}
                  {typeof topPct?.[r.key] === 'number' && topPct[r.key] <= 10 && (
                    <span className="shrink-0 rounded-full border-2 border-ink bg-blue px-2 py-0.5 text-[11px] font-black leading-tight text-paper-hi sc-navy">
                      top {topPct[r.key]}%
                    </span>
                  )}
                </span>
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
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
