// A yellow Post-it: typed notes-to-self of the tendencies, blind spots and biases to
// keep at the back of your mind. Monospace, small, like a jotted memo pinned up.
// `compact` shrinks it to sit in a dashboard column rather than own a whole slide.
export default function StickyNote({ bullets, compact = false }: { bullets: string[]; compact?: boolean }) {
  return (
    <div className={`flex justify-center ${compact ? 'py-1' : 'py-3'}`}>
      <div
        className={`relative w-full -rotate-1 rounded-[2px] bg-[#fbe79b] text-left ${
          compact ? 'p-4 pt-5 shadow-[5px_7px_0_0_rgba(42,36,32,0.22)]' : 'max-w-md p-8 pt-9 shadow-[8px_11px_0_0_rgba(42,36,32,0.24)]'
        }`}
      >
        {/* bit of tape */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 rotate-2 border border-ink/10 bg-[#efe3b4]/80 ${
            compact ? '-top-2.5 h-5 w-20' : '-top-3.5 h-7 w-28'
          }`}
        />
        <p
          className={`font-mono font-semibold uppercase tracking-wide text-ink/60 ${
            compact ? 'mb-2 text-xs' : 'mb-4 text-sm'
          }`}
        >
          keep in mind
        </p>
        <ul
          className={`font-mono flex flex-col text-ink ${
            compact ? 'gap-1.5 text-[0.72rem] leading-snug' : 'gap-2.5 text-[0.95rem] leading-relaxed'
          }`}
        >
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
