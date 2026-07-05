import type { WorkManual as WorkManualData } from '../lib/self'

// "[Name]'s Work Manual" — the operating instructions a thoughtful person hands a new
// teammate. Typed-manual aesthetic (Special Elite), grounded first-person lines from a
// focused AI call. Rendered bare (no Card chrome) so the page reads like a real document.
export default function WorkManual({ name, manual }: { name: string; manual: WorkManualData }) {
  const first = name.split(/\s+/)[0] || name
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-sm border border-ink/25 bg-paper-hi px-6 py-7 shadow-[0_1px_0_rgba(42,36,32,0.15),0_18px_40px_-24px_rgba(42,36,32,0.5)] sm:px-9 sm:py-9">
        {/* masthead */}
        <div className="typewriter">
          <p className="text-[0.62rem] uppercase tracking-[0.34em] text-ink-soft">Operating Manual</p>
          <h2 className="mt-2 text-2xl leading-tight text-ink sm:text-[1.7rem]">
            How to work with {first}
          </h2>
          <div className="mt-3 flex items-center gap-3 text-[0.6rem] uppercase tracking-[0.28em] text-ink-soft">
            <span>Field Guide</span>
            <span className="opacity-50">•</span>
            <span>Rev. {manual.n}</span>
            <span className="opacity-50">•</span>
            <span>First-person</span>
          </div>
        </div>

        {/* double rule */}
        <div className="mt-4 border-t-2 border-double border-ink/35" />

        {/* clauses */}
        <ol className="mt-6 space-y-5">
          {manual.entries.map((e, i) => (
            <li key={e.key} className="typewriter flex gap-3 leading-relaxed">
              <span className="mt-[0.15rem] shrink-0 text-[0.72rem] tabular-nums text-ink-soft/70">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-[0.95rem] text-ink sm:text-base">
                <span className="font-bold">{e.stem} </span>
                {e.text}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-7 border-t border-dashed border-ink/25 pt-3">
          <p className="typewriter text-[0.62rem] uppercase tracking-[0.2em] text-ink-soft/80">
            Compiled from {manual.n} colleague reports + {first}&rsquo;s own read
          </p>
        </div>
      </div>
    </div>
  )
}
