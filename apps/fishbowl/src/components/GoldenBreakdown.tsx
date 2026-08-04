import type { Golden } from '../lib/goldenScore'

// The sixteen dimensions behind the Golden Score, shown as the score actually sees them:
// each one's blended 1-9 position against the virtuous middle (5). Sorted closest-to-the-
// mean first, so the top of each list is what is pulling the score up and the bottom is
// what is dragging it down.
export default function GoldenBreakdown({ golden }: { golden: Golden }) {
  const band = (mu: number) => (Math.abs(mu - 5) < 0.75 ? 'on the mean' : mu > 5 ? 'runs hot' : 'runs cold')

  const group = (title: string, kind: 'virtue' | 'hat') => {
    const list = golden.items.filter((i) => i.kind === kind).sort((a, b) => b.goodness - a.goodness)
    if (list.length === 0) return null
    return (
      <div>
        <p className="kicker mb-2 text-ink-soft">{title}</p>
        <div className="flex flex-col gap-2">
          {list.map((i) => (
            <div key={i.key} className="rounded-2xl border-2 border-ink bg-paper-hi p-3">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-ink">{i.label}</span>
                <span className="shrink-0 font-mono text-xs text-ink-soft">
                  {i.mu.toFixed(1)} / 9 · {band(i.mu)}
                </span>
              </div>
              {/* The 1-9 track, with the golden mean marked dead centre. */}
              <div className="relative h-2.5 rounded-full border-2 border-ink bg-sand">
                <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-ink/40" />
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink"
                  style={{ left: `${((i.mu - 1) / 8) * 100}%`, background: i.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-snug text-ink-soft">
        Every dimension sits on a 1 to 9 scale where the middle is the virtue, and each end is a way to overdo or
        underdo it. The dot is where you land, your read blended with your team&rsquo;s. The line down the middle is
        the golden mean.
      </p>
      {group('the ten virtues', 'virtue')}
      {group('the six thinking hats', 'hat')}
    </div>
  )
}
