import { motion, type Variants } from 'framer-motion'

type Point = { label: string; self: number; team: number }
type Trio = { blind: string; hidden: string; aligned: string }

// Each labelled point pops in with a small ripple once the slide's rise lands.
const pointPop: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: (i: number = 0) => ({ opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut', delay: 0.15 + i * 0.05 } }),
}

// Self-vs-team quadrant. Each characteristic is a dot: x = how the team rates you,
// y = how you rate yourself. The dashed diagonal is perfect agreement. Dots ABOVE it
// (you rate yourself higher than the team) and dots BELOW it (the team rates you higher
// than you do) are the two kinds of gap; dots on the line = you agree. The default
// framing reads it as strengths (above = blind spot, below = hidden strength), but the
// labels/colours can be overridden to reframe the same geometry for watch-outs.
const DEFAULT_COLORS: Trio = { blind: '#d9734a', hidden: '#2f9e7a', aligned: '#8a7d6d' }
const DEFAULT_LABELS: Trio = { blind: 'blind spot', hidden: 'hidden strength', aligned: 'you agree' }
const MARGIN = 1.2

export default function BlindSpotQuadrant({
  points,
  colors = DEFAULT_COLORS,
  labels = DEFAULT_LABELS,
  axisX = 'how the team rates you →',
  axisY = 'how you rate yourself →',
}: {
  points: Point[]
  colors?: Trio
  labels?: Trio
  axisX?: string
  axisY?: string
}) {
  const O = 30 // box origin (top-left)
  const S = 224 // box side
  const VB = 300 // viewBox size
  const bottom = O + S // 254
  const fx = (team: number) => O + ((Math.min(9, Math.max(1, team)) - 1) / 8) * S
  const fy = (self: number) => bottom - ((Math.min(9, Math.max(1, self)) - 1) / 8) * S

  // Pre-compute each dot, then place its label on the side with more room, clamp inside
  // the frame, and greedily nudge it down until it no longer overlaps an earlier label —
  // so a dozen mixed signals stay legible instead of stacking on the same row.
  const dots = points.map((p, i) => {
    const diff = p.self - p.team
    const kind = diff >= MARGIN ? 'blind' : diff <= -MARGIN ? 'hidden' : 'aligned'
    return { p, i, kind, color: colors[kind], x: fx(p.team), y: fy(p.self) }
  })
  const placed: { x1: number; x2: number; y: number }[] = []
  const labels_ = dots
    .filter((d) => d.kind !== 'aligned')
    .map((d) => {
      const w = d.p.label.length * 5.6 + 8
      let right = d.x < O + S * 0.55
      let lx = right ? d.x + 9 : d.x - 9
      let x1 = right ? lx : lx - w
      let x2 = right ? lx + w : lx
      if (x2 > VB - 2) { right = false; lx = d.x - 9; x1 = lx - w; x2 = lx }
      if (x1 < 2) { right = true; lx = d.x + 9; x1 = lx; x2 = lx + w }
      let ly = d.y + 3
      let guard = 0
      while (guard++ < 40 && placed.some((q) => Math.abs(q.y - ly) < 12 && x1 < q.x2 && x2 > q.x1)) ly += 12
      placed.push({ x1, x2, y: ly })
      return { key: d.p.label, i: d.i, lx, ly, anchor: (right ? 'start' : 'end') as 'start' | 'end', text: d.p.label }
    })

  return (
    <div>
      <svg viewBox={`0 0 ${VB} ${VB}`} className="mx-auto block w-full max-w-[360px]" role="img" aria-label="Self versus team perception map">
        <rect x={O} y={O} width={S} height={S} fill="#f5eedc" stroke="#2a2420" strokeOpacity={0.25} />
        <line x1={O} y1={bottom} x2={bottom} y2={O} stroke="#2a2420" strokeOpacity={0.35} strokeWidth={1.4} strokeDasharray="4 4" />

        {dots.map((d) => (
          <motion.circle
            key={`dot-${d.p.label}`}
            variants={pointPop}
            custom={d.i}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            cx={d.x}
            cy={d.y}
            r={d.kind === 'aligned' ? 4.5 : 6.5}
            fill={d.color}
            stroke="#2a2420"
            strokeWidth={d.kind === 'aligned' ? 0 : 1.5}
          />
        ))}
        {labels_.map((l) => (
          <motion.text
            key={`lbl-${l.key}`}
            variants={pointPop}
            custom={l.i}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            x={l.lx}
            y={l.ly}
            textAnchor={l.anchor}
            fontSize={10.5}
            fontWeight={600}
            fill="#5a4f45"
            paintOrder="stroke"
            stroke="#fbf6ea"
            strokeWidth={3}
            strokeLinejoin="round"
          >
            {l.text}
          </motion.text>
        ))}

        <text x={O + S / 2} y={VB - 4} fontSize={10} fontWeight={600} fill="#5a4f45" textAnchor="middle">{axisX}</text>
        <text x={12} y={O + S / 2} fontSize={10} fontWeight={600} fill="#5a4f45" textAnchor="middle" transform={`rotate(-90 12 ${O + S / 2})`}>{axisY}</text>
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-semibold text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: colors.blind }} /> {labels.blind}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: colors.hidden }} /> {labels.hidden}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: colors.aligned }} /> {labels.aligned}</span>
      </div>
    </div>
  )
}
