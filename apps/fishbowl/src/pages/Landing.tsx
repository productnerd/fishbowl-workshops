import { useState } from 'react'
import { motion } from 'framer-motion'
import Card from '../components/Card'
import Button from '../components/Button'
import VirtueSlider from '../components/VirtueSlider'

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] as const },
})

const STEPS = [
  { n: '01', tone: 'red' as const, title: 'Share one link', body: 'Send it to five or more colleagues. It takes them about five minutes.' },
  { n: '02', tone: 'cyan' as const, title: 'They answer anonymously', body: 'Sliders, quick scales, and a few honest words. No names. Ever.' },
  { n: '03', tone: 'sand' as const, title: 'Get your Wrapped', body: 'An interactive report: your strengths, your blind spots, and where you land.' },
]

export default function Landing() {
  const [demo, setDemo] = useState(4)

  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-5 pb-24 sm:px-8">
      {/* Nav */}
      <motion.nav {...rise(0)} className="flex items-center justify-between py-7">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border-[2.5px] border-ink bg-cyan text-xl shadow-chunky-sm">
            🐟
          </span>
          <span className="display text-2xl">Fishbowl</span>
        </div>
        <span className="kicker hidden text-ink-soft sm:block">anonymous · honest · yours</span>
      </motion.nav>

      {/* Hero */}
      <section className="grid items-center gap-10 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:pt-12">
        <div>
          <motion.p {...rise(0.05)} className="kicker mb-5 text-red-deep">
            workplace feedback, reimagined
          </motion.p>
          <motion.h1 {...rise(0.12)} className="display text-[clamp(3rem,9vw,6.5rem)]">
            See yourself
            <br />
            the way your
            <br />
            <span className="relative inline-block text-red">
              team does
              <svg className="absolute -bottom-3 left-0 w-full" height="16" viewBox="0 0 300 16" fill="none" preserveAspectRatio="none">
                <path d="M3 11C70 4 230 3 297 9" stroke="var(--color-cyan)" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
            .
          </motion.h1>
          <motion.p {...rise(0.22)} className="mt-9 max-w-md text-lg leading-relaxed text-ink-soft">
            Your colleagues answer a few honest questions about you, anonymously. We turn it into a
            report worth reading: not a score, a <span className="font-semibold text-ink">mirror</span>.
          </motion.p>
          <motion.div {...rise(0.3)} className="mt-9 flex flex-wrap items-center gap-4">
            <Button variant="red" className="!text-xl">
              Make your link →
            </Button>
            <span className="text-sm font-semibold text-ink-soft">Free · no sign-up for them</span>
          </motion.div>
        </div>

        {/* Virtue slider teaser */}
        <motion.div {...rise(0.4)}>
          <Card tone="paper" className="p-6 sm:p-7">
            <p className="kicker mb-1 text-cyan-deep">the idea</p>
            <p className="serif mb-5 text-2xl leading-tight">
              Every strength, taken too far, becomes a flaw.
            </p>
            <VirtueSlider
              id="demo-courage"
              value={demo}
              onChange={setDemo}
              virtueLabel="Courage"
              deficientLabel="Timid"
              excessiveLabel="Reckless"
            />
            <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">
              Your team places you between two extremes. The <span className="font-semibold text-cyan-deep">sweet spot is the middle</span> — and Fishbowl shows you exactly where you land on ten of them.
            </p>
          </Card>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="pt-24">
        <motion.h2 {...rise(0.05)} className="display mb-8 text-4xl sm:text-5xl">
          How it works
        </motion.h2>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div key={s.n} {...rise(0.12 + i * 0.08)}>
              <Card tone={s.tone} className="h-full p-6">
                <span className="display text-5xl opacity-90">{s.n}</span>
                <h3 className="serif mt-3 text-2xl font-semibold">{s.title}</h3>
                <p className={`mt-2 leading-relaxed ${s.tone === 'red' ? 'text-paper-hi/90' : 'text-ink-soft'}`}>
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
          What you walk away with
        </motion.h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div {...rise(0.1)} className="lg:row-span-2">
            <Card tone="ink" className="flex h-full flex-col justify-between p-6">
              <p className="kicker text-cyan">your percentile</p>
              <div>
                <p className="display text-7xl text-cyan">8%</p>
                <p className="serif text-2xl text-paper-hi">top, on follow-through</p>
              </div>
              <p className="text-sm text-paper-hi/70">Ranked against everyone who has been Fishbowled.</p>
            </Card>
          </motion.div>
          <motion.div {...rise(0.16)} className="sm:col-span-1 lg:col-span-3">
            <Card tone="paper" className="p-6">
              <p className="kicker mb-3 text-red-deep">three things they appreciate</p>
              <ul className="space-y-2.5 text-lg">
                <li className="flex gap-3"><span className="text-red">❤</span> A <span className="font-semibold">brilliant, generous mind</span> who lifts the team.</li>
                <li className="flex gap-3"><span className="text-red">❤</span> <span className="font-semibold">Dependable under pressure</span>, the steady one in chaos.</li>
                <li className="flex gap-3"><span className="text-red">❤</span> Quietly sets a <span className="font-semibold">high standard</span> for everyone.</li>
              </ul>
            </Card>
          </motion.div>
          <motion.div {...rise(0.22)} className="lg:col-span-3">
            <Card tone="sand" className="p-6">
              <p className="kicker mb-3 text-ink">a growth edge</p>
              <p className="serif text-2xl">Slow down before deciding.</p>
              <p className="mt-1 text-ink-soft">Two small, specific moves your team is quietly hoping for.</p>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <motion.section {...rise(0.05)} className="pt-24">
        <Card tone="red" className="flex flex-col items-center gap-6 px-6 py-14 text-center">
          <p className="display text-4xl text-paper-hi sm:text-6xl">Ready to look?</p>
          <p className="max-w-md text-lg text-paper-hi/90">
            No names. No logins for them. Just the truth, told kindly.
          </p>
          <Button variant="paper" className="!text-xl">
            Make your link →
          </Button>
        </Card>
        <p className="mt-10 text-center kicker text-ink-soft">🐟 Fishbowl · see yourself clearly</p>
      </motion.section>
    </div>
  )
}
