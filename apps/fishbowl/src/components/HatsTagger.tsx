import { HATS, type HatScores } from '@fishbowl/feedback-core'
import { playTick } from '../lib/sound'
import InfoDot from './InfoDot'

// Pink ramp by distance from the ideal middle (1 = nearest, 4 = the out-of-balance pole).
const OFF_PINK = ['', '#f6cdda', '#efaac4', '#e486a6', '#d56690']
const STAR_BLUE = '#bcd6ef'
const SEGMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// Six rows, one per de Bono hat. Each box is tinted in that hat's (pastel) colour.
// A compact bipolar 1-9 picker (1 = too little, 5 = ideal/blue center, 9 = too much)
// with the hat's mode + too-little/too-much pole labels, and an ⓘ explaining each
// level. Used by the subject (self) and by colleagues (third-person framing).
export default function HatsTagger({
  value,
  onChange,
}: {
  value: HatScores
  onChange: (v: HatScores) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-snug text-ink-soft">
        Each hat works best in balance. The blue <span className="font-bold text-blue-deep">✦</span> in the middle is the
        ideal, not the most. Too little sits left, too much sits right.
      </p>
      {HATS.map((h) => (
        <div
          key={h.key}
          style={{ backgroundColor: h.tint }}
          className="rounded-2xl border-[2.5px] border-ink p-3 shadow-chunky-sm"
        >
          <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
            <span className="kicker text-ink-soft">
              {h.tooLittle}
              <InfoDot label={`More on too little ${h.mode}`}>
                <strong className="font-bold">Too little</strong> ({h.tooLittle}): {h.tooLittleInfo}
              </InfoDot>
            </span>
            <span className="kicker whitespace-nowrap text-center font-bold text-ink">{h.mode}</span>
            <span className="kicker text-right text-ink-soft">
              {h.tooMuch}
              <InfoDot label={`More on too much ${h.mode}`}>
                <strong className="font-bold">Too much</strong> ({h.tooMuch}): {h.tooMuchInfo}
              </InfoDot>
            </span>
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
                  aria-label={`${h.mode}: position ${s} of 9`}
                  onClick={() => {
                    playTick()
                    onChange({ ...value, [h.key]: s })
                  }}
                  style={selOff ? { backgroundColor: OFF_PINK[Math.abs(s - 5)] } : undefined}
                  className={`depress-sm relative grid h-11 flex-1 cursor-pointer place-items-center rounded-lg border-[2.5px] border-ink ${
                    center ? 'bg-blue sc-navy' : selOff ? 'sc-pink' : 'bg-paper-hi'
                  } ${isSel ? 'is-on' : ''}`}
                >
                  {center && (
                    <span className="text-base leading-none" style={{ color: STAR_BLUE }}>
                      ✦
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
