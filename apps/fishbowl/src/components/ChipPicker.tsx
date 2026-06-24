import { playTick } from '../lib/sound'

// A generic multi-select chip grid with a min/max budget. Used by VIA (pick
// exactly 5 of 24) and Johari (soft-floor 5 / hard-cap 10 of 56). Controlled via
// { value, onChange }. At the cap, unselected chips are disabled; selected chips
// stay tappable so the subject can swap. Optional group sub-headers.
export default function ChipPicker({
  options,
  min,
  max,
  value,
  onChange,
}: {
  options: { id: string; label: string; group?: string }[]
  min: number
  max: number
  value: string[]
  onChange: (v: string[]) => void
}) {
  const atMax = value.length >= max

  const toggle = (id: string) => {
    playTick()
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  // Preserve option order while grouping; only render headers if any group is set.
  const hasGroups = options.some((o) => o.group)
  const groups: { group?: string; items: typeof options }[] = []
  for (const o of options) {
    const last = groups[groups.length - 1]
    if (last && last.group === o.group) last.items.push(o)
    else groups.push({ group: o.group, items: [o] })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-2 z-10 flex items-center justify-between rounded-2xl border-[2.5px] border-ink bg-blue px-4 py-3 text-paper-hi shadow-chunky-sm sc-navy">
        <span className="kicker text-paper-hi/80">Picked</span>
        <span className="font-display text-2xl font-black leading-none">
          {value.length} <span className="text-paper-hi/70">/ {max}</span>
        </span>
      </div>

      {groups.map((g, gi) => (
        <div key={gi} className="flex flex-col gap-2">
          {hasGroups && g.group && <p className="kicker text-ink-soft">{g.group}</p>}
          <div className="flex flex-wrap gap-2">
            {g.items.map((o) => {
              const sel = value.includes(o.id)
              const locked = atMax && !sel
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={sel}
                  disabled={locked}
                  onClick={() => toggle(o.id)}
                  className={`depress-sm cursor-pointer rounded-full border-2 border-ink px-4 py-2 text-sm font-bold ${
                    sel ? 'bg-blue text-paper-hi sc-navy is-on' : 'bg-paper-hi text-ink'
                  } ${locked ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <p className="text-center text-xs font-semibold text-ink-soft">
        {value.length < min ? `Pick at least ${min}` : atMax ? 'That’s your max' : `Pick up to ${max}`}
      </p>
    </div>
  )
}
