type W = { thinking: number; action: number; people: number }

// Where you'd rather be: a Belbin cluster triangle. The blue dot is where the team casts
// you (their role chip-share); the pink star is where your ENERGY points (your top
// energizers mapped to clusters). The arrow between them is the fit/drift — a long arrow
// means your energy has already left the cluster they keep you in.
export default function RoleTriangle({ teamW, energyW }: { teamW: W; energyW: W }) {
  const A = { x: 130, y: 20 } // Thinking (top)
  const L = { x: 26, y: 166 } // Action (bottom-left)
  const R = { x: 234, y: 166 } // People (bottom-right)
  const cen = (w: W) => {
    const s = w.thinking + w.action + w.people || 1
    return { x: (w.thinking * A.x + w.action * L.x + w.people * R.x) / s, y: (w.thinking * A.y + w.action * L.y + w.people * R.y) / s }
  }
  const t = cen(teamW)
  const e = cen(energyW)
  const star = '0,-8 2.4,-2.5 8,-2.5 3.2,1.5 5,7 0,3.2 -5,7 -3.2,1.5 -8,-2.5 -2.4,-2.5'

  return (
    <div>
      <svg viewBox="0 0 260 196" className="mx-auto block w-full max-w-[320px]" role="img" aria-label="Belbin cluster triangle: where they cast you versus where your energy points">
        <polygon points={`${A.x},${A.y} ${R.x},${R.y} ${L.x},${L.y}`} fill="#f5eedc" stroke="#2a2420" strokeWidth={1.5} />
        <text x={A.x} y={A.y - 6} fontSize={11} fontWeight={800} fill="#2a2420" textAnchor="middle">Thinking</text>
        <text x={L.x - 2} y={L.y + 15} fontSize={11} fontWeight={800} fill="#2a2420" textAnchor="middle">Action</text>
        <text x={R.x + 2} y={R.y + 15} fontSize={11} fontWeight={800} fill="#2a2420" textAnchor="middle">People</text>
        <defs>
          <marker id="rtarw" markerWidth="8" markerHeight="8" refX="4.5" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" fill="#2a2420" />
          </marker>
        </defs>
        {Math.hypot(e.x - t.x, e.y - t.y) > 10 && (
          <line x1={t.x} y1={t.y} x2={e.x} y2={e.y} stroke="#2a2420" strokeWidth={2} markerEnd="url(#rtarw)" />
        )}
        <circle cx={t.x} cy={t.y} r={6.5} fill="#1366ac" stroke="#2a2420" strokeWidth={2} />
        <g transform={`translate(${e.x},${e.y})`}>
          <polygon points={star} fill="#efa6c1" stroke="#2a2420" strokeWidth={1.3} />
        </g>
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-4 text-[11px] font-semibold text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-blue" /> where they cast you</span>
        <span className="flex items-center gap-1.5">★ where your energy points</span>
      </div>
    </div>
  )
}
