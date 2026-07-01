import Rich from './Rich'

// The spine of the whole report, as one small flow: archetype + two driving signals
// -> the single tension they create. The AI hands us the three parts; this renders
// them as a compact diagram so the "so what" is a picture, not a paragraph.
export default function ThroughLine({ from, via, to }: { from: string; via: string[]; to: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
        <span className="rounded-full border-[2.5px] border-ink bg-pink px-4 py-2 font-display text-lg font-black text-ink shadow-chunky-sm sc-pink">
          {from}
        </span>
        <span className="px-1 text-2xl font-black text-ink-soft">+</span>
        <div className="flex flex-wrap gap-2">
          {via.map((v, i) => (
            <span key={i} className="rounded-full border-2 border-ink bg-sand px-3 py-1.5 text-sm font-semibold text-ink">
              {v}
            </span>
          ))}
        </div>
      </div>
      <div className="my-5 flex items-center gap-2 text-pink-deep">
        <span className="text-3xl leading-none">↓</span>
        <span className="kicker">which means</span>
      </div>
      <p className="serif text-[1.7rem] font-semibold leading-snug text-ink">
        <Rich text={to} />
      </p>
    </div>
  )
}
