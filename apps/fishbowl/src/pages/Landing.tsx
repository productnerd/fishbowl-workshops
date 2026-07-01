import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { REQUIRED_RESPONSES } from '@fishbowl/feedback-core'
import Card from '../components/Card'
import Button from '../components/Button'
import JohariWindow from '../components/JohariWindow'
import ViaDeck from '../components/ViaDeck'
import WatchoutsDeck from '../components/WatchoutsDeck'
import StatBar from '../components/StatBar'
import EnergyOverlay from '../components/EnergyOverlay'
import HatsProfile from '../components/HatsProfile'
import CandorPlot from '../components/CandorPlot'
import SdtProfile from '../components/SdtProfile'
import BelbinReport from '../components/BelbinReport'
import ResponsibilitiesLadder from '../components/ResponsibilitiesLadder'
import LikertScale from '../components/LikertScale'
import VirtueSlider from '../components/VirtueSlider'
import ChipPicker from '../components/ChipPicker'
import HatsTagger from '../components/HatsTagger'
import AllocationTagger from '../components/AllocationTagger'
import EnergizerTagger from '../components/EnergizerTagger'
import CandorTagger from '../components/CandorTagger'
import { getResponseCount } from '../lib/data'

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] as const },
})

// One beige family, light to dark across the four steps.
const STEPS = [
  { n: '01', emoji: '🔗', bg: 'var(--color-paper-hi)', title: 'Grab your link', body: 'One tap. No account, no setup, nothing to install.' },
  { n: '02', emoji: '🪞', bg: 'var(--color-paper)', title: 'Do your own first', body: 'A quick self-read, about two minutes. Seeing yourself first makes the rest hit harder.' },
  { n: '03', emoji: '💬', bg: 'var(--color-sand)', title: 'Your team weighs in', body: 'They answer anonymously: sliders, quick taps, a few honest words. No names. Ever.' },
  { n: '04', emoji: '🎉', bg: 'var(--color-sand-deep)', title: 'Three in, report out', body: 'The second three teammates answer, your Wrapped pops open.' },
]

type Tone = 'pink' | 'blue' | 'sand' | 'paper'
// The variety of activities, each grounded in an established framework. Sizes vary for
// a bento layout: the personality tile is the 2x2 hero, virtues and feedback span wide.
// Bento uses only blue + beige tones (pink is reserved for primary actions). `key`
// maps to an optional background image at public/bento/<key>.png (emoji fallback).
const FRAMEWORKS: { key: string; title: string; framework: string; blurb: string; tone: Tone; icon: string; cls?: string }[] = [
  { key: 'personality', title: 'Your personality type', framework: 'Big Five → 16 types', blurb: 'Five traits resolve into a type, paired with a Disney hero or villain to match.', tone: 'blue', icon: '🎭', cls: 'col-span-2 lg:row-span-2' },
  { key: 'virtues', title: 'The ten virtues', framework: "Aristotle's golden mean", blurb: 'Every strength, taken too far, becomes a flaw. See where you balance on ten.', tone: 'sand', icon: '⚖️', cls: 'col-span-2' },
  { key: 'hats', title: 'Thinking hats', framework: 'Edward de Bono', blurb: 'Which modes of thinking you reach for.', tone: 'blue', icon: '🎩' },
  { key: 'via', title: 'Signature strengths', framework: 'VIA classification', blurb: 'Your top character strengths.', tone: 'paper', icon: '⭐' },
  { key: 'belbin', title: 'Team role', framework: 'Belbin', blurb: 'The part you play on a team.', tone: 'sand', icon: '🧩' },
  { key: 'johari', title: 'Johari window', framework: 'Luft & Ingham', blurb: 'Your open, blind and hidden selves.', tone: 'blue', icon: '🪟' },
  { key: 'nohari', title: 'Watch-outs', framework: 'The Nohari window', blurb: 'Growth edges, named kindly.', tone: 'sand', icon: '⚠️' },
  { key: 'energy', title: 'Energy map', framework: 'Energizers & drains', blurb: 'What lifts you, what wears you down.', tone: 'paper', icon: '⚡' },
  { key: 'candor', title: 'Feedback style', framework: 'Radical Candor', blurb: 'Do you care personally and challenge directly?', tone: 'blue', icon: '💬', cls: 'col-span-2' },
  { key: 'sdt', title: 'What you fuel', framework: 'Self-Determination Theory', blurb: 'The needs you meet in others.', tone: 'sand', icon: '🔋' },
  { key: 'jungian', title: 'Light & shadow', framework: 'Your Jungian archetype', blurb: 'The two faces of your type.', tone: 'paper', icon: '☯️' },
]

const TONE: Record<Tone, { kicker: string; title: string; blurb: string }> = {
  blue: { kicker: 'text-paper-hi/70', title: 'text-paper-hi', blurb: 'text-paper-hi/85' },
  pink: { kicker: 'text-pink-shadow', title: 'text-ink', blurb: 'text-ink/75' },
  sand: { kicker: 'text-blue-deep', title: 'text-ink', blurb: 'text-ink-soft' },
  paper: { kicker: 'text-blue-deep', title: 'text-ink', blurb: 'text-ink-soft' },
}

const noop = () => {}

// Shrinks a real activity component to fit the card: scales from the top-left and clips
// to a fixed height, so you see the actual UI in miniature.
function Xs({ children, h, scale = 0.6 }: { children: ReactNode; h: string; scale?: number }) {
  return (
    <div className="pointer-events-none overflow-hidden" style={{ height: h }}>
      <div className="origin-top-left" style={{ transform: `scale(${scale})`, width: `${100 / scale}%` }}>
        {children}
      </div>
    </div>
  )
}

// The actual activity UI from the test, extra-small.
function BentoActivity({ kind }: { kind: string }) {
  switch (kind) {
    case 'personality':
      return <Xs h="3.4rem" scale={0.62}><LikertScale value={4} onChange={noop} lowLabel="Not me" highLabel="So me" bipolar /></Xs>
    case 'virtues':
      return <Xs h="3.6rem" scale={0.58}><VirtueSlider value={5} onChange={noop} virtueLabel="Candor" deficientLabel="Evasive" excessiveLabel="Blunt" /></Xs>
    case 'via':
      return <Xs h="4.5rem" scale={0.62}><ChipPicker options={[{ id: 'curiosity', label: 'Curiosity' }, { id: 'humor', label: 'Humor' }, { id: 'bravery', label: 'Bravery' }, { id: 'kindness', label: 'Kindness' }, { id: 'leadership', label: 'Leadership' }]} min={1} max={5} value={['curiosity', 'humor']} onChange={noop} /></Xs>
    case 'johari':
      return <Xs h="4.5rem" scale={0.62}><ChipPicker options={[{ id: 'bold', label: 'bold' }, { id: 'calm', label: 'calm' }, { id: 'witty', label: 'witty' }, { id: 'kind', label: 'kind' }, { id: 'sharp', label: 'sharp' }]} min={1} max={5} value={['bold', 'witty']} onChange={noop} /></Xs>
    case 'nohari':
      return <Xs h="4.5rem" scale={0.62}><ChipPicker options={[{ id: 'impatient', label: 'impatient' }, { id: 'blunt', label: 'blunt' }, { id: 'stubborn', label: 'stubborn' }, { id: 'aloof', label: 'aloof' }]} min={1} max={4} value={['impatient', 'blunt']} onChange={noop} /></Xs>
    case 'hats':
      return <Xs h="6rem" scale={0.5}><HatsTagger value={{ white: 5, red: 6 }} onChange={noop} /></Xs>
    case 'belbin':
      return <Xs h="6rem" scale={0.55}><AllocationTagger buckets={[{ key: 'shaper', label: 'Shaper', sub: 'drives' }, { key: 'plant', label: 'Plant', sub: 'ideas' }, { key: 'finisher', label: 'Finisher', sub: 'wraps up' }]} total={20} value={{ shaper: 8, plant: 7 }} onChange={noop} /></Xs>
    case 'sdt':
      return <Xs h="6rem" scale={0.55}><AllocationTagger buckets={[{ key: 'autonomy', label: 'Autonomy' }, { key: 'mastery', label: 'Mastery' }, { key: 'purpose', label: 'Purpose' }]} total={20} value={{ autonomy: 9, mastery: 6 }} onChange={noop} /></Xs>
    case 'energy':
      return <Xs h="6rem" scale={0.55}><EnergizerTagger value={{ connect: 2, deepwork: -1 }} onChange={noop} /></Xs>
    case 'candor':
      return <Xs h="6rem" scale={0.55}><CandorTagger name="you" value={{}} onChange={noop} /></Xs>
    default:
      return <div className="flex h-6 overflow-hidden rounded-md border-2 border-ink"><div className="flex-1 bg-sand" /><div className="flex-1 bg-blue" /></div>
  }
}

// One bento tile: icon chip above the title, blurb, then a preview of the activity.
// If a cropped screenshot exists at public/bento/<key>.png it shows that exactly;
// otherwise a small hand-built mock of the activity.
function BentoTile({ f, delay }: { f: (typeof FRAMEWORKS)[number]; delay: number }) {
  const t = TONE[f.tone]
  const src = `${import.meta.env.BASE_URL}bento/${f.key}.png`
  const [hasImg, setHasImg] = useState(false)
  useEffect(() => {
    const img = new Image()
    img.onload = () => setHasImg(true)
    img.src = src
  }, [src])
  return (
    <motion.div {...rise(delay)}>
      <Card tone={f.tone} className="relative flex h-full flex-col gap-3 overflow-hidden px-5 pt-5">
        <span aria-hidden className="pointer-events-none absolute -bottom-8 -right-5 select-none text-[11rem] leading-none opacity-[0.13]">
          {f.icon}
        </span>
        <p className={`kicker relative ${t.kicker}`}>{f.framework}</p>
        <div className="relative">
          <h3 className={`font-display text-xl font-black leading-tight ${t.title}`}>{f.title}</h3>
          <p className={`mt-1.5 text-sm leading-relaxed ${t.blurb}`}>{f.blurb}</p>
        </div>
        {/* Activity sits flush against the bottom of the card (no bottom padding). */}
        <div className="relative mt-auto">
          {hasImg ? (
            <img src={src} alt={f.title} className="w-full border-t-2 border-ink object-cover" />
          ) : (
            <BentoActivity kind={f.key} />
          )}
        </div>
      </Card>
    </motion.div>
  )
}

// A faithful mini of a personality dimension bar (matches the report's AxisRow).
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
function ReportPreview() {
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
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-sand px-3 py-1 text-sm font-bold text-ink shadow-chunky-sm">🎬 Disney match: Elsa</span>
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

export default function Landing() {
  const navigate = useNavigate()
  const [mySlug, setMySlug] = useState<string | null>(null)
  const [myCount, setMyCount] = useState(0)

  // If this browser already created a link, change the CTA accordingly.
  useEffect(() => {
    const stored = localStorage.getItem('fishbowl_my_session')
    if (!stored) return
    try {
      const { slug } = JSON.parse(stored)
      if (slug) {
        setMySlug(slug)
        getResponseCount(slug).then(setMyCount)
      }
    } catch {
      localStorage.removeItem('fishbowl_my_session')
    }
  }, [])

  // Returning creators always land on their dashboard (/create), where they see their
  // link, the response count, and the button through to their report once it's ready.
  const ctaLabel = mySlug ? 'Go to my dashboard →' : 'Create your link →'
  const onCta = () => navigate('/create')

  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-5 pb-24 sm:px-8">
      {/* Nav */}
      <motion.nav {...rise(0)} className="flex items-center py-7">
        <span className="display text-2xl">Fishbowl</span>
      </motion.nav>

      {/* Hero */}
      <section className="pt-6 lg:pt-10">
        <div className="max-w-3xl">
          <motion.p {...rise(0.05)} className="kicker mb-5 text-pink-deep">
            honest feedback, minus the cringe
          </motion.p>
          <motion.h1 {...rise(0.12)} className="display text-[clamp(2.8rem,8vw,6rem)] leading-[0.95]">
            See yourself the way your{' '}
            <span className="relative inline-block text-blue-deep">
              team does
              <svg className="absolute -bottom-3 left-0 w-full" height="16" viewBox="0 0 300 16" fill="none" preserveAspectRatio="none">
                <path d="M3 11C70 4 230 3 297 9" stroke="var(--color-pink-deep)" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
          </motion.h1>
          <motion.p {...rise(0.22)} className="mt-9 max-w-xl text-lg leading-relaxed text-ink-soft">
            Your coworkers answer a few honest questions about you, anonymously. We spin it into a report you'll
            actually want to read. Not a score. A <span className="font-semibold text-ink">mirror</span>, from a dozen angles.
          </motion.p>
          <motion.div {...rise(0.3)} className="mt-9">
            <div className="inline-flex flex-col items-center gap-2.5">
              <Button variant="pink" className="!text-xl" onClick={onCta}>
                {mySlug ? (
                  <span className="flex flex-col items-center leading-tight">
                    <span>{ctaLabel}</span>
                    <span className="kicker mt-0.5 text-[11px] text-ink/55">{myCount} of {REQUIRED_RESPONSES} responded</span>
                  </span>
                ) : (
                  ctaLabel
                )}
              </Button>
              <span className="text-sm font-semibold text-ink-soft">FREE · no signup needed</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The activities — a bento of the frameworks we map */}
      <section className="pt-20">
        <motion.div {...rise(0.05)} className="mb-8">
          <p className="kicker mb-2 text-blue-deep">the activities &amp; their frameworks</p>
          <h2 className="display text-4xl sm:text-5xl">Many lenses, one you</h2>
          <p className="mt-3 max-w-xl text-ink-soft">
            A dozen quick activities, each backed by a real framework, mashed into a single report.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FRAMEWORKS.map((f, i) => (
            <BentoTile key={f.key} f={f} delay={0.06 + Math.min(i, 8) * 0.03} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="pt-24">
        <motion.h2 {...rise(0.05)} className="display mb-8 text-4xl sm:text-5xl">
          How it works
        </motion.h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div key={s.n} {...rise(0.12 + i * 0.07)}>
              <div className="card-3d h-full p-6" style={{ background: s.bg }}>
                <div className="flex items-center justify-between">
                  <span className="display text-5xl text-ink opacity-90">{s.n}</span>
                  <span aria-hidden className="text-4xl leading-none">{s.emoji}</span>
                </div>
                <h3 className="serif mt-3 text-2xl font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-ink/75">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="pt-24">
        <motion.h2 {...rise(0.05)} className="display mb-8 text-4xl sm:text-5xl">
          Spotify-Wrapped Style Report
        </motion.h2>
        <motion.p {...rise(0.1)} className="mb-7 max-w-xl text-ink-soft">
          An interactive deck you actually want to swipe through. Flip through a taste.
        </motion.p>
        <ReportPreview />
      </section>

      {/* Footer CTA */}
      <motion.section {...rise(0.05)} className="pt-24">
        <Card tone="pink" className="flex flex-col items-center gap-6 px-6 py-14 text-center">
          <p className="display text-4xl text-ink sm:text-6xl">Ready to look?</p>
          <p className="max-w-md text-lg text-ink/80">
            No names. No logins for them. Just the truth, told kindly.
          </p>
          <Button variant="paper" className="!text-xl" onClick={onCta}>
            {ctaLabel}
          </Button>
        </Card>
        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="kicker text-ink-soft">🐟 Fishbowl · see yourself clearly</p>
          <div className="flex items-center gap-4 text-sm font-semibold text-ink-soft">
            <button onClick={() => navigate('/privacy')} className="cursor-pointer hover:underline">Privacy</button>
            <span aria-hidden>·</span>
            <button onClick={() => navigate('/terms')} className="cursor-pointer hover:underline">Terms</button>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
