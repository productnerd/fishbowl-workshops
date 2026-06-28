import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

// A small ⓘ with a popover. Hover (desktop) or tap (mobile). The popover is rendered
// in a portal with fixed positioning so it floats ABOVE the card and is never clipped
// by the card's scroll area; it centers on the icon and clamps into the viewport.
// Inherits the surrounding text colour for the icon.
export default function InfoDot({ children, label = "What's this?" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !popRef.current) return
    const b = btnRef.current.getBoundingClientRect()
    const p = popRef.current.getBoundingClientRect()
    const pad = 8
    const left = Math.max(pad, Math.min(b.left + b.width / 2 - p.width / 2, window.innerWidth - pad - p.width))
    // Prefer above the icon; flip below if there isn't room.
    const top = b.top - p.height - 8 >= pad ? b.top - p.height - 8 : b.bottom + 8
    setPos({ left, top })
  }, [open])

  // Close on any scroll (capture catches the card's own scroll) or resize, so the
  // fixed popover never detaches from its trigger.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <span className="relative inline-block align-middle">
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1 inline-grid h-4 w-4 cursor-help place-items-center rounded-full border border-current align-middle text-[10px] font-bold leading-none opacity-60 hover:opacity-100"
      >
        i
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: 'fixed', left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
            className="z-50 w-60 max-w-[calc(100vw-1rem)] rounded-xl border-2 border-ink bg-paper-hi px-3 py-2.5 text-left text-xs font-medium normal-case leading-snug tracking-normal text-ink shadow-chunky-sm"
          >
            {children}
          </div>,
          document.body,
        )}
    </span>
  )
}
