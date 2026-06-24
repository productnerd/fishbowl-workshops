import { HATS, type HatScores } from '@fishbowl/feedback-core'
import { playTick } from '../lib/sound'

// Pink ramp by distance from the ideal middle (1 = nearest, 4 = the out-of-balance pole).
const OFF_PINK = ['', '#f6cdda', '#efaac4', '#e486a6', '#d56690']
const STAR_BLUE = '#bcd6ef'
const SEGMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// Six rows, one per de Bono hat. Each is a compact bipolar 1-9 picker (1 = too
// little, 5 = ideal/blue center, 9 = too much) with the hat name + too-little/too-much
// pole labels. Used by the subject (self) and by colleagues (third-person framing).
export default function HatsTagger({
  value,
  onChange,
}: {
  value: HatScores
  onChange: (v: HatScores) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {HATS.map((h) => (
        <div key={h.key} className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-3 shadow-chunky-sm">
          <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
            <span className="kicker text-ink-soft">{h.tooLittle}</span>
            <span className="kicker whitespace-nowrap text-center text-ink">
              {h.name} · {h.mode}
            </span>
            <span className="kicker text-right text-ink-soft">{h.tooMuch}</span>
          </div>
          <div className="flex gap-1.5">
            {SEGMENTS.map((s) => {
              const isSel = value[h.key] === s
              const center = s === 5
              const selOff = isSel && !center
              return (
                <button
                  key={`${h.key}-${s}`}
                  type="button"
                  aria-label={`${h.name}: position ${s} of 9`}
                  onClick={() => {
                    playTick()
                    onChange({ ...value, [h.key]: s })
                  }}
                  style={selOff ? { backgroundColor: OFF_PINK[Math.abs(s - 5)] } : undefined}
                  className={`depress-sm relative grid h-11 flex-1 cursor-pointer place-items-center rounded-lg border-[2.5px] border-ink ${
                    center ? 'bg-blue sc-navy' : selOff ? 'sc-pink' : 'bg-sand'
                  } ${isSel ? 'is-on' : ''}`}
                >
                  {center && <span className="text-base leading-none" style={{ color: STAR_BLUE }}>✦</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
