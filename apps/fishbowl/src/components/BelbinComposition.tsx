type Seg = { name: string; pct: number; color: string }

// The team-role mix as one stacked bar: each role's slice is a 50/50 blend of how the
// SELF allocated their roles and how the TEAM sees them, so it reads as a single
// composite composition rather than a ranked list.
export default function BelbinComposition({ segments }: { segments: Seg[] }) {
  const shown = segments.filter((s) => s.pct >= 0.5)
  return (
    <div>
      <div className="flex h-10 w-full overflow-hidden rounded-full border-[2.5px] border-ink shadow-chunky-sm">
        {shown.map((s, i) => (
          <div
            key={i}
            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
            className={i > 0 ? 'h-full border-l border-ink/25' : 'h-full'}
            title={`${s.name} ${Math.round(s.pct)}%`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {shown
          .filter((s) => s.pct >= 6)
          .map((s, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-ink" style={{ backgroundColor: s.color }} />
              {s.name} <span className="text-ink/50">{Math.round(s.pct)}%</span>
            </span>
          ))}
      </div>
    </div>
  )
}
