// A yellow Post-it: typed notes-to-self of the tendencies, blind spots and biases to
// keep at the back of your mind. Monospace, small, like a jotted memo pinned up.
export default function StickyNote({ bullets }: { bullets: string[] }) {
  return (
    <div className="flex justify-center py-3">
      <div className="relative w-full max-w-md -rotate-1 rounded-[2px] bg-[#fbe79b] p-8 pt-9 text-left shadow-[8px_11px_0_0_rgba(42,36,32,0.24)]">
        {/* bit of tape */}
        <div className="absolute -top-3.5 left-1/2 h-7 w-28 -translate-x-1/2 rotate-2 border border-ink/10 bg-[#efe3b4]/80" />
        <p className="font-mono mb-4 text-sm font-semibold uppercase tracking-wide text-ink/60">keep in mind</p>
        <ul className="font-mono flex flex-col gap-2.5 text-[0.95rem] leading-relaxed text-ink">
          {bullets.filter(Boolean).map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-ink/40" aria-hidden>-</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
