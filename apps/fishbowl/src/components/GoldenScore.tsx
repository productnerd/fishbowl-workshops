import type { Golden } from '../lib/goldenScore'

// A dartboard for the golden mean: the gold centre is the virtuous middle, the rim is
// the extremes. Each of the sixteen dimensions (ten virtues + six hats) is a dot placed
// at its distance from centre; the dashed ring is how close you sit on average — which
// is the Golden Score.
const CX = 150
const CY = 112
const R = 94

export default function GoldenScore({ golden }: { golden: Golden }) {
  const g = golden.score / 100
  const N = golden.items.length
  const avgR = (1 - g) * R

  const dots = golden.items.map((it, i) => {
    const rad = (1 - it.goodness) * R
    const a = (i / N) * Math.PI * 2 - Math.PI / 2
    return { x: CX + rad * Math.cos(a), y: CY + rad * Math.sin(a), color: it.color, key: it.key }
  })

  return (
    <div>
      {/* Hero number */}
      <div className="text-center">
        <div className="display text-6xl leading-none" style={{ color: '#b8892a' }}>
          {golden.score}
        </div>
        <p className="kicker mt-1 text-ink-soft">out of 100</p>
      </div>

      <svg viewBox="0 0 300 230" className="mx-auto mt-1 w-full max-w-[290px]" role="img" aria-label={`Golden Score ${golden.score} of 100`}>
        <defs>
          <radialGradient id="goldTarget" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f3da85" />
            <stop offset="30%" stopColor="#dcae3d" />
            <stop offset="62%" stopColor="#e2d4b6" />
            <stop offset="100%" stopColor="#dcb9c6" />
          </radialGradient>
        </defs>

        {/* Target */}
        <circle cx={CX} cy={CY} r={R} fill="url(#goldTarget)" stroke="#2a2420" strokeWidth={2.5} />
        <circle cx={CX} cy={CY} r={R * 0.66} fill="none" stroke="#2a2420" strokeOpacity={0.16} strokeWidth={1} />
        <circle cx={CX} cy={CY} r={R * 0.33} fill="none" stroke="#2a2420" strokeOpacity={0.16} strokeWidth={1} />

        {/* The golden mean: dead centre */}
        <circle cx={CX} cy={CY} r={5} fill="#8f6a1c" />

        {/* Your average distance from the mean = the score */}
        <circle cx={CX} cy={CY} r={avgR} fill="none" stroke="#2a2420" strokeWidth={2} strokeDasharray="5 4" strokeOpacity={0.85} />

        {/* Each dimension */}
        {dots.map((d) => (
          <circle key={d.key} cx={d.x} cy={d.y} r={5} fill={d.color} stroke="#2a2420" strokeOpacity={0.55} strokeWidth={1} />
        ))}

        {/* Rim + centre labels */}
        <text x={CX} y={CY + R + 20} textAnchor="middle" className="serif" fontSize={11} fill="#5a4f45" fontStyle="italic">
          rim = the extremes · centre = the golden mean
        </text>
      </svg>

      {/* Percentile flex — only when top quartile */}
      {golden.topPercent != null && (
        <div className="mt-4 rounded-2xl border-[2.5px] border-ink px-5 py-4 text-center shadow-chunky-sm" style={{ background: '#f5e6b8' }}>
          <div className="display text-2xl" style={{ color: '#8f6a1c' }}>
            Top {golden.topPercent}%
          </div>
          <p className="mt-1 text-sm leading-snug text-ink">
            You're more virtuous than <span className="font-black">{golden.betterThan}%</span> of your colleagues — that's
            something to pat yourself on the back for. 👏
          </p>
        </div>
      )}

      {/* Grounding + legend */}
      <p className="mt-4 text-center text-sm text-ink-soft">
        Closest to the mean: <span className="font-semibold text-ink">{golden.best.label}</span>. Furthest:{' '}
        <span className="font-semibold text-ink">{golden.worst.label}</span>.
      </p>
      <div className="mt-2 flex items-center justify-center gap-5 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-ink/50" style={{ background: '#a83f6f' }} /> virtues
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-ink/50" style={{ background: '#dcae3d' }} /> thinking hats
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-ink/70" /> your average
        </span>
      </div>
    </div>
  )
}
