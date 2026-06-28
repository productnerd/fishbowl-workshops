import { RESPONSIBILITY_TIERS, type ResponsibilityTiers } from '@fishbowl/feedback-core'
import Rich from './Rich'

type TeamResp = { index: number; label: string; teamTier: number; n: number; note?: string }

// Per responsibility, a 3-rung ladder (Exceeds at top). The team's modal tier is
// highlighted; the subject's own tier is marked when present. Falls back to a
// self-only view when the team hasn't rated these.
export default function ResponsibilitiesLadder({ team, self }: { team: TeamResp[]; self: ResponsibilityTiers | null }) {
  const tier = (v: number) => RESPONSIBILITY_TIERS.find((t) => t.v === v)
  const rows = team.filter((r) => r.n > 0 || (self && typeof self[r.index] === 'number'))
  const teamHasData = team.some((r) => r.n > 0)
  return (
    <div className="flex flex-col gap-5">
      {!teamHasData && self && (
        <p className="text-xs text-ink-soft">Your own read. Your team hasn't rated these yet.</p>
      )}
      {rows.map((r) => {
        const s = self?.[r.index]
        const teamShown = r.n > 0
        return (
          <div key={r.index} className="rounded-2xl border-[2.5px] border-ink bg-sand p-4 shadow-chunky-sm">
            <p className="serif text-lg font-semibold text-ink">{r.label}</p>
            <div className="mt-3 flex flex-col gap-1.5">
              {[...RESPONSIBILITY_TIERS].reverse().map((t) => {
                const teamHere = teamShown && r.teamTier === t.v
                const selfHere = s === t.v
                return (
                  <div
                    key={t.v}
                    className={`flex items-center justify-between rounded-xl border-2 border-ink px-3 py-2 ${
                      teamHere ? 'bg-blue text-paper-hi' : 'bg-paper-hi text-ink'
                    }`}
                  >
                    <span className="text-sm font-bold">
                      {t.emoji} {t.label}
                    </span>
                    <span className="flex gap-1.5">
                      {teamHere && (
                        <span className="rounded-full bg-paper-hi px-2 py-0.5 text-xs font-bold text-blue-deep">team</span>
                      )}
                      {selfHere && <span className="rounded-full bg-pink px-2 py-0.5 text-xs font-bold text-ink">you</span>}
                    </span>
                  </div>
                )
              })}
            </div>
            {teamShown && r.note && (
              <p className="mt-3 text-sm leading-relaxed text-ink">
                <Rich text={r.note} />
              </p>
            )}
            {teamShown && typeof s === 'number' && s !== r.teamTier && (
              <p className="mt-2 text-xs font-semibold text-ink-soft">
                You see yourself at {tier(s)?.short}; your team puts you at {tier(r.teamTier)?.short}.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
