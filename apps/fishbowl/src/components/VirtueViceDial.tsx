import { motion } from 'framer-motion'
import { needleSlide } from '../lib/motion'

type Dial = { def: string; exc: string; score: number }

// "Virtue into vice": the golden-mean virtues the team scores toward an extreme,
// drawn as redline gauges. Deficiency pole (left) → balanced notch (centre 5) →
// excess pole (right, redlined). The needle sits at the team score; when it enters a
// redline the pole word lights as the named vice. One shared "engine" chip on top
// (archetype shadow + hottest thinking hat) shows they all trace to the same source.
export default function VirtueViceDial({ dials, engine }: { dials: Dial[]; engine: { shadow: string; hat: string } }) {
  const VB = 320
  const x0 = 28
  const x1 = 300
  const span = x1 - x0
  const px = (v: number) => x0 + ((Math.min(9, Math.max(1, v)) - 1) / 8) * span
  const rowH = 56
  const height = dials.length * rowH + 14

  return (
    <div>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-ink px-4 py-2 text-paper-hi shadow-chunky-sm sc-sand">
        <span className="text-sm font-black">⚙ same engine:</span>
        <span className="serif text-sm italic">{engine.shadow}</span>
        <span className="text-paper-hi/50">·</span>
        <span className="text-sm font-semibold">{engine.hat} hat</span>
      </div>
      <svg viewBox={`0 0 ${VB} ${height}`} className="block w-full" role="img" aria-label="Virtue into vice redline gauges">
        {dials.map((d, i) => {
          const y = 16 + i * rowH
          const labelY = y + 22
          const score = d.score
          const excess = score > 6
          const deficient = score < 4
          return (
            <g key={i}>
              {/* track */}
              <rect x={x0} y={y - 4} width={span} height={8} rx={4} fill="#e2d4b6" />
              {/* redlines */}
              <rect x={px(6.5)} y={y - 4} width={x1 - px(6.5)} height={8} fill="#d9734a" opacity={0.32} />
              <rect x={x0} y={y - 4} width={px(3.5) - x0} height={8} fill="#d9734a" opacity={0.22} />
              {/* healthy band */}
              <rect x={px(4.2)} y={y - 4} width={px(5.8) - px(4.2)} height={8} fill="#2f9e7a" opacity={0.34} />
              {/* centre notch */}
              <line x1={px(5)} y1={y - 7} x2={px(5)} y2={y + 7} stroke="#2a2420" strokeOpacity={0.4} strokeWidth={1} />
              {/* needle: starts at the centre notch and glides to the score */}
              <motion.circle
                cx={px(5)}
                cy={y}
                r={6.5}
                fill={excess || deficient ? '#d9734a' : '#2f9e7a'}
                stroke="#2a2420"
                strokeWidth={2}
                variants={needleSlide}
                custom={px(score)}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
              {/* pole labels — under the bar at each end so neither can clip */}
              <text x={x0} y={labelY} textAnchor="start" fontSize={10} fontWeight={deficient ? 800 : 600} fill={deficient ? '#d9734a' : '#5a4f45'}>
                {d.def}
              </text>
              <text x={x1} y={labelY} textAnchor="end" fontSize={10} fontWeight={excess ? 800 : 600} fill={excess ? '#d9734a' : '#5a4f45'}>
                {d.exc}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex justify-center gap-4 text-[11px] font-semibold text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#2f9e7a' }} /> balanced</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#d9734a' }} /> redlined into the vice</span>
      </div>
    </div>
  )
}
