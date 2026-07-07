import { shadeFor, type DimensionScore, type OrientationMeta } from '@fishbowl/feedback-core'

// One orientation's card: its dimensions as donut dials with label, band, and a short
// neutral descriptor (the % + band carry how strongly it applies).
function Dial({ score, color }: { score: number; color: string }) {
  const r = 26
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(100, score)) / 100)
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0" role="img" aria-label={`${score} percent`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e2d4b6" strokeWidth="7" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="37" textAnchor="middle" className="display" fontSize="17" fontWeight="800" fill={color}>
        {score}
      </text>
    </svg>
  )
}

export default function DimensionsProfile({
  orientation,
  dims,
  evidence,
}: {
  orientation: OrientationMeta
  dims: DimensionScore[]
  evidence?: Record<string, string | null>
}) {
  return (
    <div>
      <p className="kicker mb-1" style={{ color: orientation.color }}>
        your profile
      </p>
      <h2 className="display mb-1 text-3xl leading-tight">{orientation.title}</h2>
      <p className="mb-5 text-sm text-ink-soft">{orientation.tagline}</p>

      <div className="flex flex-col gap-3">
        {dims.map((d) => {
          const color = shadeFor(orientation, d.score)
          const ev = evidence?.[d.key]
          return (
            <div key={d.key} className="flex items-center gap-4 rounded-2xl border-[2.5px] border-ink bg-paper-hi p-3.5 shadow-chunky-sm">
              <Dial score={d.score} color={color} />
              <div className="min-w-0">
                <p className="serif text-lg font-black leading-tight text-ink">{d.label}</p>
                <p className="mt-0.5 text-sm leading-snug text-ink-soft">{d.blurb}</p>
                {ev && (
                  <p className="mt-1.5 text-xs font-bold leading-snug" style={{ color }}>
                    {ev}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
