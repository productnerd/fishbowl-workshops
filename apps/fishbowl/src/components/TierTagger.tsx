import { RESPONSIBILITY_TIERS, type ResponsibilityTiers } from '@fishbowl/feedback-core'
import { playTick } from '../lib/sound'

// The verbal prompt adapts to the tier the colleague picked.
const NOTE_PROMPT: Record<number, string> = {
  3: 'How do they exceed or delight here? (a few words)',
  2: 'What would take this from good to great?',
  1: 'Where do they fall short, specifically?',
}

// Colleagues tier each of the subject's responsibilities AND, in their own words,
// say how they exceed/delight or where they fall short. The "—" clears the tier
// (Haven't seen enough → excluded from the tally).
export default function TierTagger({
  items,
  value,
  notes,
  onChange,
  onNotesChange,
}: {
  items: string[]
  value: ResponsibilityTiers
  notes: Record<number, string>
  onChange: (t: ResponsibilityTiers) => void
  onNotesChange: (n: Record<number, string>) => void
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
          {(value[i] === 3 || value[i] === 1) && (
            <textarea
              value={notes[i] ?? ''}
              onChange={(e) => onNotesChange({ ...notes, [i]: e.target.value })}
              rows={2}
              maxLength={280}
              placeholder={NOTE_PROMPT[value[i]]}
              className="mt-2 w-full resize-none rounded-xl border-2 border-ink bg-sand px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft/60 focus:bg-paper-hi"
            />
          )}
        </div>
      ))}
    </div>
  )
}
