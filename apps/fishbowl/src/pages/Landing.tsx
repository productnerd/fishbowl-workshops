import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { REQUIRED_RESPONSES } from '@fishbowl/feedback-core'
import Card from '../components/Card'
import Button from '../components/Button'
import { getResponseCount } from '../lib/data'

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] as const },
})

const STEPS = [
  { n: '01', tone: 'pink' as const, title: 'Grab your link', body: 'One tap. No account, no setup, nothing to install.' },
  { n: '02', tone: 'blue' as const, title: 'Do your own first', body: 'A quick self-read, about two minutes. Seeing yourself first makes the rest hit harder.' },
  { n: '03', tone: 'sand' as const, title: 'Your team weighs in', body: 'They answer anonymously: sliders, quick taps, a few honest words. No names. Ever.' },
  { n: '04', tone: 'paper' as const, title: 'Three in, report out', body: 'The second three teammates have answered, your Wrapped pops open.' },
]

type Tone = 'pink' | 'blue' | 'sand' | 'paper'
// The variety of activities, each grounded in an established framework. Sizes vary for
// a bento layout: the personality tile is the 2x2 hero, virtues and feedback span wide.
const FRAMEWORKS: { title: string; framework: string; blurb: string; tone: Tone; cls?: string }[] = [
  { title: 'Your personality type', framework: 'Big Five → 16 types', blurb: 'Five traits resolve into a type, paired with a Disney hero or villain to match.', tone: 'blue', cls: 'col-span-2 lg:row-span-2' },
  { title: 'The ten virtues', framework: "Aristotle's golden mean", blurb: 'Every strength, taken too far, becomes a flaw. See where you balance on ten.', tone: 'sand', cls: 'col-span-2' },
  { title: 'Thinking hats', framework: 'Edward de Bono', blurb: 'Which modes of thinking you reach for.', tone: 'pink' },
  { title: 'Signature strengths', framework: 'VIA classification', blurb: 'Your top character strengths.', tone: 'paper' },
  { title: 'Team role', framework: 'Belbin', blurb: 'The part you play on a team.', tone: 'pink' },
  { title: 'Johari window', framework: 'Luft & Ingham', blurb: 'Your open, blind and hidden selves.', tone: 'blue' },
  { title: 'Watch-outs', framework: 'The Nohari window', blurb: 'Growth edges, named kindly.', tone: 'sand' },
  { title: 'Energy map', framework: 'Energizers & drains', blurb: 'What lifts you, what wears you down.', tone: 'paper' },
  { title: 'Feedback style', framework: 'Radical Candor', blurb: 'Do you care personally and challenge directly?', tone: 'blue', cls: 'col-span-2' },
  { title: 'What you fuel', framework: 'Self-Determination Theory', blurb: 'The needs you meet in others.', tone: 'sand' },
  { title: 'Light & shadow', framework: 'Your Jungian archetype', blurb: 'The two faces of your type.', tone: 'pink' },
]

const TONE: Record<Tone, { kicker: string; title: string; blurb: string }> = {
  blue: { kicker: 'text-paper-hi/70', title: 'text-paper-hi', blurb: 'text-paper-hi/85' },
  pink: { kicker: 'text-pink-shadow', title: 'text-ink', blurb: 'text-ink/75' },
  sand: { kicker: 'text-pink-deep', title: 'text-ink', blurb: 'text-ink-soft' },
  paper: { kicker: 'text-blue-deep', title: 'text-ink', blurb: 'text-ink-soft' },
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

  const reportReady = mySlug != null && myCount >= REQUIRED_RESPONSES
  const ctaLabel = !mySlug ? 'Make your link →' : reportReady ? 'Check out report →' : 'See progress →'
  const onCta = () => navigate(!mySlug ? '/create' : reportReady ? `/r/${mySlug}` : '/create')

  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-5 pb-24 sm:px-8">
      {/* Nav */}
      <motion.nav {...rise(0)} className="flex items-center justify-between py-7">
        <span className="display text-2xl">Fishbowl</span>
        <span className="kicker hidden text-ink-soft sm:block">anonymous · honest · yours</span>
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
          <motion.div {...rise(0.3)} className="mt-9 flex flex-col items-start gap-3">
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
            <span className="text-sm font-semibold text-ink-soft">FREE · no sign-up for them</span>
          </motion.div>
        </div>
      </section>

      {/* The activities — a bento of the frameworks we map */}
      <section className="pt-20">
        <motion.div {...rise(0.05)} className="mb-8">
          <p className="kicker mb-2 text-blue-deep">the activities &amp; their frameworks</p>
          <h2 className="display text-4xl sm:text-5xl">Many lenses, one you</h2>
          <p className="mt-3 max-w-xl text-ink-soft">
            Not one quiz. A dozen quick activities, each backed by a real framework, mashed into a single report.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 lg:auto-rows-[12.5rem] lg:grid-cols-4">
          {FRAMEWORKS.map((f, i) => {
            const t = TONE[f.tone]
            return (
              <motion.div key={f.title} {...rise(0.08 + Math.min(i, 8) * 0.04)} className={f.cls ?? ''}>
                <Card tone={f.tone} className="flex h-full flex-col justify-between gap-3 p-5">
                  <p className={`kicker ${t.kicker}`}>{f.framework}</p>
                  <div>
                    <h3 className={`font-display text-xl font-black leading-tight ${t.title}`}>{f.title}</h3>
                    <p className={`mt-1.5 text-sm leading-relaxed ${t.blurb}`}>{f.blurb}</p>
                  </div>
                </Card>
              </motion.div>
            )
          })}
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
              <Card tone={s.tone} className="h-full p-6">
                <span className="display text-5xl opacity-90">{s.n}</span>
                <h3 className="serif mt-3 text-2xl font-semibold">{s.title}</h3>
                <p className={`mt-2 leading-relaxed ${s.tone === 'blue' ? 'text-paper-hi/85' : 'text-ink/75'}`}>
                  {s.body}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="pt-24">
        <motion.h2 {...rise(0.05)} className="display mb-8 text-4xl sm:text-5xl">
          What you actually get
        </motion.h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div {...rise(0.1)} className="lg:row-span-2">
            <Card tone="blue" className="flex h-full flex-col justify-between p-6">
              <p className="kicker text-paper-hi/70">your percentile</p>
              <div>
                <p className="display text-7xl text-paper-hi">8%</p>
                <p className="serif text-2xl text-paper-hi">top, on follow-through</p>
              </div>
              <p className="text-sm text-paper-hi/70">Ranked against everyone who has been Fishbowled.</p>
            </Card>
          </motion.div>
          <motion.div {...rise(0.16)} className="sm:col-span-1 lg:col-span-3">
            <Card tone="paper" className="p-6">
              <p className="kicker mb-3 text-pink-deep">stuff they secretly love about you</p>
              <ul className="space-y-2.5 text-lg">
                <li className="flex gap-3"><span className="text-pink-deep">❤</span> A <span className="font-semibold">brilliant, generous mind</span> who lifts the team.</li>
                <li className="flex gap-3"><span className="text-pink-deep">❤</span> <span className="font-semibold">Dependable under pressure</span>, the steady one in chaos.</li>
                <li className="flex gap-3"><span className="text-pink-deep">❤</span> Quietly sets a <span className="font-semibold">high standard</span> for everyone.</li>
              </ul>
            </Card>
          </motion.div>
          <motion.div {...rise(0.22)} className="lg:col-span-3">
            <Card tone="sand" className="p-6">
              <p className="kicker mb-3 text-ink">one thing to work on</p>
              <p className="serif text-2xl">Slow down before deciding.</p>
              <p className="mt-1 text-ink-soft">Two tiny moves your team is quietly rooting for.</p>
            </Card>
          </motion.div>
        </div>
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
        <p className="mt-10 text-center kicker text-ink-soft">🐟 Fishbowl · see yourself clearly</p>
      </motion.section>
    </div>
  )
}
