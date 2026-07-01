import Rich from './Rich'

// Team-named strengths, ranked. Visual weight = rank: #1 is a big card, #2/#3 medium,
// #4/#5 compact rows — a "podium" without literal bars, so all five fit and stay
// scannable. Caller passes them already ordered strongest-first.
export default function StrengthsPodium({ strengths }: { strengths: { label: string; blurb: string }[] }) {
  const s = strengths.filter((x) => x?.label).slice(0, 5)
  if (!s.length) return null

  const Badge = ({ n, size }: { n: number; size: 'lg' | 'md' | 'sm' }) => {
    const cls = size === 'lg' ? 'h-10 w-10 text-xl' : size === 'md' ? 'h-8 w-8 text-base' : 'h-7 w-7 text-sm'
    return (
      <span className={`grid shrink-0 place-items-center rounded-full border-[2.5px] border-ink bg-pink font-display font-black text-ink ${cls}`}>
        {n}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {s[0] && (
        <div className="rounded-2xl border-[2.5px] border-ink bg-sand p-5 shadow-chunky-sm">
          <div className="flex items-center gap-3">
            <Badge n={1} size="lg" />
            <p className="serif text-2xl font-black leading-tight text-ink">{s[0].label}</p>
          </div>
          <p className="mt-2.5 leading-relaxed text-ink-soft">
            <Rich text={s[0].blurb} />
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[s[1], s[2]].filter(Boolean).map((x, i) => (
          <div key={i} className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-4 shadow-chunky-sm">
            <div className="flex items-center gap-2.5">
              <Badge n={i + 2} size="md" />
              <p className="serif text-lg font-black leading-tight text-ink">{x.label}</p>
            </div>
            <p className="mt-2 text-sm leading-snug text-ink-soft">
              <Rich text={x.blurb} />
            </p>
          </div>
        ))}
      </div>

      {(s[3] || s[4]) && (
        <div className="flex flex-col gap-2">
          {[s[3], s[4]].filter(Boolean).map((x, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border-2 border-ink/60 bg-paper-hi/70 px-3.5 py-2.5">
              <Badge n={i + 4} size="sm" />
              <p className="serif font-bold text-ink">{x.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
