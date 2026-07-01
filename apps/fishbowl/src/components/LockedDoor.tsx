// "The locked door": why the blind spot stays shut. High self-Confidence + low
// Receptiveness means the trait that would let you see the problem is the one running
// low, so the door only opens from the outside. Fuses Confidence + Receptiveness (self
// vs team) + the Johari blind words.
function Gauge({ label, value, tone, team }: { label: string; value: number; tone: 'high' | 'low'; team?: number }) {
  const pct = (v: number) => ((Math.min(9, Math.max(1, v)) - 1) / 8) * 100
  const fill = tone === 'high' ? '#efa6c1' : '#b8ab97'
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="kicker text-ink-soft">{label}</span>
        <span className="serif text-sm font-black text-ink">{value.toFixed(1)}</span>
      </div>
      <div className="relative h-3.5 overflow-hidden rounded-full border-2 border-ink bg-paper-hi">
        <div className="h-full" style={{ width: `${pct(value)}%`, backgroundColor: fill }} />
        {typeof team === 'number' && (
          <div className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-blue" style={{ left: `${pct(team)}%` }} title={`team ${team}`} />
        )}
      </div>
    </div>
  )
}

export default function LockedDoor({
  confidence,
  receptiveness,
  blindWords,
}: {
  confidence: number
  receptiveness: { self: number; team: number }
  blindWords: string[]
}) {
  return (
    <div>
      <div className="flex flex-col gap-3.5">
        <Gauge label="Your confidence" value={confidence} tone="high" />
        <Gauge label="Your receptiveness · the lock" value={receptiveness.self} team={receptiveness.team} tone="low" />
      </div>

      <div className="mt-5 flex items-center gap-4 rounded-2xl border-[2.5px] border-ink bg-sand p-4 shadow-chunky-sm">
        <svg width="72" height="104" viewBox="0 0 72 104" className="shrink-0" role="img" aria-label="A locked door">
          <rect x="6" y="4" width="60" height="96" rx="4" fill="#f5eedc" stroke="#2a2420" strokeWidth="2.5" />
          <rect x="13" y="11" width="46" height="82" rx="3" fill="none" stroke="#2a2420" strokeOpacity="0.35" />
          <circle cx="36" cy="52" r="6.5" fill="#2a2420" />
          <rect x="34.2" y="54" width="3.6" height="13" fill="#2a2420" />
          <circle cx="50" cy="56" r="2.5" fill="#b8ab97" stroke="#2a2420" strokeWidth="1" />
        </svg>
        <div className="min-w-0">
          <p className="kicker text-pink-deep">behind the door · they see, you don't</p>
          {blindWords.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {blindWords.map((w) => (
                <span key={w} className="rounded-full border-2 border-ink bg-paper-hi px-2.5 py-1 text-xs font-semibold text-ink">
                  {w}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">Nothing major hidden here yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
