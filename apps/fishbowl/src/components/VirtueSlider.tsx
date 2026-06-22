import { motion } from 'framer-motion'

const SEGMENTS = [1, 2, 3, 4, 5]

// Bipolar Aristotelian slider: 1 & 5 are vices, 3 (the middle) is the virtue.
export default function VirtueSlider({
  value,
  onChange,
  virtueLabel,
  deficientLabel,
  excessiveLabel,
  id,
}: {
  value: number | null
  onChange?: (v: number) => void
  virtueLabel: string
  deficientLabel: string
  excessiveLabel: string
  id?: string
}) {
  return (
    <div className="w-full select-none">
      <div className="mb-2.5 grid grid-cols-[1fr_auto_1fr] items-baseline gap-2">
        <span className="text-[13px] font-semibold text-ink-soft">{deficientLabel}</span>
        <span className="kicker whitespace-nowrap text-center text-ink">{virtueLabel}</span>
        <span className="text-right text-[13px] font-semibold text-ink-soft">{excessiveLabel}</span>
      </div>

      <div className="card-3d flex gap-2 bg-sand p-2.5">
        {SEGMENTS.map((s) => {
          const selected = value === s
          const isCenter = s === 3
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange?.(s)}
              aria-label={`Position ${s} of 5`}
              className={`depress-sm relative h-14 flex-1 cursor-pointer rounded-2xl border-[2.5px] border-ink ${
                selected ? 'bg-red is-on' : isCenter ? 'bg-cyan/35' : 'bg-paper-hi'
              }`}
            >
              {isCenter && !selected && (
                <span className="absolute inset-0 grid place-items-center text-lg leading-none text-cyan-deep">✦</span>
              )}
              {selected && (
                <motion.span
                  layoutId={id ? `peg-${id}` : undefined}
                  className="absolute inset-[5px] rounded-xl border-2 border-paper-hi bg-ink"
                />
              )}
            </button>
          )
        })}
      </div>

    </div>
  )
}
