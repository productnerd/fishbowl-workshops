import { motion } from 'framer-motion'
import { RESPONSIBILITY_TIERS, type ResponsibilityTiers } from '@fishbowl/feedback-core'
import Rich from './Rich'
import { rowItem } from '../lib/motion'

type TeamResp = { index: number; label: string; teamTier: number; n: number; note?: string; notes?: string[] }

// Per responsibility, a 3-rung ladder (Exceeds at top). The team's modal tier is
// highlighted; the subject's own tier is marked when present. Falls back to a
// self-only view when the team hasn't rated these.
export default function ResponsibilitiesLadder({ team, self }: { team: TeamResp[]; self: ResponsibilityTiers | null }) {
  const tier = (v: number) => RESPONSIBILITY_TIERS.find((t) => t.v === v)
  const rows = team.filter((r) => r.n > 0 || (self && typeof self[r.index] === 'number'))
  const teamHasData = team.some((r) => r.n > 0)
  const card = (r: TeamResp) => {
    const s = self?.[r.index]
    const teamShown = r.n > 0
    const bullets = r.notes && r.notes.length ? r.notes : r.note ? [r.note] : []
    return (
      <div className="rounded-2xl border-[2.5px] border-ink bg-sand p-4 shadow-chunky-sm">
        <p className="serif text-lg font-semibold text-ink">{r.label}</p>
        <div className="mt-3 flex flex-col gap-1.5">
          {[...RESPONSIBILITY_TIERS]
            .reverse()
            .filter((t) => (teamShown && r.teamTier === t.v) || s === t.v)
            .map((t) => {
              const teamHere = teamShown && r.teamTier === t.v
              const selfHere = s === t.v
              return (
                <div
                  key={t.v}
                  className={`flex items-center justify-between rounded-xl border-2 border-ink px-3 py-2 ${
                    teamHere ? 'bg-blue text-paper-hi' : selfHere ? 'bg-pink text-ink' : 'bg-paper-hi text-ink'
                  }`}
                >
                  <span className="text-sm font-bold">
                    {t.emoji} {t.label}
                  </span>
                  <span className="flex gap-1.5">
                    {teamHere && (
                      <span className="rounded-full bg-paper-hi px-2 py-0.5 text-xs font-bold text-blue-deep">team</span>
                    )}
                    {selfHere && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          teamHere ? 'bg-pink text-ink' : 'bg-paper-hi text-pink-deep'
                        }`}
                      >
                        you
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
        </div>
        {teamShown && bullets.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink">
                <span className="text-ink/50">•</span>
                <span>
                  <Rich text={b} />
                </span>
              </li>
            ))}
          </ul>
        )}
        {teamShown && typeof s === 'number' && s !== r.teamTier && (
          <p className="mt-2 text-xs font-semibold text-ink-soft">
            You see yourself at {tier(s)?.short}; your team puts you at {tier(r.teamTier)?.short}.
          </p>
        )}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-5">
      {!teamHasData && self && (
        <p className="text-xs text-ink-soft">Your own read. Your team hasn't rated these yet.</p>
      )}
      {rows.slice(0, 5).map((r) => (
        <motion.div key={r.index} variants={rowItem}>
          {card(r)}
        </motion.div>
      ))}
      {/* Cap animated children at six: rows past the fifth land together as one final child. */}
      {rows.length > 5 && (
        <motion.div variants={rowItem} className="flex flex-col gap-5">
          {rows.slice(5).map((r) => (
            <div key={r.index}>{card(r)}</div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
