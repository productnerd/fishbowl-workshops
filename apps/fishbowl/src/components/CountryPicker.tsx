import { useState, useRef, useEffect } from 'react'

const COUNTRIES = [
  'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium', 'Brazil', 'Bulgaria', 'Canada', 'Chile', 'China',
  'Colombia', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Egypt', 'Estonia', 'Finland', 'France', 'Germany',
  'Ghana', 'Greece', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Jordan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg', 'Malaysia', 'Malta',
  'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Qatar', 'Romania', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'South Africa',
  'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Uruguay', 'Vietnam',
]

// Type-to-filter country combobox. The parent stores the string; free text is allowed,
// but the list narrows as you type and a click fills it exactly.
export default function CountryPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const q = value.trim().toLowerCase()
  const matches = (q ? COUNTRIES.filter((c) => c.toLowerCase().includes(q)) : COUNTRIES).slice(0, 7)

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Country (type to search)"
        className="w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-left text-base text-ink shadow-chunky-sm outline-none placeholder:text-ink-soft/55 focus:shadow-chunky"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-30 mt-1.5 max-h-56 w-full overflow-auto rounded-2xl border-[2.5px] border-ink bg-paper-hi shadow-chunky">
          {matches.map((c) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => {
                  onChange(c)
                  setOpen(false)
                }}
                className="w-full cursor-pointer px-5 py-2.5 text-left text-ink hover:bg-sand"
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
