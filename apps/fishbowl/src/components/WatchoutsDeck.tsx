import { motion } from 'framer-motion'
import { rowItem } from '../lib/motion'

type TeamWatchout = { word: string; count: number }

// The team's most-named watch-outs, ranked like the strengths deck. Team picks
// carry the share of colleagues who flagged each one (team = blue). When the
// subject's own picks are present we tag the overlaps (you flagged it too = pink)
// and list what you owned that the team didn't name. Mirrors ViaDeck.
export default function WatchoutsDeck({
  team,
  self,
  total,
}: {
  team: TeamWatchout[]
  self: string[] | null
  total: number
}) {
  const teamHasData = team.length > 0
  const top = [...team].sort((a, b) => b.count - a.count).slice(0, 6)
  const pct = (c: number) => (total > 0 ? Math.round((c / total) * 100) : 0)

  // Treat null OR empty as "not answered": no self-overlay tags or "what you own"
  // section, so an unanswered self-read never reads as "you flagged nothing".
  const selfSet = self && self.length > 0 ? new Set(self) : null
  const teamSet = new Set(team.map((t) => t.word))
  const ownedOnly = selfSet ? [...selfSet].filter((w) => !teamSet.has(w)) : []

  const fan = [-2, -1, 0, 1, 2, -1]

  return (
    <div className="flex flex-col gap-6">
      {teamHasData && (
        <div>
          <p className="kicker mb-3 text-ink-soft">What your team flags most</p>
          <div className="flex flex-col gap-3">
            {top.map((t, i) => {
              const youToo = selfSet?.has(t.word)
              return (
                <motion.div
                  key={t.word}
                  variants={rowItem}
                  className="card-3d mx-auto w-[94%] bg-paper-hi p-4 text-ink"
                  style={{ rotate: `${fan[i] ?? 0}deg` }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 break-words font-display text-2xl font-black leading-tight text-ink">{t.word}</p>
                    <p className="shrink-0 font-display text-2xl font-black leading-none text-blue-deep">{pct(t.count)}%</p>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-sand">
                    <div className="h-full bg-blue" style={{ width: `${pct(t.count)}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-ink-soft">
                      {t.count} of {total} named this
                    </p>
                    {youToo && (
                      <span className="shrink-0 rounded-full border-2 border-ink bg-pink px-2 py-0.5 text-xs font-bold text-ink sc-pink">
                        you flagged it too
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {selfSet && (
        <motion.div variants={rowItem} className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-4 shadow-chunky-sm">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="font-serif text-lg font-black text-ink">What you own</p>
            <p className="text-xs font-semibold text-ink-soft">
              {teamHasData ? "Your picks the team didn't name" : 'The watch-outs you claimed'}
            </p>
          </div>
          {ownedOnly.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {ownedOnly.map((w) => (
                <span
                  key={w}
                  className="rounded-full border-2 border-ink bg-pink px-3 py-1.5 text-sm font-bold text-ink sc-pink"
                >
                  {w}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-ink-soft">
              {teamHasData ? 'Nothing extra, everything you owned, they saw too.' : 'You didn’t pick any.'}
            </p>
          )}
        </motion.div>
      )}
    </div>
  )
}
