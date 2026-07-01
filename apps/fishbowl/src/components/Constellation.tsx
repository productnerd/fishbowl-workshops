type Cluster = { label: string; words: string[] }

// Blind-spot constellation: the things the team sees that you miss, plotted as stars on a
// night sky. When the AI finds that several trace to one root, it draws them into a named
// constellation — separate blind spots turning out to share a single hidden theme.
export default function Constellation({ words, clusters }: { words: string[]; clusters?: Cluster[] }) {
  const W = 300
  const H = 194
  const cx = 150
  const cy = 90
  const pos = (i: number, n: number) => {
    const ang = i * 2.399963 // golden angle → even, deterministic spread
    const r = 20 + 64 * Math.sqrt((i + 0.5) / Math.max(1, n))
    return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) * 0.6 }
  }
  const idx = new Map(words.map((w, i) => [w, i]))
  const P = (w: string) => pos(idx.get(w) ?? 0, words.length)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Blind-spot constellation">
        <rect x="0" y="0" width={W} height={H} rx="12" fill="#173a52" />
        {(clusters ?? []).map((c, ci) => {
          const pts = c.words.filter((w) => idx.has(w)).map(P)
          if (pts.length < 2) return null
          const d = pts.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
          const lx = pts.reduce((a, p) => a + p.x, 0) / pts.length
          const ly = pts.reduce((a, p) => a + p.y, 0) / pts.length
          return (
            <g key={ci}>
              <path d={d} fill="none" stroke="#a9c7dd" strokeWidth={1.2} strokeOpacity={0.75} />
              <text x={lx} y={ly + 20} fontSize={9} fontWeight={700} fill="#f3ead4" textAnchor="middle" opacity={0.9}>
                {c.label}
              </text>
            </g>
          )
        })}
        {words.map((w, i) => {
          const p = pos(i, words.length)
          return (
            <g key={w}>
              <circle cx={p.x} cy={p.y} r={3} fill="#f3ead4" />
              <text x={p.x} y={p.y - 6} fontSize={8.5} fill="#dfeaf2" textAnchor="middle">
                {w}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
