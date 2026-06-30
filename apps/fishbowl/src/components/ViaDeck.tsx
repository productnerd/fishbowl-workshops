import { VIA_STRENGTHS } from '@fishbowl/feedback-core'

type TeamStrength = { id: string; name: string; virtue: string; count: number }

const VIRTUES = [
  'Wisdom & Knowledge',
  'Courage',
  'Humanity',
  'Justice',
  'Temperance',
  'Transcendence',
]

// The team's top-5 character strengths fanned as a deck, each card carrying the
// share of colleagues who saw it. When the subject's own picks are present, we
// also split into matched (both), hidden (you saw, they didn't) and blind-spot
// (they saw, you didn't), plus a 6-virtue spread of where the team's picks land.
export default function ViaDeck({
  team,
  self,
  total,
  compact,
}: {
  team: TeamStrength[]
  self: string[] | null
  total: number
  compact?: boolean
}) {
  const teamHasData = team.length > 0
  const top = [...team].sort((a, b) => b.count - a.count).slice(0, 5)
  const pct = (c: number) => (total > 0 ? Math.round((c / total) * 100) : 0)
  const nameOf = (id: string) => VIA_STRENGTHS.find((s) => s.id === id)?.name ?? id

  const selfSet = self ? new Set(self) : null
  const teamSet = new Set(team.map((t) => t.id))

  const matched = selfSet ? [...selfSet].filter((id) => teamSet.has(id)) : []
  const hidden = selfSet ? [...selfSet].filter((id) => !teamSet.has(id)) : []
  const blindSpot = selfSet ? team.filter((t) => !selfSet.has(t.id)).map((t) => t.id) : []

  // Team picks per virtue, weighted by how many colleagues chose each strength.
  const byVirtue: Record<string, number> = {}
  for (const v of VIRTUES) byVirtue[v] = 0
  for (const t of team) byVirtue[t.virtue] = (byVirtue[t.virtue] ?? 0) + t.count
  const maxVirtue = Math.max(1, ...Object.values(byVirtue))

  // Subtle fan — small enough that rotated corners + the chunky shadow stay inside.
  const fan = [-2, -1, 0, 1, 2]

  return (
    <div className="flex flex-col gap-6">
      {/* Fanned top-5 deck — only when the team has weighed in */}
      {teamHasData && (
      <div>
        <p className="kicker mb-3 text-ink-soft">How your team reads you</p>
        <div className="flex flex-col gap-3">
          {top.map((s, i) => {
            const youToo = selfSet?.has(s.id)
            return (
            <div
              key={s.id}
              className="card-3d mx-auto w-[94%] bg-paper-hi p-4 text-ink"
              style={{ transform: `rotate(${fan[i] ?? 0}deg)` }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="kicker text-ink-soft">{s.virtue}</p>
                  <p className="font-display text-2xl font-black leading-tight text-ink">{s.name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-3xl font-black leading-none text-blue-deep">{pct(s.count)}%</p>
                </div>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-sand">
                <div className="h-full bg-blue" style={{ width: `${pct(s.count)}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink-soft">
                  {s.count} of {total} saw this in you
                </p>
                {youToo && (
                  <span className="shrink-0 rounded-full border-2 border-ink bg-pink px-2 py-0.5 text-xs font-bold text-ink sc-pink">
                    you picked this too
                  </span>
                )}
              </div>
            </div>
            )
          })}
        </div>
      </div>
      )}

      {selfSet && teamHasData && !compact && (
        <>
          {/* Self vs team mini-sections */}
          <div className="grid gap-3">
            <Section
              tone="blue"
              title="Matched"
              blurb="You and your team agree"
              items={matched.map(nameOf)}
              empty="No overlap yet — your picks and theirs point elsewhere."
            />
            <Section
              tone="pink"
              title="Hidden"
              blurb="You see it; the team hasn't named it"
              items={hidden.map(nameOf)}
              empty="Nothing hidden — everything you claimed, they saw too."
            />
            <Section
              tone="sand"
              title="Blind spot"
              blurb="The team sees it; you didn't claim it"
              items={blindSpot.map(nameOf)}
              empty="No blind spots — you named everything they did."
            />
          </div>

          {/* 6-virtue spread */}
          <div>
            <p className="kicker mb-3 text-ink-soft">Virtue spread</p>
            <div className="flex flex-col gap-2.5">
              {VIRTUES.map((v) => {
                const w = (byVirtue[v] / maxVirtue) * 100
                return (
                  <div key={v} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 text-sm font-semibold text-ink">{v}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-ink bg-paper-hi">
                      <div className="h-full bg-blue" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {selfSet && !teamHasData && (
        <Section
          tone="blue"
          title="Your signature strengths"
          blurb="The strengths you claimed"
          items={[...selfSet].map(nameOf)}
          empty="You didn't pick any."
        />
      )}
    </div>
  )
}

function Section({
  tone,
  title,
  blurb,
  items,
  empty,
}: {
  tone: 'blue' | 'pink' | 'sand'
  title: string
  blurb: string
  items: string[]
  empty: string
}) {
  const chip =
    tone === 'blue'
      ? 'bg-blue text-paper-hi sc-navy'
      : tone === 'pink'
        ? 'bg-pink text-ink sc-pink'
        : 'bg-sand text-ink'
  return (
    <div className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-4 shadow-chunky-sm">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="font-serif text-lg font-black text-ink">{title}</p>
        <p className="text-xs font-semibold text-ink-soft">{blurb}</p>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((name) => (
            <span
              key={name}
              className={`rounded-full border-2 border-ink px-3 py-1.5 text-sm font-bold ${chip}`}
            >
              {name}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm font-semibold text-ink-soft">{empty}</p>
      )}
    </div>
  )
}
