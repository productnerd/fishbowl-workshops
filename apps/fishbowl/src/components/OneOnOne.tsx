// Talking points to bring to a routine 1:1 with your manager, so the report's
// weaknesses/gaps actually get actioned. Each is an "Ask" (a question) or a "Share".
export default function OneOnOne({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.filter(Boolean).map((t, i) => {
        const isAsk = /^\s*ask\b/i.test(t)
        const body = t.replace(/^\s*(ask|share)\s*[:.\-–]?\s*/i, '')
        return (
          <li key={i} className="flex items-start gap-3 rounded-2xl border-[2.5px] border-ink bg-paper-hi p-3.5 shadow-chunky-sm">
            <span
              className={`mt-0.5 shrink-0 rounded-full border-2 border-ink px-2.5 py-1 text-[10px] font-black tracking-wide ${
                isAsk ? 'bg-blue text-paper-hi' : 'bg-pink text-ink'
              }`}
            >
              {isAsk ? 'ASK' : 'SHARE'}
            </span>
            <span className="leading-snug text-ink">{body}</span>
          </li>
        )
      })}
    </ul>
  )
}
