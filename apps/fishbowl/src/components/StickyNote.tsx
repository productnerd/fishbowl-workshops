// A yellow Post-it: typed notes-to-self of the tendencies, blind spots and biases to
// keep at the back of your mind. Monospace, small, like a jotted memo pinned up.
export default function StickyNote({ bullets }: { bullets: string[] }) {
  return (
    <div className="flex justify-center py-3">
      <div className="relative w-full max-w-sm -rotate-1 rounded-[2px] bg-[#fbe79b] p-6 pt-7 shadow-[7px_9px_0_0_rgba(42,36,32,0.22)]">
        {/* bit of tape */}
        <div className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-2 border border-ink/10 bg-[#efe3b4]/80" />
        <p className="font-mono mb-3 text-xs font-semibold uppercase tracking-wide text-ink/60">keep in mind</p>
        <ul className="font-mono flex flex-col gap-2 text-[0.8rem] leading-relaxed text-ink">
          {bullets.filter(Boolean).map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-ink/40" aria-hidden>–</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
