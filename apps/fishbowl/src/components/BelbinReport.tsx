import { BELBIN_ROLES, CLUSTER_TONE } from '@fishbowl/feedback-core'

type TeamRole = { key: string; name: string; cluster: string; teamShare: number; n: number }

// Full static class strings per cluster tone so the Tailwind JIT scanner keeps
// them. CLUSTER_TONE maps Thinking->blue, Action->pink, People->sand-deep.
const TONE_BAR: Record<string, string> = {
  blue: 'bg-blue',
  pink: 'bg-pink',
  'sand-deep': 'bg-sand-deep',
}
const TONE_DOT: Record<string, string> = {
  blue: 'bg-blue',
  pink: 'bg-pink',
  'sand-deep': 'bg-sand-deep',
}

// Ranked share bar of the nine Belbin roles (width ∝ team chip share), colored by
// cluster. The team's top roles are emphasized as the subject's "signature" roles.
// When the subject's own allocation is present, each row also shows the subject's
// share as a pink marker, plus a one-line alignment note.
export default function BelbinReport({
  team,
  self,
}: {
  team: TeamRole[]
  self: Record<string, number> | null
}) {
  const rows = [...team].sort((a, b) => b.teamShare - a.teamShare)
  const maxShare = Math.max(0.0001, ...rows.map((r) => r.teamShare))
  const shortOf = (key: string) => BELBIN_ROLES.find((role) => role.key === key)?.short ?? ''

  // Normalize the subject's raw chip allocation to per-role shares.
  const selfTotal = self ? Object.values(self).reduce((s, v) => s + (v || 0), 0) : 0
  const selfShare = (key: string): number | null => {
    if (!self || selfTotal <= 0) return null
    return (self[key] || 0) / selfTotal
  }

  // Alignment = 1 − ½·Σ|self_share − team_share|, over all nine roles. 1 = identical
  // reads, 0 = no overlap. Only meaningful when the subject has allocated.
  const alignment =
    self && selfTotal > 0
      ? 1 -
        0.5 *
          BELBIN_ROLES.reduce((acc, role) => {
            const t = team.find((r) => r.key === role.key)?.teamShare ?? 0
            const s = (self[role.key] || 0) / selfTotal
            return acc + Math.abs(s - t)
          }, 0)
      : null

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => {
        const tone = CLUSTER_TONE[r.cluster] ?? 'blue'
        const signature = i < 3 && r.teamShare > 0
        const s = selfShare(r.key)
        return (
          <div
            key={r.key}
            className={`rounded-2xl border-[2.5px] border-ink bg-paper-hi p-3 ${
              signature ? 'shadow-chunky-sm' : ''
            }`}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className={`inline-block h-3 w-3 rounded-full border-2 border-ink ${TONE_DOT[tone]}`} />
                {r.name}
                {signature && <span className="kicker text-pink-deep">signature</span>}
              </span>
              <span className="font-mono text-xs font-semibold text-ink-soft">
                {Math.round(r.teamShare * 100)}%
              </span>
            </div>
            <div className="relative h-4 rounded-full border-2 border-ink bg-paper-hi">
              <div
                className={`absolute left-0 top-0 h-full rounded-full ${TONE_BAR[tone]} ${
                  signature ? '' : 'opacity-70'
                }`}
                style={{ width: `${(r.teamShare / maxShare) * 100}%` }}
                title={`team ${Math.round(r.teamShare * 100)}%`}
              />
              {typeof s === 'number' && (
                <div
                  className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-pink sc-pink"
                  style={{ left: `${Math.min(100, (s / maxShare) * 100)}%` }}
                  title={`you ${Math.round(s * 100)}%`}
                />
              )}
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">{shortOf(r.key)}</p>
          </div>
        )
      })}

      <div className="mt-1 flex flex-wrap gap-4 text-xs font-semibold text-ink-soft">
        {(['Thinking', 'Action', 'People'] as const).map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span
              className={`inline-block h-3 w-3 rounded-full border-2 border-ink ${TONE_DOT[CLUSTER_TONE[c]]}`}
            />
            {c}
          </span>
        ))}
        {self && selfTotal > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-pink" /> you
          </span>
        )}
      </div>

      {alignment !== null && (
        <div className="rounded-2xl border-[2.5px] border-ink bg-sand p-3 shadow-chunky-sm sc-pink">
          <p className="kicker text-pink-deep">Alignment</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {Math.round(alignment * 100)}% in sync with how your team reads you
            {alignment >= 0.75
              ? ' — you and your team see your role the same way.'
              : alignment >= 0.5
                ? ' — broadly aligned, with a few roles you each weigh differently.'
                : ' — you and your team picture your contribution quite differently.'}
          </p>
        </div>
      )}
    </div>
  )
}
