import { useState } from 'react'
import { PERSONALITY_AXES, type BigFiveScores, type MbtiType } from '@fishbowl/feedback-core'

const ALIGN: Record<string, string> = {
  hero: 'hero energy',
  villain: 'villain energy',
  'anti-hero': 'anti-hero energy',
  mentor: 'mentor energy',
}

function Badge({ n, dom }: { n: number; dom: boolean }) {
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-[2.5px] border-ink text-[13px] font-black ${
        dom ? 'bg-pink text-ink sc-pink' : 'bg-paper-hi text-ink-soft'
      }`}
    >
      {n}
    </span>
  )
}

// A small ⓘ that explains what each of the two poles means. Hover (desktop) or tap.
function PoleInfo({ left, leftInfo, right, rightInfo }: { left: string; leftInfo: string; right: string; rightInfo: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        aria-label={`What ${left} and ${right} mean`}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1.5 inline-grid h-4 w-4 cursor-help place-items-center rounded-full border border-current align-middle text-[10px] font-bold leading-none text-ink-soft opacity-70 hover:opacity-100"
      >
        i
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-xl border-2 border-ink bg-paper-hi px-3 py-2.5 text-left text-xs font-medium normal-case leading-snug tracking-normal text-ink shadow-chunky-sm">
          <span className="block">
            <strong className="font-bold">{left}:</strong> {leftInfo}
          </span>
          <span className="mt-1.5 block">
            <strong className="font-bold">{right}:</strong> {rightInfo}
          </span>
        </span>
      )}
    </span>
  )
}

// One bipolar dimension bar (16Personalities-style). Fills from the dominant pole,
// whose name sits on the filled side; both pole names appear above, with a marker
// on the side you lean to. The ⓘ explains both poles on hover/tap.
function AxisRow({ title, description, left, right, leftInfo, rightInfo, leftPct }: { title: string; description: string; left: string; right: string; leftInfo: string; rightInfo: string; leftPct: number }) {
  const lp = Math.round(leftPct)
  const rp = 100 - lp
  const leftDom = lp >= rp
  return (
    <div>
      <p className="kicker flex items-center justify-center text-ink">
        {title}
        <PoleInfo left={left} leftInfo={leftInfo} right={right} rightInfo={rightInfo} />
      </p>
      <p className="mx-auto mb-2 max-w-xs text-center text-xs leading-snug text-ink-soft">{description}</p>
      <div className="mb-1 flex items-end justify-between text-[12px] font-bold">
        <span className={leftDom ? 'text-pink-deep' : 'text-ink-soft'}>
          {leftDom ? '▾ ' : ''}
          {left}
        </span>
        <span className={!leftDom ? 'text-pink-deep' : 'text-ink-soft'}>
          {right}
          {!leftDom ? ' ▾' : ''}
        </span>
      </div>
      <div className="relative h-11 overflow-hidden rounded-full border-[2.5px] border-ink bg-paper-hi">
        <div className={`absolute inset-y-0 bg-blue ${leftDom ? 'left-0' : 'right-0'}`} style={{ width: `${leftDom ? lp : rp}%` }} />
        <div className="absolute inset-y-0 left-0 flex items-center gap-2 pl-1">
          <Badge n={lp} dom={leftDom} />
          {leftDom && <span className="truncate text-sm font-bold text-paper-hi">{left}</span>}
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-1">
          {!leftDom && <span className="truncate text-sm font-bold text-paper-hi">{right}</span>}
          <Badge n={rp} dom={!leftDom} />
        </div>
      </div>
    </div>
  )
}

// The full self-read card: archetype header + the five dimension bars. `scores`
// drives the bars; `mbti` provides the archetype. No avatar image by design.
export default function PersonalityCard({ mbti, scores }: { mbti: MbtiType; scores: BigFiveScores }) {
  const code = mbti.fullCode ?? mbti.type
  return (
    <div>
      <div className="text-center">
        <p className="kicker text-pink-deep">your type is</p>
        <h2 className="display mt-1 text-[clamp(1.7rem,6vw,2.6rem)] leading-[1.05]">{mbti.nickname}</h2>
        <p className="serif mt-1 text-2xl tracking-wide text-ink-soft">{code}</p>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-soft">{mbti.flavour}</p>
        {mbti.character && (
          <p className="mt-3 text-xs font-semibold text-ink-soft/75">
            in the spirit of {mbti.character}
            {mbti.alignment ? ` · ${ALIGN[mbti.alignment] ?? ''}` : ''}
          </p>
        )}
      </div>
      <div className="mt-7 flex flex-col gap-6">
        {PERSONALITY_AXES.map((ax) => (
          <AxisRow
            key={ax.key}
            title={ax.title}
            description={ax.description}
            left={ax.left}
            right={ax.right}
            leftInfo={ax.leftInfo}
            rightInfo={ax.rightInfo}
            leftPct={ax.leftPct(scores)}
          />
        ))}
      </div>
    </div>
  )
}
