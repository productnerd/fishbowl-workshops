// A yellow Post-it: handwritten notes-to-self of the tendencies, blind spots and
// biases to keep at the back of your mind. Deliberately scrappy and human.
export default function StickyNote({ bullets }: { bullets: string[] }) {
  return (
    <div className="flex justify-center py-3">
      <div className="relative w-full max-w-sm -rotate-1 rounded-[2px] bg-[#fbe79b] p-6 pt-8 shadow-[7px_9px_0_0_rgba(42,36,32,0.22)]">
        {/* bit of tape */}
        <div className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-2 border border-ink/10 bg-[#efe3b4]/80" />
        <p className="handwritten mb-2 text-[1.55rem] font-bold leading-none text-ink/80">keep in mind…</p>
        <ul className="handwritten flex flex-col gap-1.5 text-[1.5rem] leading-tight text-ink">
          {bullets.filter(Boolean).map((b, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden>–</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
