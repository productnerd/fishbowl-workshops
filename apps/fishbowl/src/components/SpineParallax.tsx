type Item = { label: string; self: number; team: number; kind: 'blind' | 'hidden' }

// Blind-spot parallax: pools every self-vs-team item (virtue gaps, Johari, Nohari) onto
// one spine. Each row has a pink "you" dot and a blue "team" dot on a shared 0..1 scale;
// the connector is the gap. When most gaps lean the same way, the whole fan tilts — that
// consistent direction is the point.
export default function SpineParallax({ items }: { items: Item[] }) {
  const VB = 300
  const x0 = 100
  const x1 = 288
  const span = x1 - x0
  const mid = (x0 + x1) / 2
  const rowH = 32
  const top = 10
  const height = items.length * rowH + top + 4
  const px = (v: number) => x0 + Math.min(1, Math.max(0, v)) * span

  return (
    <div>
      <svg viewBox={`0 0 ${VB} ${height}`} className="block w-full" role="img" aria-label="Self versus team parallax spine">
        <line x1={mid} y1={top - 4} x2={mid} y2={height - 2} stroke="#2a2420" strokeWidth={1.5} strokeDasharray="3 3" strokeOpacity={0.45} />
        {items.map((it, i) => {
          const y = top + i * rowH + rowH / 2
          const sx = px(it.self)
          const tx = px(it.team)
          const color = it.kind === 'hidden' ? '#a83f6f' : '#1366ac'
          return (
            <g key={i}>
              <text x={x0 - 8} y={y + 3.5} textAnchor="end" fontSize={10} fontWeight={600} fill="#5a4f45">
                {it.label}
              </text>
              <line x1={sx} y1={y} x2={tx} y2={y} stroke={color} strokeOpacity={0.4} strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={sx} cy={y} r={5.5} fill="#efa6c1" stroke="#2a2420" strokeWidth={2} />
              <circle cx={tx} cy={y} r={5.5} fill="#1366ac" stroke="#2a2420" strokeWidth={2} />
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex justify-center gap-4 text-[11px] font-semibold text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-pink" /> you</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-blue" /> team</span>
      </div>
    </div>
  )
}
