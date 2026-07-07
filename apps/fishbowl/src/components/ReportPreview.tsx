import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import JohariWindow from './JohariWindow'
import ViaDeck from './ViaDeck'
import WatchoutsDeck from './WatchoutsDeck'
import StatBar from './StatBar'
import EnergyOverlay from './EnergyOverlay'
import HatsProfile from './HatsProfile'
import CandorPlot from './CandorPlot'
import SdtProfile from './SdtProfile'
import BelbinReport from './BelbinReport'
import ResponsibilitiesLadder from './ResponsibilitiesLadder'

function MiniAxis({ left, right, leftPct }: { left: string; right: string; leftPct: number }) {
  const leftDom = leftPct >= 50
  const pct = leftDom ? leftPct : 100 - leftPct
  const label = leftDom ? left : right
  const badge = <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-pink text-[11px] font-black text-ink sc-pink">{pct}</span>
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] font-bold">
        <span className={leftDom ? 'text-pink-deep' : 'text-ink-soft'}>{left}</span>
        <span className={!leftDom ? 'text-pink-deep' : 'text-ink-soft'}>{right}</span>
      </div>
      <div className="relative h-9 overflow-hidden rounded-full border-2 border-ink bg-paper-hi">
        <div className={`absolute inset-y-0 ${leftDom ? 'left-0' : 'right-0'} bg-blue`} style={{ width: `${pct}%` }} />
        <div className={`absolute inset-y-0 flex items-center gap-1.5 px-1 ${leftDom ? 'left-0' : 'right-0 flex-row-reverse'}`}>
          {badge}
          <span className="text-sm font-bold text-paper-hi">{label}</span>
        </div>
      </div>
    </div>
  )
}

// A little carousel that flips through sample report slides so visitors can see how
// the Wrapped-style report looks before making a link.
export default function ReportPreview() {
  const [i, setI] = useState(0)
  // Prefer real cropped report screenshots from public/report-preview/<n>.png; fall
  // back to the styled mock slides below when none are present.
  const [imgs, setImgs] = useState<string[]>([])
  useEffect(() => {
    const base = import.meta.env.BASE_URL
    let cancelled = false
    Promise.all(
      Array.from({ length: 8 }, (_, k) =>
        new Promise<string | null>((res) => {
          const src = `${base}report-preview/${k + 1}.png`
          const img = new Image()
          img.onload = () => res(src)
          img.onerror = () => res(null)
          img.src = src
        })
      )
    ).then((r) => {
      if (!cancelled) setImgs(r.filter((x): x is string => x !== null))
    })
    return () => {
      cancelled = true
    }
  }, [])
  const johariTeam = [
    { word: 'confident', count: 5 }, { word: 'bold', count: 4 }, { word: 'logical', count: 4 },
    { word: 'dependable', count: 3 }, { word: 'witty', count: 2 }, { word: 'calm', count: 1 },
  ]
  const viaTeam = [
    { id: 'curiosity', name: 'Curiosity', virtue: 'Wisdom & Knowledge', count: 5 },
    { id: 'leadership', name: 'Leadership', virtue: 'Justice', count: 4 },
    { id: 'perspective', name: 'Perspective', virtue: 'Wisdom & Knowledge', count: 4 },
  ]
  const watchTeam = [
    { word: 'impatient', count: 5 }, { word: 'perfectionist', count: 4 },
  ]
  const statRows = [
    { label: 'Follows through on what they commit to', value: 4.6, percent: 8 },
    { label: 'Communicates clearly under pressure', value: 4.2, percent: 15 },
    { label: 'Makes the people around them better', value: 4.4, percent: 12 },
  ]
  // Energizers are self-only (the team isn't asked), so the preview shows just the
  // subject's markers — team rows carry n:0 so no team dot renders.
  const energyTeam = [
    { id: 'connect', label: 'Talking to people & building relationships', teamMean: 0, n: 0 },
    { id: 'deepwork', label: 'Deep-focus solo work', teamMean: 0, n: 0 },
    { id: 'firefight', label: 'Firefighting & the unexpected', teamMean: 0, n: 0 },
  ]
  const energySelf = { connect: 2, deepwork: 1, firefight: -1 }
  const respRows = [
    { index: 0, label: 'Ship the weekly release', teamTier: 3, n: 5, notes: ['Almost always lands **on time**, even when scope creeps in late.', 'Quietly catches the **edge cases** the rest of us miss.'] },
    { index: 1, label: 'Keep the docs current', teamTier: 1, n: 5, notes: ['Docs tend to **drift a release or two** behind the code.', 'Onboarding from them usually needs a **follow-up call**.'] },
  ]
  const hatsTeam = [
    { key: 'hat_white', label: 'Facts & info', mu: 5, n: 5 },
    { key: 'hat_red', label: 'Feelings & intuition', mu: 6, n: 5 },
    { key: 'hat_black', label: 'Caution & risks', mu: 7, n: 5 },
    { key: 'hat_green', label: 'Creativity & ideas', mu: 4, n: 5 },
  ]
  const hatsSelf = { hat_white: 5, hat_red: 5, hat_black: 6, hat_green: 4 }
  const sdtTeam = [
    { key: 'autonomy', label: 'Autonomy', meanPoints: 18, n: 5 },
    { key: 'competence', label: 'Competence', meanPoints: 24, n: 5 },
    { key: 'relatedness', label: 'Relatedness', meanPoints: 20, n: 5 },
  ]
  const belbinTeam = [
    { key: 'plant', name: 'Plant', cluster: 'Thinking', teamShare: 0.28, n: 5 },
    { key: 'coordinator', name: 'Co-ordinator', cluster: 'People', teamShare: 0.22, n: 5 },
    { key: 'shaper', name: 'Shaper', cluster: 'Action', teamShare: 0.2, n: 5 },
  ]
  const belbinSelf = { plant: 6, coordinator: 4, shaper: 3 }
  const mock = [
    <div key="personality" className="card-3d relative overflow-hidden bg-paper-hi p-6 text-ink">
      <img src={`${import.meta.env.BASE_URL}characters/INFJ.png`} alt="Elsa" className="pointer-events-none absolute -right-3 -top-3 h-40 w-auto select-none object-contain drop-shadow-[3px_3px_0_rgba(42,36,32,0.25)]" />
      <p className="kicker text-pink-deep">your personality type is</p>
      <h3 className="display mt-1 text-3xl leading-tight">The Quiet Storm</h3>
      <p className="serif text-xl tracking-wide text-ink-soft">INFJ-A</p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-sand px-3 py-1 text-sm font-bold text-ink shadow-chunky-sm">🎬 Character match: Jack Sparrow</span>
      <div className="mt-5 flex flex-col gap-3">
        <MiniAxis left="Extraverted" right="Introverted" leftPct={40} />
        <MiniAxis left="Intuitive" right="Observant" leftPct={72} />
        <MiniAxis left="Thinking" right="Feeling" leftPct={33} />
      </div>
    </div>,
    <div key="virtues" className="card-3d bg-paper-hi p-6 text-ink">
      <p className="kicker text-blue-deep">the ten virtues</p>
      <h3 className="display mb-5 text-2xl">Where you balance</h3>
      <div className="flex flex-col gap-5">
        {[
          { name: 'Candor', deficient: 'evasive', excess: 'blunt', team: 58, you: 40 },
          { name: 'Courage', deficient: 'timid', excess: 'reckless', team: 62, you: 70 },
          { name: 'Composure', deficient: 'volatile', excess: 'detached', team: 45, you: 52 },
        ].map((v) => (
          <div key={v.name}>
            <p className="serif mb-1 text-lg font-semibold">{v.name}</p>
            <div className="relative h-3 rounded-full border-2 border-ink bg-sand">
              <div className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-blue" style={{ left: `${v.team}%` }} />
              <div className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-pink sc-pink" style={{ left: `${v.you}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs font-bold text-ink-soft"><span>{v.deficient}</span><span>{v.excess}</span></div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-4 text-xs font-semibold text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-ink bg-blue" />team</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-ink bg-pink" />you</span>
      </div>
    </div>,
    <div key="shine" className="card-3d bg-paper-hi p-6 text-ink">
      <p className="kicker mb-4 text-pink-deep">where you shine</p>
      <div className="flex flex-col gap-3">
        {[
          { label: 'Relentless follow-through', blurb: 'When you commit, it ships. People plan around your reliability.' },
          { label: 'Calm in the storm', blurb: 'The harder things get, the steadier you read to the room.' },
          { label: 'A quietly high bar', blurb: 'You raise the standard without ever making it a lecture.' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border-[2.5px] border-ink bg-sand p-4 shadow-chunky-sm">
            <p className="serif text-lg font-semibold">{s.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.blurb}</p>
          </div>
        ))}
      </div>
    </div>,
    <div key="ratings" className="card-3d bg-paper-hi p-6 text-ink">
      <p className="kicker mb-1 text-pink-deep">at work</p>
      <h3 className="display mb-5 text-2xl">How they rate you</h3>
      <div className="flex flex-col gap-4">
        {statRows.map((s) => <StatBar key={s.label} label={s.label} value={s.value} percent={s.percent} />)}
      </div>
    </div>,
    <div key="balanced" className="card-3d flex flex-col justify-center bg-blue p-7 text-paper-hi sc-navy">
      <p className="kicker text-paper-hi/65">most balanced</p>
      <p className="display mt-2 text-7xl">top 8%</p>
      <p className="serif text-2xl">on composure</p>
      <p className="mt-4 text-sm text-paper-hi/70">Ranked against everyone who's been Fishbowled.</p>
    </div>,
    <div key="appreciate" className="card-3d flex flex-col justify-center bg-sand p-7 text-ink">
      <p className="kicker text-pink-deep">what they appreciate</p>
      <ul className="mt-4 space-y-3 text-base">
        <li className="flex gap-2.5"><span className="text-pink-deep">❤</span> A brilliant, generous mind.</li>
        <li className="flex gap-2.5"><span className="text-pink-deep">❤</span> Dependable under pressure.</li>
        <li className="flex gap-2.5"><span className="text-pink-deep">❤</span> Sets a quietly high standard.</li>
      </ul>
    </div>,
    <div key="energy" className="card-3d bg-paper-hi p-6 text-ink">
      <p className="kicker mb-1 text-pink-deep">energy</p>
      <h3 className="display mb-4 text-2xl">What lifts you, what drains you</h3>
      <EnergyOverlay team={energyTeam} self={energySelf} />
    </div>,
    <div key="resp" className="card-3d bg-paper-hi p-6 text-ink">
      <p className="kicker mb-1 text-pink-deep">their role</p>
      <h3 className="display mb-4 text-2xl">How you deliver</h3>
      <ResponsibilitiesLadder team={respRows} self={null} />
    </div>,
    <div key="hats" className="card-3d bg-paper-hi p-6 text-ink">
      <p className="kicker mb-1 text-blue-deep">thinking style</p>
      <h3 className="display mb-4 text-2xl">Six thinking hats</h3>
      <HatsProfile team={hatsTeam} self={hatsSelf} />
    </div>,
    <div key="candor" className="card-3d bg-paper-hi p-6 text-ink">
      <p className="kicker mb-1 text-pink-deep">feedback style</p>
      <h3 className="display mb-4 text-2xl">Care × challenge</h3>
      <CandorPlot teamCare={7} teamChallenge={6} selfCare={6} selfChallenge={7} />
    </div>,
    <div key="sdt" className="card-3d bg-sand p-6 text-ink">
      <p className="kicker mb-1 text-blue-deep">what you fuel</p>
      <h3 className="display mb-4 text-2xl">What you fuel in others</h3>
      <SdtProfile team={sdtTeam} />
    </div>,
    <div key="belbin" className="card-3d bg-paper-hi p-6 text-ink">
      <p className="kicker mb-1 text-pink-deep">team role</p>
      <h3 className="display mb-4 text-2xl">The roles you play</h3>
      <BelbinReport team={belbinTeam} self={belbinSelf} />
    </div>,
    <div key="via" className="card-3d bg-paper-hi p-6 text-ink">
      <p className="kicker text-blue-deep">signature strengths</p>
      <h3 className="display mb-4 text-2xl">Your top strengths</h3>
      <ViaDeck team={viaTeam} self={['curiosity', 'perspective']} total={5} compact />
    </div>,
    <div key="johari" className="card-3d bg-paper-hi p-6 text-ink">
      <p className="kicker text-pink-deep">the window</p>
      <h3 className="display mb-4 text-2xl">Johari window</h3>
      <JohariWindow teamCounts={johariTeam} self={['confident', 'bold', 'curious', 'kind']} n={5} />
    </div>,
    <div key="watch" className="card-3d bg-paper-hi p-6 text-ink">
      <p className="kicker text-pink-deep">watch-outs</p>
      <h3 className="display mb-4 text-2xl">Your top watch-outs</h3>
      <WatchoutsDeck team={watchTeam} self={['impatient', 'perfectionist', 'self-critical']} total={5} />
    </div>,
    <div key="nohari" className="card-3d bg-paper-hi p-6 text-ink">
      <p className="kicker text-pink-deep">the other window</p>
      <h3 className="display mb-4 text-2xl">Nohari window</h3>
      <JohariWindow teamCounts={watchTeam} self={['impatient', 'perfectionist', 'self-critical']} n={5} dense />
    </div>,
    <div key="archetype" className="card-3d flex flex-col items-center bg-blue p-6 text-center text-paper-hi sc-navy">
      <p className="kicker text-paper-hi/65">your jungian archetype</p>
      <svg viewBox="0 0 64 64" className="mt-3 h-16 w-16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <circle cx="32" cy="32" r="26" />
        <path d="M32 12 L50 44 L14 44 Z" />
        <circle cx="32" cy="33" r="5" fill="currentColor" stroke="none" />
      </svg>
      <h3 className="display mt-3 text-3xl">The Sage</h3>
      <p className="mt-2 text-sm text-paper-hi/80">The seeker of truth who turns experience into wisdom.</p>
      <div className="mt-5 grid w-full grid-cols-2 gap-3 text-left text-sm">
        <div className="rounded-2xl border-2 border-ink bg-paper-hi p-3 text-ink shadow-chunky-sm">
          <p className="kicker text-pink-deep">☀ light</p>
          <p className="mt-1 font-semibold">Clear-eyed, patient, deeply principled.</p>
        </div>
        <div className="rounded-2xl border-2 border-ink bg-ink p-3 text-paper-hi">
          <p className="kicker text-blue">☾ shadow</p>
          <p className="mt-1 font-semibold">Aloof, over-certain, slow to act.</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-paper-hi/60">two sides of the same coin</p>
    </div>,
    <div key="action" className="card-3d bg-pink p-6 text-ink sc-pink">
      <p className="kicker text-ink/70">your move</p>
      <h3 className="display mb-4 text-2xl">Start here</h3>
      <div className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-4 shadow-chunky-sm">
        <p className="kicker text-pink-deep">stop doing now</p>
        <ul className="mt-1 flex flex-col gap-1.5 text-sm">
          <li className="flex gap-2"><span className="text-ink/50">•</span>Saying yes before you've checked your plate.</li>
          <li className="flex gap-2"><span className="text-ink/50">•</span>Rewriting work that was already good enough.</li>
        </ul>
        <p className="kicker mt-4 text-blue-deep">start doing now</p>
        <ul className="mt-1 flex flex-col gap-1.5 text-sm">
          <li className="flex gap-2"><span className="text-ink/50">•</span>Naming the one risk you see before you commit.</li>
          <li className="flex gap-2"><span className="text-ink/50">•</span>Handing off the last 10% to grow the team.</li>
        </ul>
      </div>
    </div>,
    <div key="closing" className="card-3d flex flex-col justify-center bg-ink p-7 text-paper-hi">
      <p className="kicker text-blue">one last thing</p>
      <p className="serif mt-4 text-2xl leading-snug">You don't have to choose between a high bar and bringing people with you. The best version of you does both.</p>
    </div>,
  ]
  const slides = imgs.length
    ? imgs.map((src, k) => <img key={k} src={src} alt={`Report slide ${k + 1}`} className="w-full rounded-[28px] border-[2.5px] border-ink shadow-chunky" />)
    : mock
  const idx = Math.min(i, slides.length - 1)
  const go = (d: number) => setI((c) => (Math.min(c, slides.length - 1) + d + slides.length) % slides.length)
  return (
    <div className="mx-auto max-w-md">
      {/* Fixed-height viewport so the arrows below stay pinned as slides change;
          slides are vertically centered within it. */}
      <div className="flex h-[40rem] overflow-y-auto">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] as const }}
          className="m-auto w-full"
        >
          {slides[idx]}
        </motion.div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-4">
        <button onClick={() => go(-1)} aria-label="Previous" className="press grid h-11 w-11 cursor-pointer place-items-center rounded-full border-[2.5px] border-ink bg-paper-hi text-xl font-black text-ink shadow-chunky-sm">←</button>
        <div className="flex gap-2">
          {slides.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} className={`h-2.5 w-2.5 cursor-pointer rounded-full border-2 border-ink ${k === idx ? 'bg-ink' : 'bg-paper-hi'}`} />
          ))}
        </div>
        <button onClick={() => go(1)} aria-label="Next" className="press grid h-11 w-11 cursor-pointer place-items-center rounded-full border-[2.5px] border-ink bg-pink text-xl font-black text-ink shadow-chunky-sm sc-pink">→</button>
      </div>
    </div>
  )
}
