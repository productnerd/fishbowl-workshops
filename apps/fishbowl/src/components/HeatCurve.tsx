// Heat of the moment: composure drawn against rising pressure. The team's line bends
// toward snapping (short-fused) or caving (pushover) as heat climbs, positioned by the
// conflict tendency; your own line stays flat because you don't feel it happening. Two
// hat chips (Red = feelings, Black = caution) name why the break is emotional not analytical.
export default function HeatCurve({
  teamComposure,
  selfComposure,
  direction,
}: {
  teamComposure: number
  selfComposure: number
  direction: 'snap' | 'cave' | 'steady'
}) {
  const x0 = 26
  const x1 = 304
  const yTop = 22
  const yBot = 182
  // band 0 = cave (bottom), 0.5 = hold (middle), 1 = snap (top)
  const y = (band: number) => yBot - Math.min(1, Math.max(0, band)) * (yBot - yTop)
  const mag = Math.min(0.42, Math.abs(teamComposure - 5) / 8)
  const endBand = direction === 'snap' ? 0.5 + mag : direction === 'cave' ? 0.5 - mag : 0.5
  const selfBand = Math.min(0.85, Math.max(0.15, 0.5 + (selfComposure - 5) / 12))
  const teamPath = `M${x0} ${y(0.5)} Q${(x0 + x1) / 2} ${y(0.5)} ${x1} ${y(endBand)}`

  return (
    <div>
      <svg viewBox="0 0 320 210" className="block w-full" role="img" aria-label="Composure against rising pressure">
        {/* zones */}
        <text x={x0} y={yTop - 6} fontSize={9} fontWeight={700} fill="#d9734a">snap</text>
        <text x={x0} y={(yTop + yBot) / 2 + 3} fontSize={9} fontWeight={700} fill="#2f9e7a">hold</text>
        <text x={x0} y={yBot + 12} fontSize={9} fontWeight={700} fill="#c98b3f">cave</text>
        {/* axes */}
        <line x1={x0} y1={yBot} x2={x1} y2={yBot} stroke="#2a2420" strokeOpacity={0.25} />
        <line x1={x0} y1={yTop} x2={x0} y2={yBot} stroke="#2a2420" strokeOpacity={0.25} />
        {/* self flat line */}
        <line x1={x0} y1={y(selfBand)} x2={x1} y2={y(selfBand)} stroke="#a83f6f" strokeWidth={2} strokeDasharray="4 3" />
        {/* team bending curve */}
        <path d={teamPath} fill="none" stroke="#2a2420" strokeWidth={2.6} />
        <circle cx={x1} cy={y(endBand)} r={4.5} fill="#2a2420" />
        {/* hat chips at the hot end */}
        <g>
          <circle cx={x1 - 34} cy={y(endBand) - 16} r={6} fill="#e0607d" stroke="#2a2420" strokeWidth={1.5} />
          <circle cx={x1 - 18} cy={y(endBand) - 16} r={6} fill="#333333" stroke="#2a2420" strokeWidth={1.5} />
        </g>
        <text x={(x0 + x1) / 2} y={yBot + 24} fontSize={10} fontWeight={600} fill="#5a4f45" textAnchor="middle">pressure rising →</text>
      </svg>
      <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-ink" /> how the team sees you bend</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-pink" /> how steady you think you stay</span>
      </div>
    </div>
  )
}
