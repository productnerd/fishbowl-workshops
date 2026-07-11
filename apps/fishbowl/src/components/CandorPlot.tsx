import { motion, type Variants } from 'framer-motion'
import { candorQuadrant } from '@fishbowl/feedback-core'

// The self point (and its connector) pops in after the slide's rise has landed.
// Only ever activates inside the deck; on the Landing preview there is no parent
// variant context, so these render statically.
const selfPop: Variants = {
  hidden: { opacity: 0, scale: 0.7 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 18, delay: 0.3 } },
}

// Riso 2×2 Care × Challenge plot. x = Challenge Directly, y = Care Personally,
// both 1–9 with a midpoint of 5. Quadrants are tinted (top-right Radical Candor =
// pink). A team point (pool-blue, filled) and, when present, a self point (pink,
// hollow) sit on the plane with a dashed connector. Captions name the quadrant each
// landed in.
export default function CandorPlot({
  teamCare,
  teamChallenge,
  selfCare,
  selfChallenge,
  maxW = 300,
  compactLegend = false,
}: {
  teamCare: number
  teamChallenge: number
  selfCare: number | null
  selfChallenge: number | null
  // Optional shrink hooks for the homepage sample: a smaller plot and a one-line
  // legend without the quadrant names. The report leaves both at their defaults.
  maxW?: number
  compactLegend?: boolean
}) {
  // map a 1–9 value to a 0–100% position within the plot
  const px = (v: number) => ((v - 1) / 8) * 100 // challenge → x
  const py = (v: number) => (1 - (v - 1) / 8) * 100 // care → y (inverted: high care = top)

  const hasSelf = selfCare != null && selfChallenge != null

  const teamQ = candorQuadrant(teamCare, teamChallenge)
  const selfQ = hasSelf ? candorQuadrant(selfCare, selfChallenge) : null

  const teamX = px(teamChallenge)
  const teamY = py(teamCare)
  const selfX = hasSelf ? px(selfChallenge) : 0
  const selfY = hasSelf ? py(selfCare) : 0

  return (
    <div className="mx-auto flex w-full flex-col gap-3" style={{ maxWidth: maxW }}>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-[2.5px] border-ink bg-paper-hi shadow-chunky-sm">
        {/* quadrant tints: TL ruinous empathy, TR radical candor, BL manipulative, BR obnoxious */}
        <div className="absolute left-0 top-0 h-1/2 w-1/2 bg-sand/60" title="Ruinous Empathy" />
        <div className="absolute right-0 top-0 h-1/2 w-1/2 bg-pink/45" title="Radical Candor" />
        <div className="absolute bottom-0 left-0 h-1/2 w-1/2 bg-sand-deep/50" title="Manipulative Insincerity" />
        <div className="absolute bottom-0 right-0 h-1/2 w-1/2 bg-blue/15" title="Obnoxious Aggression" />

        {/* midpoint axes (5 on each scale) */}
        <div className="absolute left-1/2 top-0 h-full w-[2.5px] -translate-x-1/2 bg-ink" />
        <div className="absolute left-0 top-1/2 h-[2.5px] w-full -translate-y-1/2 bg-ink" />

        {/* quadrant labels */}
        <span className="absolute right-2 top-2 text-right font-display text-[11px] font-black leading-tight text-pink-deep">
          Radical
          <br />
          Candor
        </span>
        <span className="absolute left-2 top-2 max-w-[44%] text-[10px] font-semibold leading-tight text-ink-soft">
          Ruinous Empathy
        </span>
        <span className="absolute bottom-2 left-2 max-w-[44%] text-[10px] font-semibold leading-tight text-ink-soft">
          Manipulative Insincerity
        </span>
        <span className="absolute bottom-2 right-2 max-w-[44%] text-right text-[10px] font-semibold leading-tight text-ink-soft">
          Obnoxious Aggression
        </span>

        {/* dashed connector between self and team */}
        {hasSelf && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <motion.line
              variants={selfPop}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              x1={selfX}
              y1={selfY}
              x2={teamX}
              y2={teamY}
              stroke="var(--color-ink)"
              strokeWidth={0.7}
              strokeDasharray="2 2"
            />
          </svg>
        )}

        {/* self point — pink hollow */}
        {hasSelf && (
          <motion.div
            variants={selfPop}
            className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-pink-deep bg-paper-hi"
            style={{ left: `${selfX}%`, top: `${selfY}%` }}
            title={`you · ${selfQ!.name}`}
          />
        )}

        {/* team point — pool-blue filled */}
        <div
          className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-blue"
          style={{ left: `${teamX}%`, top: `${teamY}%` }}
          title={`team · ${teamQ.name}`}
        />
      </div>

      {/* axis captions */}
      <div className="flex justify-between text-[12px] font-semibold text-ink-soft">
        <span>← Less challenge</span>
        <span>Challenge Directly →</span>
      </div>
      <div className="text-center text-[12px] font-semibold text-ink-soft">↕ Care Personally</div>

      {/* legend + quadrant readout. Compact = one row, dots only (no quadrant names). */}
      {compactLegend ? (
        <div className="flex items-center justify-center gap-5 text-xs font-semibold text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-blue" /> team
          </span>
          {hasSelf && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border-[2.5px] border-pink-deep bg-paper-hi" /> you
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 text-xs font-semibold text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-blue" /> team, {teamQ.name}
          </span>
          {hasSelf && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border-[2.5px] border-pink-deep bg-paper-hi" /> you, {selfQ!.name}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
