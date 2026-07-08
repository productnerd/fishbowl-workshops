import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import HatsProfile from './HatsProfile'
import CandorPlot from './CandorPlot'
import BelbinReport from './BelbinReport'
import WatchoutsDeck from './WatchoutsDeck'

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

// A compact golden-mean dartboard for the sample: dots are dimensions, the dashed ring is
// how close you sit to the centre on average (the score).
function MiniDartboard() {
  const R = 66
  const pts = [0.9, 0.55, 0.75, 0.4, 0.82, 0.6, 0.7, 0.5].map((goodness, i, a) => {
    const rad = (1 - goodness) * R
    const ang = (i / a.length) * Math.PI * 2 - Math.PI / 2
    return { x: 80 + rad * Math.cos(ang), y: 80 + rad * Math.sin(ang), c: i % 2 ? '#a83f6f' : '#dcae3d' }
  })
  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" aria-hidden>
      <defs>
        <radialGradient id="pvGold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f3da85" />
          <stop offset="30%" stopColor="#dcae3d" />
          <stop offset="62%" stopColor="#e2d4b6" />
          <stop offset="100%" stopColor="#dcb9c6" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="80" r={R} fill="url(#pvGold)" stroke="#2a2420" strokeWidth={2.5} />
      <circle cx="80" cy="80" r={R * 0.66} fill="none" stroke="#2a2420" strokeOpacity={0.16} />
      <circle cx="80" cy="80" r={R * 0.33} fill="none" stroke="#2a2420" strokeOpacity={0.16} />
      <circle cx="80" cy="80" r={5} fill="#8f6a1c" />
      <circle cx="80" cy="80" r={R * 0.42} fill="none" stroke="#2a2420" strokeWidth={2} strokeDasharray="5 4" strokeOpacity={0.85} />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill={p.c} stroke="#2a2420" strokeOpacity={0.55} />
      ))}
    </svg>
  )
}

// A little carousel of sample report slides so visitors see how the Wrapped-style report
// looks before making a link. Shows a spread of the visual types, not every slide; the rest
// are listed below. The chapter label sits above the card and changes with the slide.
export default function ReportPreview() {
  const [i, setI] = useState(0)

  const hatsTeam = [
    { key: 'hat_white', label: 'Facts & info', mu: 5, n: 5 },
    { key: 'hat_red', label: 'Feelings & intuition', mu: 6, n: 5 },
    { key: 'hat_black', label: 'Caution & risks', mu: 7, n: 5 },
    { key: 'hat_green', label: 'Creativity & ideas', mu: 4, n: 5 },
  ]
  const hatsSelf = { hat_white: 5, hat_red: 5, hat_black: 6, hat_green: 4 }
  const belbinTeam = [
    { key: 'plant', name: 'Plant', cluster: 'Thinking', teamShare: 0.28, n: 5 },
    { key: 'coordinator', name: 'Co-ordinator', cluster: 'People', teamShare: 0.22, n: 5 },
    { key: 'shaper', name: 'Shaper', cluster: 'Action', teamShare: 0.2, n: 5 },
  ]
  const belbinSelf = { plant: 6, coordinator: 4, shaper: 3 }
  const watchTeam = [{ word: 'impatient', count: 5 }, { word: 'perfectionist', count: 4 }]

  // sec-ordered sample: chapter label + the slide node. One or two per section, chosen so
  // every card is a different kind of visual.
  const SLIDES: { chapter: string; node: ReactNode }[] = [
    {
      chapter: '1 · How you see yourself',
      node: (
        <div className="card-3d relative overflow-hidden bg-paper-hi p-6 text-ink">
          <img src={`${import.meta.env.BASE_URL}characters/INFJ.webp`} alt="" aria-hidden className="pointer-events-none absolute -right-3 -top-3 h-40 w-auto select-none object-contain drop-shadow-[3px_3px_0_rgba(42,36,32,0.25)]" />
          <p className="kicker text-pink-deep">your personality type is</p>
          <h3 className="display mt-1 text-3xl leading-tight">The Quiet Storm</h3>
          <p className="serif text-xl tracking-wide text-ink-soft">INFJ-A</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-sand px-3 py-1 text-sm font-bold text-ink shadow-chunky-sm">🎬 Character match: Molly Weasley</span>
          <div className="mt-5 flex flex-col gap-3">
            <MiniAxis left="Extraverted" right="Introverted" leftPct={40} />
            <MiniAxis left="Intuitive" right="Observant" leftPct={72} />
            <MiniAxis left="Thinking" right="Feeling" leftPct={33} />
          </div>
        </div>
      ),
    },
    {
      chapter: '1 · How you see yourself',
      node: (
        <div className="card-3d flex flex-col items-center bg-ink p-6 text-center text-paper-hi">
          <p className="kicker text-blue">your jungian archetype</p>
          <h3 className="display mt-3 text-3xl text-paper-hi">The Sage</h3>
          <p className="serif mt-1 text-lg text-paper-hi/80">The seeker who turns experience into wisdom.</p>
          <div className="mt-5 grid w-full grid-cols-2 gap-3 text-left text-sm">
            <div className="rounded-2xl border-2 border-[#e8c86a] bg-paper-hi p-3 text-ink shadow-[0_0_22px_rgba(240,196,25,0.28)]">
              <p className="kicker text-[#a9781f]">☀ light</p>
              <p className="mt-1 font-semibold">Clear-eyed, patient, deeply principled.</p>
            </div>
            <div className="rounded-2xl border-2 border-paper-hi/25 bg-black/45 p-3">
              <p className="kicker text-paper-hi/45">☾ shadow</p>
              <p className="mt-1 font-semibold text-paper-hi/70">Aloof, over-certain, slow to act.</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-paper-hi/60">With a touch of the Creator.</p>
        </div>
      ),
    },
    {
      chapter: '2 · How the team sees you',
      node: (
        <div className="card-3d bg-paper-hi p-6 text-ink">
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
        </div>
      ),
    },
    {
      chapter: '2 · How the team sees you',
      node: (
        <div className="card-3d flex flex-col justify-center bg-blue p-7 text-paper-hi sc-navy">
          <p className="kicker text-paper-hi/65">most balanced</p>
          <p className="display mt-2 text-7xl">top 8%</p>
          <p className="serif text-2xl">on composure</p>
          <p className="mt-4 text-sm text-paper-hi/70">Ranked against everyone who's been Fishbowled.</p>
        </div>
      ),
    },
    {
      chapter: '3 · How you operate',
      node: (
        <div className="card-3d bg-paper-hi p-6 text-ink">
          <p className="kicker mb-1 text-blue-deep">thinking style</p>
          <h3 className="display mb-4 text-2xl">Six thinking hats</h3>
          <HatsProfile team={hatsTeam} self={hatsSelf} />
        </div>
      ),
    },
    {
      chapter: '3 · How you operate',
      node: (
        <div className="card-3d bg-paper-hi p-6 text-ink">
          <p className="kicker mb-1 text-pink-deep">feedback style</p>
          <h3 className="display mb-4 text-2xl">Care × challenge</h3>
          <CandorPlot teamCare={7} teamChallenge={6} selfCare={6} selfChallenge={7} />
        </div>
      ),
    },
    {
      chapter: '3 · How you operate',
      node: (
        <div className="card-3d bg-paper-hi p-6 text-ink">
          <p className="kicker mb-1 text-pink-deep">team role</p>
          <h3 className="display mb-4 text-2xl">The roles you play</h3>
          <BelbinReport team={belbinTeam} self={belbinSelf} />
        </div>
      ),
    },
    {
      chapter: '4 · Where the gaps are',
      node: (
        <div className="card-3d bg-paper-hi p-6 text-ink">
          <p className="kicker text-pink-deep">watch-outs</p>
          <h3 className="display mb-4 text-2xl">Your top watch-outs</h3>
          <WatchoutsDeck team={watchTeam} self={['impatient', 'perfectionist', 'self-critical']} total={5} />
        </div>
      ),
    },
    {
      chapter: '5 · The warm part',
      node: (
        <div className="card-3d flex flex-col justify-center bg-sand p-7 text-ink">
          <p className="kicker text-pink-deep">what they appreciate</p>
          <ul className="mt-4 space-y-3 text-base">
            <li className="flex gap-2.5"><span className="text-pink-deep">❤</span> A brilliant, generous mind.</li>
            <li className="flex gap-2.5"><span className="text-pink-deep">❤</span> Dependable under pressure.</li>
            <li className="flex gap-2.5"><span className="text-pink-deep">❤</span> Sets a quietly high standard.</li>
          </ul>
        </div>
      ),
    },
    {
      chapter: '5 · The warm part',
      node: (
        <div className="card-3d bg-paper-hi p-6 text-ink">
          <p className="kicker text-pink-deep">the golden mean</p>
          <h3 className="display mb-4 text-2xl">The Golden Score</h3>
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <span className="display text-6xl leading-none" style={{ color: '#b8892a' }}>78</span>
              <p className="kicker text-ink-soft">out of 100</p>
            </div>
            <MiniDartboard />
          </div>
          <p className="mt-3 text-sm text-ink-soft">How close you sit to the virtuous middle, across all ten virtues and six hats.</p>
        </div>
      ),
    },
    {
      chapter: '6 · What to do with it',
      node: (
        <div className="card-3d bg-pink p-6 text-ink sc-pink">
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
        </div>
      ),
    },
  ]

  // The rest of the report, listed under the dots so the sample reads as a taste, not the whole.
  const alsoIncluded = [
    'Your trait profile', 'Where you shine', 'Competency ratings', 'What you deliver',
    'Your energy map', 'What you fuel in others', 'Signature strengths', 'Johari & Nohari',
    'Blind spots', 'A day in four rooms', 'Heat of the moment', 'A letter from your team',
    'The full read', 'Your work manual',
  ]

  const idx = Math.min(i, SLIDES.length - 1)
  const cur = SLIDES[idx]
  const go = (d: number) => setI((c) => (Math.min(c, SLIDES.length - 1) + d + SLIDES.length) % SLIDES.length)

  return (
    <div className="mx-auto max-w-md">
      {/* Chapter label, above the card, changing with the slide */}
      <div className="mb-3 h-5 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="kicker text-ink-soft"
          >
            chapter {cur.chapter}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Fixed-height viewport so the arrows below stay pinned as slides change */}
      <div className="flex h-[38rem] overflow-y-auto">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] as const }}
          className="m-auto w-full"
        >
          {cur.node}
        </motion.div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-4">
        <button onClick={() => go(-1)} aria-label="Previous" className="press grid h-11 w-11 cursor-pointer place-items-center rounded-full border-[2.5px] border-ink bg-paper-hi text-xl font-black text-ink shadow-chunky-sm">←</button>
        <div className="flex gap-2">
          {SLIDES.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} className={`h-2.5 w-2.5 cursor-pointer rounded-full border-2 border-ink ${k === idx ? 'bg-ink' : 'bg-paper-hi'}`} />
          ))}
        </div>
        <button onClick={() => go(1)} aria-label="Next" className="press grid h-11 w-11 cursor-pointer place-items-center rounded-full border-[2.5px] border-ink bg-pink text-xl font-black text-ink shadow-chunky-sm sc-pink">→</button>
      </div>

      {/* Everything the sample doesn't show, so the depth still reads */}
      <div className="mt-6 rounded-2xl border-2 border-ink/15 bg-paper-hi/60 px-5 py-4">
        <p className="kicker mb-2 text-ink-soft">the full report also includes</p>
        <ul className="grid grid-cols-2 gap-x-5 gap-y-1 text-sm text-ink-soft">
          {alsoIncluded.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-ink/40">•</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
