type Room = { label: string; behavior: string; verdict: 'balanced' | 'off'; hatLabel: string; hatColor: string }

// "A day in four rooms": the same person across four situations (a meeting, conflict,
// a slipping deadline, receiving feedback). Each room shows the dominant thinking-hat
// colour and how the team reads your move there; the border lights amber on the room
// where your balance breaks. Fuses the 3 scenarios + hats.
export default function FourRooms({ rooms }: { rooms: Room[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {rooms.map((r, i) => {
        const off = r.verdict === 'off'
        return (
          <div
            key={i}
            className={`rounded-2xl border-[2.5px] p-3.5 shadow-chunky-sm ${off ? 'bg-paper-hi' : 'bg-sand'}`}
            style={{ borderColor: off ? '#c9683f' : '#2a2420' }}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-ink" style={{ backgroundColor: r.hatColor }} />
              <span className="kicker text-ink">{r.label}</span>
            </div>
            <p className="serif mt-2 text-sm font-semibold leading-snug text-ink">{r.behavior}</p>
            <p className="mt-1.5 text-[11px] font-black uppercase tracking-wide" style={{ color: off ? '#c9683f' : '#2f9e7a' }}>
              {off ? '⚠ off-balance' : '✓ balanced'}
            </p>
          </div>
        )
      })}
    </div>
  )
}
