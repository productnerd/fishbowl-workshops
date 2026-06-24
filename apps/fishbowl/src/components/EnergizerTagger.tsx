import { ENERGIZER_ACTIVITIES, ENERGIZER_SCALE, type EnergizerTags } from '@fishbowl/feedback-core'
import { playTick } from '../lib/sound'

// A grid for tagging each activity on the −2…+2 energize/drain scale. Used by the
// subject (self) and by colleagues (third-person framing).
export default function EnergizerTagger({
  value,
  onChange,
}: {
  value: EnergizerTags
  onChange: (t: EnergizerTags) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {ENERGIZER_ACTIVITIES.map((a) => (
        <div key={a.id} className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-3 shadow-chunky-sm">
          <p className="mb-2 text-sm font-semibold text-ink">{a.label}</p>
          <div className="flex gap-1.5">
            {ENERGIZER_SCALE.map((s) => {
              const sel = value[a.id] === s.v
              return (
                <button
                  key={s.v}
                  type="button"
                  title={s.label}
                  onClick={() => {
                    playTick()
                    onChange({ ...value, [a.id]: s.v })
                  }}
                  className={`depress-sm grid h-11 flex-1 cursor-pointer place-items-center rounded-xl border-2 border-ink text-lg ${
                    sel ? 'bg-blue sc-navy is-on' : 'bg-sand'
                  }`}
                >
                  {s.emoji}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
