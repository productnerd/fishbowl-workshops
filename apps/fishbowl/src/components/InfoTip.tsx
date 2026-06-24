import { useState } from 'react'

// A small ⓘ that explains the theory behind a section. Hover (desktop) or tap (mobile).
export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        aria-label="What's this?"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1 inline-grid h-4 w-4 cursor-help place-items-center rounded-full border border-current align-middle text-[10px] font-bold leading-none opacity-60 hover:opacity-100"
      >
        i
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-xl border-2 border-ink bg-paper-hi px-3 py-2 text-left text-xs font-medium normal-case leading-snug tracking-normal text-ink shadow-chunky-sm">
          {text}
        </span>
      )}
    </span>
  )
}
