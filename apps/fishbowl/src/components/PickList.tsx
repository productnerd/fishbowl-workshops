import { playTick } from '../lib/sound'

// A single-select vertical list of labeled options, used by the self-flow's lighter
// picks (love language, conflict repair, what makes you feel most alive). Tapping an
// option selects it; tapping the selected one clears it. Controlled via { value, onChange }.
export default function PickList({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => {
        const sel = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={sel}
            onClick={() => {
              playTick()
              onChange(sel ? '' : o.id)
            }}
            className={`depress-sm cursor-pointer rounded-2xl border-[2.5px] border-ink px-4 py-3 text-left text-sm font-bold shadow-chunky-sm ${
              sel ? 'bg-blue text-paper-hi sc-navy is-on' : 'bg-paper-hi text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
