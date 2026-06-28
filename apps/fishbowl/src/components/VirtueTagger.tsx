import { VIRTUES, type VirtueScores } from '@fishbowl/feedback-core'
import { playTick } from '../lib/sound'

// Pink ramp by distance from the virtuous middle (1 = nearest, 4 = the vice pole).
const VICE_PINK = ['', '#f6cdda', '#efaac4', '#e486a6', '#d56690']
const STAR_BLUE = '#bcd6ef'
const SEGMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// Ten compact bipolar 1-9 pickers, one per virtue (5 = the balanced virtue, the
// blue center; the ends are the two vices). The subject rates where they land so the
// report can overlay their read on the team's.
export default function VirtueTagger({
  value,
  onChange,
}: {
  value: VirtueScores
  onChange: (v: VirtueScores) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-snug text-ink-soft">
        For each one the blue <span className="font-bold text-blue-deep">✦</span> middle is the balanced sweet spot. The
        two ends are the ways it can tip too far.
      </p>
      {VIRTUES.map((v) => (
        <div key={v.dimension} className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-3 shadow-chunky-sm">
          <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
            <span className="kicker text-ink-soft">{v.deficientPole}</span>
            <span className="kicker whitespace-nowrap text-center text-ink">{v.name}</span>
            <span className="kicker text-right text-ink-soft">{v.excessivePole}</span>
          </div>
          <div className="flex gap-1.5">
            {SEGMENTS.map((s) => {
              const isSel = value[v.dimension] === s
              const center = s === 5
              const selOff = isSel && !center
              return (
                <button
                  key={`${v.dimension}-${s}`}
                  type="button"
                  aria-label={`${v.name}: position ${s} of 9`}
                  onClick={() => {
                    playTick()
                    onChange({ ...value, [v.dimension]: s })
                  }}
                  style={selOff ? { backgroundColor: VICE_PINK[Math.abs(s - 5)] } : undefined}
                  className={`depress-sm relative grid h-10 flex-1 cursor-pointer place-items-center rounded-lg border-[2.5px] border-ink ${
                    center ? 'bg-blue sc-navy' : selOff ? 'sc-pink' : 'bg-sand'
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
