import { useState } from 'react'

// Talking points to bring to a routine 1:1 with your manager, so the report's
// weaknesses/gaps actually get actioned. Each is an "Ask" (a question) or a "Share".
export default function OneOnOne({ items }: { items: string[] }) {
  const [copied, setCopied] = useState(false)

  const parse = (t: string) => {
    const isAsk = /^\s*ask\b/i.test(t)
    const body = t.replace(/^\s*(ask|share)\s*[:.\-–]?\s*/i, '').replace(/\*\*/g, '')
    return { isAsk, body }
  }

  const copy = () => {
    const text =
      'For my next 1:1\n\n' +
      items
        .filter(Boolean)
        .map((t) => {
          const { isAsk, body } = parse(t)
          return `${isAsk ? '[Ask]' : '[Share]'} ${body}`
        })
        .join('\n')
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      },
      () => {}
    )
  }

  return (
    <div>
      <ul className="flex flex-col gap-3">
        {items.filter(Boolean).map((t, i) => {
          const { isAsk, body } = parse(t)
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

      <button
        onClick={copy}
        className="press mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3 font-display font-black text-ink shadow-chunky-sm"
      >
        {copied ? 'Copied ✓' : '📋 Copy these points'}
      </button>
    </div>
  )
}
