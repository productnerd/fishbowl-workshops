import { playTick } from '../lib/sound'

// A generic point/chip allocator: one row per bucket with a −/+ stepper and a
// sticky budget meter. Used by SDT "What You Fuel" (20 points / 6 needs) and
// Belbin (20 chips / 9 roles). Controlled via { value, onChange }. Under-spending
// and lopsided allocations are allowed; the sum can never exceed total.
export default function AllocationTagger({
  buckets,
  total,
  value,
  onChange,
}: {
  buckets: { key: string; label: string; sub?: string }[]
  total: number
  value: Record<string, number>
  onChange: (v: Record<string, number>) => void
}) {
  const spent = buckets.reduce((sum, b) => sum + (value[b.key] ?? 0), 0)
  const remaining = total - spent

  const set = (key: string, next: number) => {
    playTick()
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-2 z-10 flex items-center justify-between rounded-2xl border-[2.5px] border-ink bg-blue px-4 py-3 text-paper-hi shadow-chunky-sm sc-navy">
        <span className="kicker text-paper-hi/80">Spent</span>
        <span className="font-display text-2xl font-black leading-none">
          {spent} <span className="text-paper-hi/70">/ {total}</span>
        </span>
      </div>

      {/* How-to: the meter shows state, this explains the action. */}
      <p className="-mt-1 text-center text-sm leading-snug text-ink-soft">
        Tap <span className="font-bold text-ink">+</span> to add points to what fits most.
        Give more where it fits more; you can leave some unspent.
      </p>

      {buckets.map((b) => {
        const n = value[b.key] ?? 0
        const canInc = remaining > 0
        const canDec = n > 0
        return (
          <div
            key={b.key}
            className="flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-paper-hi p-3 shadow-chunky-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{b.label}</p>
              {b.sub && <p className="text-xs text-ink-soft">{b.sub}</p>}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Remove a point from ${b.label}`}
                disabled={!canDec}
                onClick={() => set(b.key, n - 1)}
                className="depress-sm grid h-10 w-10 cursor-pointer place-items-center rounded-xl border-2 border-ink bg-sand text-xl font-black text-ink disabled:opacity-40 disabled:pointer-events-none"
              >
                −
              </button>
              <span className="w-7 text-center font-display text-xl font-black tabular-nums text-ink">{n}</span>
              <button
                type="button"
                aria-label={`Add a point to ${b.label}`}
                disabled={!canInc}
                onClick={() => set(b.key, n + 1)}
                className="depress-sm grid h-10 w-10 cursor-pointer place-items-center rounded-xl border-2 border-ink bg-blue text-xl font-black text-paper-hi sc-navy disabled:opacity-40 disabled:pointer-events-none"
              >
                +
              </button>
            </div>
          </div>
        )
      })}

      <p className="text-center text-xs font-semibold text-ink-soft">
        {remaining > 0
          ? `${remaining} left to spend (you can leave some unspent)`
          : 'All spent'}
      </p>
    </div>
  )
}
