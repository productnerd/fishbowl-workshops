import { useState } from 'react'
import Rich from './Rich'

// The "level-up" half of the action plan: extra stops/starts to add once the first set
// is a habit. Collapsed by default behind a toggle so the screen leads with THIS week.
export default function LaterToggle({ stop, start }: { stop: string[]; start: string[] }) {
  const [open, setOpen] = useState(false)
  const bullets = (items: string[]) => (
    <ul className="mt-1 flex flex-col gap-1.5">
      {items.filter(Boolean).map((t, i) => (
        <li key={i} className="flex gap-2 text-sm leading-snug text-ink">
          <span className="text-ink/40">-</span>
          <span>
            <Rich text={t} />
          </span>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border-2 border-ink/40 bg-paper-hi/60">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="press flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="kicker text-ink-soft">then, once those stick</span>
        <span className={`text-sm text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="kicker text-pink-deep/80">also stop</p>
          {bullets(stop)}
          <p className="kicker mt-3 text-blue-deep/80">also start</p>
          {bullets(start)}
        </div>
      )}
    </div>
  )
}
