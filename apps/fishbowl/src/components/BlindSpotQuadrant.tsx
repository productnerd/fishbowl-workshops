type Point = { label: string; self: number; team: number }

// Blind spots vs hidden strengths. Each trait is a dot: x = how the team rates you,
// y = how you rate yourself. The dashed diagonal is perfect agreement. Dots above it
// (you rate yourself higher than the team does) are BLIND SPOTS; dots below it (the
// team rates you higher than you do) are HIDDEN STRENGTHS. Dots on the line = you agree.
const BLIND = '#d9734a'
const HIDDEN = '#2f9e7a'
const ALIGNED = '#8a7d6d'
const MARGIN = 1.2

export default function BlindSpotQuadrant({ points }: { points: Point[] }) {
  const O = 40 // box origin (top-left) & bottom offset
  const S = 170 // box side
  const bottom = O + S // 210
  const fx = (team: number) => O + ((Math.min(9, Math.max(1, team)) - 1) / 8) * S
  const fy = (self: number) => bottom - ((Math.min(9, Math.max(1, self)) - 1) / 8) * S

  return (
    <div>
      <svg viewBox="0 0 240 246" className="mx-auto block w-full max-w-[340px]" role="img" aria-label="Blind spots and hidden strengths quadrant">
        <rect x={O} y={O} width={S} height={S} fill="#f5eedc" stroke="#2a2420" strokeOpacity={0.25} />
        <line x1={O} y1={bottom} x2={bottom} y2={O} stroke="#2a2420" strokeOpacity={0.35} strokeWidth={1.4} strokeDasharray="4 4" />
        <text x={O + 52} y={O + 20} fontSize={9.5} fontWeight={700} fill={BLIND} textAnchor="middle">BLIND SPOTS</text>
        <text x={bottom - 56} y={bottom - 12} fontSize={9.5} fontWeight={700} fill={HIDDEN} textAnchor="middle">HIDDEN STRENGTHS</text>

        {points.map((p) => {
          const diff = p.self - p.team
          const kind = diff >= MARGIN ? 'blind' : diff <= -MARGIN ? 'hidden' : 'aligned'
          const color = kind === 'blind' ? BLIND : kind === 'hidden' ? HIDDEN : ALIGNED
          const x = fx(p.team)
          const y = fy(p.self)
          const right = x < 128
          return (
            <g key={p.label}>
              <circle cx={x} cy={y} r={kind === 'aligned' ? 4.5 : 6} fill={color} stroke="#2a2420" strokeWidth={kind === 'aligned' ? 0 : 1.5} />
              {kind !== 'aligned' && (
                <text x={right ? x + 9 : x - 9} y={y + 3} textAnchor={right ? 'start' : 'end'} fontSize={9.5} fontWeight={600} fill="#5a4f45">
                  {p.label}
                </text>
              )}
            </g>
          )
        })}

        <text x={O + S / 2} y={240} fontSize={10} fontWeight={600} fill="#5a4f45" textAnchor="middle">how the team rates you →</text>
        <text x={16} y={O + S / 2} fontSize={10} fontWeight={600} fill="#5a4f45" textAnchor="middle" transform={`rotate(-90 16 ${O + S / 2})`}>how you rate yourself →</text>
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-semibold text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: BLIND }} /> blind spot</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: HIDDEN }} /> hidden strength</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: ALIGNED }} /> you agree</span>
      </div>
    </div>
  )
}
