import { CANDOR_ITEMS, type CandorAnswers } from '@fishbowl/feedback-core'
import { playTick } from '../lib/sound'

const STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// Six compact 1–9 likert rows, 3 per axis (Care / Challenge). Used by the subject
// (self) and by colleagues — {name} interpolates into each item's prompt. Controlled.
export default function CandorTagger({
  name,
  value,
  onChange,
  lens = 'work',
}: {
  name: string
  value: CandorAnswers
  onChange: (v: CandorAnswers) => void
  lens?: 'work' | 'personal'
}) {
  return (
    <div className="flex flex-col gap-3">
      {CANDOR_ITEMS.map((item) => (
        <div key={item.id} className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-3 shadow-chunky-sm">
          <p className="mb-2 text-sm font-semibold text-ink">
            {((lens === 'personal' && item.personalText) || item.text).replace('{name}', name)}
          </p>
          <div className="flex gap-1">
            {STEPS.map((s) => {
              const sel = value[item.id] === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    playTick()
                    onChange({ ...value, [item.id]: s })
                  }}
                  className={`depress-sm grid h-10 flex-1 cursor-pointer place-items-center rounded-lg border-2 border-ink text-sm font-bold ${
                    sel ? 'bg-blue text-paper-hi sc-navy is-on' : 'bg-sand text-ink-soft/70'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
