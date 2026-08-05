import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, useReducedMotion, animate } from 'framer-motion'
import type { Golden } from '../lib/goldenScore'

// A dartboard for the golden mean: the gold centre is the virtuous middle, the rim is
// the extremes. Each of the sixteen dimensions (ten virtues + six hats) is a dot placed
// at its distance from centre; the dashed ring is how close you sit on average — which
// is the Golden Score. On wide screens the card splits: words + number on the left, a
// big dartboard + legend on the right.
const CX = 150
const CY = 112
const R = 94
const RUN = 3 // seconds: the whole reveal (ticker, ring, and every dot) lands together

export default function GoldenScore({ golden }: { golden: Golden }) {
  const reduce = useReducedMotion()
  const g = golden.score / 100
  const N = golden.items.length
  const avgR = (1 - g) * R

  // The number ticks up like a speedometer, easing out as it settles on the score.
  const count = useMotionValue(reduce ? golden.score : 0)
  const shown = useTransform(count, (v) => Math.round(v))
  useEffect(() => {
    if (reduce) {
      count.set(golden.score)
      return
    }
    const controls = animate(count, golden.score, { duration: RUN, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [golden.score, reduce, count])

  const dots = golden.items.map((it, i) => {
    const rad = (1 - it.goodness) * R
    const a = (i / N) * Math.PI * 2 - Math.PI / 2
    return { x: CX + rad * Math.cos(a), y: CY + rad * Math.sin(a), color: it.color, key: it.key }
  })

  return (
    // Container query, not a viewport one: this sits in a full-bleed slide in the report
    // and in a narrower board column on the dashboard, so it has to lay itself out from
    // the width it actually gets. Words beside the target once there's room, stacked on
    // phones.
    <div className="@container">
      <div className="grid gap-7 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] @2xl:items-center @2xl:gap-10">
      {/* LEFT: the words, the number, the flex */}
      <div>
        <p className="kicker mb-1 text-pink-deep">the golden mean</p>
        <h2 className="display mb-3 text-3xl @2xl:text-4xl">The Golden Score</h2>
        <p className="mb-5 text-sm leading-relaxed text-ink-soft">
          One number for the whole picture, from Aristotle's <span className="font-semibold text-ink">golden mean</span>: every
          virtue is the midpoint between too little and too much. The closer you sit to that centre, across all ten virtues and
          six hats, your read blended with your team's, the higher you score.
        </p>

        <div className="flex items-baseline gap-3">
          <span className="display text-7xl leading-none tabular-nums" style={{ color: '#b8892a' }}>
            <motion.span>{shown}</motion.span>
          </span>
          <span className="kicker text-ink-soft">out of 100</span>
        </div>

        {golden.topPercent != null && (
          <div className="mt-5 rounded-2xl border-[2.5px] border-ink px-5 py-4 shadow-chunky-sm" style={{ background: '#f5e6b8' }}>
            <div className="display text-2xl" style={{ color: '#8f6a1c' }}>
              Top {golden.topPercent}%
            </div>
            <p className="mt-1 text-sm leading-snug text-ink">
              You're more virtuous than <span className="font-black">{golden.betterThan}%</span> of your colleagues, that's
              something to pat yourself on the back for. 👏
            </p>
          </div>
        )}

        <p className="mt-5 text-sm text-ink-soft">
          Closest to the mean: <span className="font-semibold text-ink">{golden.best.label}</span>. Furthest:{' '}
          <span className="font-semibold text-ink">{golden.worst.label}</span>.
        </p>
      </div>

      {/* RIGHT: the big dartboard + legend */}
      <div>
        <svg viewBox="0 0 300 230" className="mx-auto block w-full max-w-[300px] @2xl:max-w-[460px]" role="img" aria-label={`Golden Score ${golden.score} of 100`}>
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

          {/* Your average distance from the mean = the score. The ring closes in from the
              rim to your reading over the same 3s the number climbs (the speedometer needle). */}
          <motion.circle
            cx={CX}
            cy={CY}
            fill="none"
            stroke="#2a2420"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeOpacity={0.85}
            initial={{ r: reduce ? avgR : R }}
            animate={{ r: avgR }}
            transition={{ duration: reduce ? 0 : RUN, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Each dimension, popped in one by one so the last lands right on the 3s mark */}
          {dots.map((d, i) => (
            <motion.circle
              key={d.key}
              cx={d.x}
              cy={d.y}
              r={5}
              fill={d.color}
              stroke="#2a2420"
              strokeOpacity={0.55}
              strokeWidth={1}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              transition={{ delay: reduce ? 0 : (i / Math.max(1, N - 1)) * (RUN - 0.3), duration: reduce ? 0.2 : 0.32, ease: 'backOut' }}
            />
          ))}

          {/* Rim + centre labels */}
          <text x={CX} y={CY + R + 20} textAnchor="middle" className="serif" fontSize={11} fill="#5a4f45" fontStyle="italic">
            rim = the extremes · centre = the golden mean
          </text>
        </svg>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-soft">
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
      </div>
    </div>
  )
}
