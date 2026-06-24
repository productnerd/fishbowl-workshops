import { RESPONSIBILITY_TIERS, type ResponsibilityTiers } from '@fishbowl/feedback-core'
import { playTick } from '../lib/sound'

// Colleagues tier each of the subject's responsibilities. The "—" clears a row
// (Haven't seen enough → excluded from the tally).
export default function TierTagger({
  items,
  value,
  onChange,
}: {
  items: string[]
  value: ResponsibilityTiers
  onChange: (t: ResponsibilityTiers) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((label, i) => (
        <div key={i} className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-3 shadow-chunky-sm">
          <p className="mb-2 text-sm font-semibold text-ink">{label}</p>
          <div className="flex gap-1.5">
            {RESPONSIBILITY_TIERS.map((t) => {
              const sel = value[i] === t.v
              return (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => {
                    playTick()
                    onChange({ ...value, [i]: t.v })
                  }}
                  className={`depress-sm flex-1 cursor-pointer rounded-xl border-2 border-ink py-2 text-xs font-bold ${
                    sel ? 'bg-blue text-paper-hi sc-navy is-on' : 'bg-sand text-ink'
                  }`}
                >
                  {t.emoji} {t.short}
                </button>
              )
            })}
            <button
              type="button"
              title="Haven't seen enough"
              onClick={() => {
                const v = { ...value }
                delete v[i]
                onChange(v)
              }}
              className="depress-sm cursor-pointer rounded-xl border-2 border-ink bg-paper-hi px-3 py-2 text-xs font-bold text-ink-soft"
            >
              —
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
