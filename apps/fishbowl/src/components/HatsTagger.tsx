import { useState } from 'react'
import { HATS, type HatScores } from '@fishbowl/feedback-core'
import { playTick } from '../lib/sound'

// Pink ramp by distance from the ideal middle (1 = nearest, 4 = the out-of-balance pole).
const OFF_PINK = ['', '#f6cdda', '#efaac4', '#e486a6', '#d56690']
const STAR_BLUE = '#bcd6ef'
const SEGMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// A small ⓘ that explains what too little / ideal / too much look like for a hat,
// so people can grade fairly. Hover (desktop) or tap.
function HatInfo({ mode, tooLittle, ideal, tooMuch }: { mode: string; tooLittle: string; ideal: string; tooMuch: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        aria-label={`What ${mode} looks like at each level`}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1.5 inline-grid h-4 w-4 cursor-help place-items-center rounded-full border border-current align-middle text-[10px] font-bold leading-none text-ink-soft opacity-70 hover:opacity-100"
      >
        i
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-xl border-2 border-ink bg-paper-hi px-3 py-2.5 text-left text-xs font-medium normal-case leading-snug tracking-normal text-ink shadow-chunky-sm">
          <span className="block">
            <strong className="font-bold">Too little:</strong> {tooLittle}
          </span>
          <span className="mt-1.5 block">
            <strong className="font-bold">Ideal:</strong> {ideal}
          </span>
          <span className="mt-1.5 block">
            <strong className="font-bold">Too much:</strong> {tooMuch}
          </span>
        </span>
      )}
    </span>
  )
}

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
            <span className="kicker text-ink-soft">{h.tooLittle}</span>
            <span className="kicker flex items-center justify-center whitespace-nowrap text-center text-ink">
              {h.mode}
              <HatInfo mode={h.mode} tooLittle={h.tooLittle} ideal={h.ideal} tooMuch={h.tooMuch} />
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
