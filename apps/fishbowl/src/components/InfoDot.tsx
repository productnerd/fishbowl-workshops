import { useState, useRef, useLayoutEffect } from 'react'
import type { ReactNode } from 'react'

// A small ⓘ with a popover. Hover (desktop) or tap (mobile). The popover is centered
// on the icon but clamps itself into the viewport so it never clips off the edge on
// narrow screens. Inherits the surrounding text colour for the icon.
export default function InfoDot({ children, label = "What's this?" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false)
  const [dx, setDx] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    if (!open) {
      setDx(0)
      return
    }
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pad = 8
    if (r.right > window.innerWidth - pad) setDx(window.innerWidth - pad - r.right)
    else if (r.left < pad) setDx(pad - r.left)
  }, [open])
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1 inline-grid h-4 w-4 cursor-help place-items-center rounded-full border border-current align-middle text-[10px] font-bold leading-none opacity-60 hover:opacity-100"
      >
        i
      </button>
      {open && (
        <span
          ref={ref}
          style={{ transform: `translateX(calc(-50% + ${dx}px))` }}
          className="absolute bottom-full left-1/2 z-30 mb-2 w-60 max-w-[calc(100vw-1rem)] rounded-xl border-2 border-ink bg-paper-hi px-3 py-2.5 text-left text-xs font-medium normal-case leading-snug tracking-normal text-ink shadow-chunky-sm"
        >
          {children}
        </span>
      )}
    </span>
  )
}
