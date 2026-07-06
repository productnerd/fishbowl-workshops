import { HATS, type HatScores } from '@fishbowl/feedback-core'

type TeamHat = { key: string; mu: number; n: number }

// Short axis labels — the plain meaning of each de Bono hat.
const SHORT: Record<string, string> = {
  hat_white: 'Facts',
  hat_red: 'Feelings',
  hat_yellow: 'Upside',
  hat_black: 'Risks',
  hat_green: 'Ideas',
  hat_blue: 'Process',
}

// Each hat's colour, darkened enough to read on cream (white becomes a warm grey).
const HUE: Record<string, string> = {
  hat_white: '#8f8879',
  hat_red: '#d94f6a',
  hat_yellow: '#d19a00',
  hat_black: '#2a2420',
  hat_green: '#3f9d5a',
  hat_blue: '#1366ac',
}

// Six Thinking Hats as a radar: the SHAPE of how someone thinks. The team polygon
// (blue) and, once self-assessed, the subject's own polygon (pink) sit overlaid.
// Each axis is a hat on a 1-9 scale (how strongly that mode shows up) — the stronger
// the mode, the further the vertex reaches. Falls back to self-only when the pooled
// survey never sampled the team on hats.
export default function HatsRadar({ team, self }: { team: TeamHat[]; self: HatScores | null }) {
  const size = 260
  const c = size / 2
  const R = 80
  const teamMap = new Map(team.filter((t) => t.n > 0).map((t) => [t.key, t.mu]))
  const teamHasData = teamMap.size > 0

  const axes = HATS.map((h, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / HATS.length
    return { hat: h, ux: Math.cos(ang), uy: Math.sin(ang) }
  })
  const rad = (v: number) => ((Math.min(9, Math.max(1, v)) - 1) / 8) * R
  const at = (ux: number, uy: number, r: number) => [c + ux * r, c + uy * r] as const
  const ring = (frac: number) =>
    axes.map((a) => { const [x, y] = at(a.ux, a.uy, R * frac); return `${x.toFixed(1)},${y.toFixed(1)}` }).join(' ')
  const shape = (get: (key: string) => number | undefined) =>
    axes
      .map((a) => {
        const v = get(a.hat.key)
        if (typeof v !== 'number') return null
        const [x, y] = at(a.ux, a.uy, rad(v))
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .filter(Boolean)
      .join(' ')

  const teamPoly = teamHasData ? shape((k) => teamMap.get(k)) : ''
  const selfPoly = self ? shape((k) => self[k]) : ''

  return (
    <div>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full max-w-[440px]" role="img" aria-label="Six thinking hats radar">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke="#2a2420" strokeOpacity={0.13} strokeWidth={1} />
        ))}
        {axes.map((a) => {
          const [x, y] = at(a.ux, a.uy, R)
          return <line key={a.hat.key} x1={c} y1={c} x2={x} y2={y} stroke={HUE[a.hat.key] ?? '#2a2420'} strokeOpacity={0.3} strokeWidth={1.2} />
        })}
        {teamPoly && <polygon points={teamPoly} fill="#1366ac" fillOpacity={0.16} stroke="#1366ac" strokeWidth={2.5} strokeLinejoin="round" />}
        {selfPoly && <polygon points={selfPoly} fill="#efa6c1" fillOpacity={0.22} stroke="#a83f6f" strokeWidth={2.5} strokeLinejoin="round" />}
        {/* vertex dots */}
        {teamPoly &&
          axes.map((a) => {
            const v = teamMap.get(a.hat.key)
            if (typeof v !== 'number') return null
            const [x, y] = at(a.ux, a.uy, rad(v))
            return <circle key={`t${a.hat.key}`} cx={x} cy={y} r={3.2} fill="#1366ac" />
          })}
        {self &&
          axes.map((a) => {
            const v = self[a.hat.key]
            if (typeof v !== 'number') return null
            const [x, y] = at(a.ux, a.uy, rad(v))
            return <circle key={`s${a.hat.key}`} cx={x} cy={y} r={3.2} fill="#a83f6f" />
          })}
        {/* per-hat axis marker + coloured label */}
        {axes.map((a) => {
          const [mx, my] = at(a.ux, a.uy, R + 7)
          const [lx, ly] = at(a.ux, a.uy, R + 18)
          const anchor = a.ux > 0.3 ? 'start' : a.ux < -0.3 ? 'end' : 'middle'
          const hue = HUE[a.hat.key] ?? '#2a2420'
          return (
            <g key={`l${a.hat.key}`}>
              <circle cx={mx} cy={my} r={4} fill={hue} stroke="#2a2420" strokeWidth={1.4} />
              <text x={lx} y={ly + 3.5} textAnchor={anchor} fontSize={11} fontWeight={800} fill={hue}>
                {SHORT[a.hat.key] ?? a.hat.name}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex justify-center gap-4 text-xs font-semibold text-ink-soft">
        {teamHasData && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-blue" /> team
          </span>
        )}
        {self && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-pink" /> you
          </span>
        )}
      </div>
      {!teamHasData && self && (
        <p className="mt-1 text-center text-xs text-ink-soft">Your own read. Your team hasn't been asked these yet.</p>
      )}
    </div>
  )
}
