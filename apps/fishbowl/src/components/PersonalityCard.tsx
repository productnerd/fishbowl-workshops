import { useState, useEffect } from 'react'
import { PERSONALITY_AXES, type BigFiveScores, type MbtiType } from '@fishbowl/feedback-core'
import InfoDot from './InfoDot'

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
  return (
    <InfoDot label={`What ${left} and ${right} mean`}>
      <span className="block">
        <strong className="font-bold">{left}:</strong> {leftInfo}
      </span>
      <span className="mt-1.5 block">
        <strong className="font-bold">{right}:</strong> {rightInfo}
      </span>
    </InfoDot>
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

// The movie scene as a full-PAGE backdrop (behind all content, above the water layer),
// so the personality view looks like a game screen. Only shows once the art exists.
//   public/backgrounds/<TYPE>.jpg
function PageBackdrop({ type }: { type: string }) {
  const base = import.meta.env.BASE_URL
  const bgSrc = `${base}backgrounds/${type}.jpg`
  const [ok, setOk] = useState(false)
  useEffect(() => {
    setOk(false)
    const b = new Image()
    b.onload = () => setOk(true)
    b.src = bgSrc
  }, [bgSrc])
  if (!ok) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-[5]">
      <img src={bgSrc} alt="" className="h-full w-full object-cover" />
      {/* soft wash so the floating cards and nav stay legible over the scene */}
      <div className="absolute inset-0 bg-paper/35" />
    </div>
  )
}

// The character cut-out (transparent), standing above the type name in the card.
//   public/characters/<TYPE>.png
function CharacterCutout({ type, character }: { type: string; character: string }) {
  const base = import.meta.env.BASE_URL
  const charSrc = `${base}characters/${type}.png`
  const [ok, setOk] = useState(false)
  useEffect(() => {
    setOk(false)
    const c = new Image()
    c.onload = () => setOk(true)
    c.src = charSrc
  }, [charSrc])
  if (!ok) return null
  return (
    <div className="mb-2 flex justify-center">
      <img
        src={charSrc}
        alt={character}
        className="h-44 w-auto object-contain"
        style={{ filter: 'drop-shadow(0 8px 14px rgba(20,20,20,0.35))' }}
      />
    </div>
  )
}

// The full self-read card: optional character hero, archetype header, five dimension bars.
export default function PersonalityCard({ mbti, scores }: { mbti: MbtiType; scores: BigFiveScores }) {
  const code = mbti.fullCode ?? mbti.type
  return (
    <div>
      <PageBackdrop type={mbti.type} />
      <CharacterCutout type={mbti.type} character={mbti.character || ''} />
      <div className="text-center">
        <p className="kicker text-pink-deep">your type is</p>
        <h2 className="display mt-1 text-[clamp(1.7rem,6vw,2.6rem)] leading-[1.05]">{mbti.nickname}</h2>
        <p className="serif mt-1 text-2xl tracking-wide text-ink-soft">{code}</p>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-soft">{mbti.flavour}</p>
        {mbti.character && (
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-sand px-3.5 py-1.5 text-sm font-bold text-ink shadow-chunky-sm">
              <span aria-hidden>🎬</span>
              Your Disney match: {mbti.character}
              {mbti.alignment ? <span className="font-semibold text-ink-soft">· {ALIGN[mbti.alignment] ?? ''}</span> : null}
            </span>
          </div>
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
