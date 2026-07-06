type Cluster = { label: string; words: string[] }

// Distinct hues for the named sub-constellations, chosen to read clearly on the night sky.
const CLUSTER_COLORS = ['#e7b24e', '#ef9dbf'] // gold, pink

// Blind-spot constellation: the things the team sees that you miss, plotted as stars. When
// the AI finds several tracing to one root, they become a NAMED constellation, drawn in its
// own colour with its member stars, and labelled with a coloured chip so a "group" never
// reads as just another word. Words that belong to no group are loose, dim, cream stars.
export default function Constellation({ words, clusters }: { words: string[]; clusters?: Cluster[] }) {
  const W = 300
  const H = 210
  const padX = 26
  const topY = 28
  const starBot = 168 // stars live above this; the group-name legend sits in the strip below
  const labelY = 194

  const present = new Set(words)
  const named = (clusters ?? [])
    .map((c, i) => ({ label: c.label, color: CLUSTER_COLORS[i % CLUSTER_COLORS.length], words: c.words.filter((w) => present.has(w)) }))
    .filter((g) => g.words.length > 0)
  const claimed = new Set(named.flatMap((g) => g.words))
  const loose = words.filter((w) => !claimed.has(w))
  const groups = [...named, ...(loose.length ? [{ label: null as string | null, color: '#e4dabf', words: loose }] : [])]
  const total = groups.reduce((a, g) => a + g.words.length, 0) || 1

  // Deterministic jitter so the grid reads as an organic sky, not a spreadsheet.
  const jit = (i: number, s: number) => Math.sin((i + 1) * s) * 0.5

  // Lay each group into its own vertical band (width ∝ member count); place members on a
  // small jittered grid inside it so the whole box fills instead of clumping in the centre.
  const posOf = new Map<string, { x: number; y: number; color: string; inC: boolean }>()
  const chips: { label: string; color: string; cx: number }[] = []
  const innerW = W - 2 * padX
  let cursor = padX
  groups.forEach((g, gi) => {
    const bw = (innerW * g.words.length) / total
    const x0 = cursor
    const x1 = cursor + bw
    const cx = (x0 + x1) / 2
    const k = g.words.length
    const cols = Math.max(1, Math.round(Math.sqrt(k)))
    const rows = Math.ceil(k / cols)
    g.words.forEach((w, j) => {
      const c = j % cols
      const r = Math.floor(j / cols)
      const x = x0 + ((c + 0.5) / cols) * bw + jit(gi * 9 + j, 12.9) * (bw / cols) * 0.26
      const y = topY + ((r + 0.5) / rows) * (starBot - topY) + jit(gi * 4 + j, 6.7) * ((starBot - topY) / rows) * 0.24
      posOf.set(w, { x, y, color: g.color, inC: g.label != null })
    })
    if (g.label) chips.push({ label: g.label, color: g.color, cx })
    cursor = x1
  })

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Blind-spot constellation">
        <rect x="0" y="0" width={W} height={H} rx="12" fill="#173a52" />

        {/* Faint background stars for depth */}
        {Array.from({ length: 16 }).map((_, i) => (
          <circle key={`bg${i}`} cx={12 + (jit(i, 3.1) + 0.5) * (W - 24)} cy={10 + (jit(i, 5.9) + 0.5) * (H - 20)} r={0.8} fill="#4d6f88" opacity={0.5} />
        ))}

        {/* Coloured constellation lines per named group */}
        {named.map((g, ci) => {
          const pts = g.words.map((w) => posOf.get(w)!).filter(Boolean)
          if (pts.length < 2) return null
          const d = pts.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
          return <path key={ci} d={d} fill="none" stroke={g.color} strokeWidth={1.4} strokeOpacity={0.7} />
        })}

        {/* Stars + word labels */}
        {words.map((w) => {
          const p = posOf.get(w)
          if (!p) return null
          return (
            <g key={w}>
              <circle cx={p.x} cy={p.y} r={p.inC ? 3.6 : 2.6} fill={p.color} opacity={p.inC ? 1 : 0.8} />
              <text x={p.x} y={p.y - 6} fontSize={9} fontWeight={p.inC ? 600 : 400} fill={p.inC ? '#f6eed6' : '#bccbd6'} textAnchor="middle">
                {w}
              </text>
            </g>
          )
        })}

        {/* Group-name legend: one coloured, italic-serif chip per named group, packed into a
            centred row so they never overlap and never read as just another star word. */}
        {(() => {
          const chipW = (label: string) => label.length * 4.6 + 15
          const gap = 7
          const rowW = chips.reduce((a, c) => a + chipW(c.label), 0) + gap * Math.max(0, chips.length - 1)
          let lx = (W - rowW) / 2
          return chips.map((c, i) => {
            const w = chipW(c.label)
            const cx = lx + w / 2
            lx += w + gap
            return (
              <g key={`chip${i}`}>
                <rect x={cx - w / 2} y={labelY - 9.5} width={w} height={13} rx={6.5} fill="#0c2333" stroke={c.color} strokeWidth={1} />
                <circle cx={cx - w / 2 + 7} cy={labelY - 3} r={2} fill={c.color} />
                <text x={cx + 4} y={labelY} fontSize={8.3} fontStyle="italic" fontWeight={700} fill={c.color} textAnchor="middle" fontFamily="Fraunces, Georgia, serif" letterSpacing="0.1">
                  {c.label}
                </text>
              </g>
            )
          })
        })()}
      </svg>
    </div>
  )
}
