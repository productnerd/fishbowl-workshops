type Row = { label: string; self: number; team: number }

// "You vs the team" as a dumbbell chart: one bar per trait on a shared 1-9 track.
// The distance between your dot (pink) and the team's dot (blue) IS the disagreement,
// so the biggest gaps read at a glance. Caller passes rows already sorted biggest-gap
// first. Replaces the old text "you vs them" card.
export default function SelfTeamDumbbell({ rows }: { rows: Row[] }) {
  const VB = 264
  const x0 = 96
  const x1 = 246
  const span = x1 - x0
  const rowH = 32
  const top = 12
  const height = rows.length * rowH + top + 6
  const px = (v: number) => x0 + ((Math.min(9, Math.max(1, v)) - 1) / 8) * span

  return (
    <div>
      <svg viewBox={`0 0 ${VB} ${height}`} className="block w-full" role="img" aria-label="Self versus team dumbbell chart">
        {/* golden-mean centre (5 = balanced) */}
        <line x1={px(5)} y1={top - 2} x2={px(5)} y2={height - 4} stroke="#2a2420" strokeOpacity={0.22} strokeWidth={1} strokeDasharray="3 3" />
        {rows.map((r, i) => {
          const y = top + i * rowH + rowH / 2
          const sx = px(r.self)
          const tx = px(r.team)
          const gap = Math.abs(r.self - r.team) >= 2
          return (
            <g key={r.label}>
              <text x={x0 - 8} y={y + 3.5} textAnchor="end" fontSize={10.5} fontWeight={600} fill="#5a4f45">
                {r.label}
              </text>
              <line x1={x0} y1={y} x2={x1} y2={y} stroke="#e2d4b6" strokeWidth={6} strokeLinecap="round" />
              <line x1={sx} y1={y} x2={tx} y2={y} stroke={gap ? '#a83f6f' : '#5a4f45'} strokeOpacity={gap ? 0.5 : 0.3} strokeWidth={3} strokeLinecap="round" />
              <circle cx={tx} cy={y} r={6} fill="#1366ac" stroke="#2a2420" strokeWidth={2} />
              <circle cx={sx} cy={y} r={6} fill="#efa6c1" stroke="#2a2420" strokeWidth={2} />
            </g>
          )
        })}
      </svg>
      <div className="mt-3 flex justify-between text-[12px] font-semibold text-ink-soft">
        <span>← too little</span>
        <span className="text-ink">balanced</span>
        <span>too much →</span>
      </div>
      <div className="mt-2 flex gap-4 text-xs font-semibold text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-pink" /> you
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-blue" /> team
        </span>
      </div>
    </div>
  )
}
