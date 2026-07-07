import { useState } from 'react'
import { motion } from 'framer-motion'
import { rowItem } from '../lib/motion'
import Rich from './Rich'

// The action plan as tickable to-do cards. Checked state is local/ephemeral — it's a
// nudge to act, not persisted. tone colours the check (stop = pink, start = blue).
export default function TodoList({ items, tone }: { items: string[]; tone: 'stop' | 'start' }) {
  const [done, setDone] = useState<Set<number>>(new Set())
  const toggle = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  const fill = tone === 'stop' ? 'bg-pink' : 'bg-blue'

  const row = (t: string, i: number) => {
    const on = done.has(i)
    return (
      <button
        key={i}
        onClick={() => toggle(i)}
        className={`press flex w-full items-center gap-3 rounded-xl border-[2.5px] border-ink bg-paper-hi px-3.5 py-3 text-left shadow-chunky-sm ${on ? 'opacity-55' : ''}`}
      >
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink text-sm font-black text-ink ${on ? fill : 'bg-transparent'}`}>
          {on ? '✓' : ''}
        </span>
        <span className={`leading-snug text-ink ${on ? 'line-through' : ''}`}>
          <Rich text={t} />
        </span>
      </button>
    )
  }

  // Two of these lists share one 'stagger' slide, so stagger 3 rows each and land
  // any tail together as a single final child.
  const rows = items.filter(Boolean)
  const head = rows.slice(0, 3)
  const tail = rows.slice(3)

  return (
    <ul className="flex flex-col gap-2">
      {head.map((t, i) => (
        <motion.li key={i} variants={rowItem}>
          {row(t, i)}
        </motion.li>
      ))}
      {tail.length > 0 && (
        <motion.li variants={rowItem} className="flex flex-col gap-2">
          {tail.map((t, i) => row(t, i + 3))}
        </motion.li>
      )}
    </ul>
  )
}
