import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  REQUIRED_RESPONSES,
  buildShareLink,
  type VirtueScores,
  type HatScores,
} from '@fishbowl/feedback-core'
import { getResponseCount, getSession } from '../lib/data'
import { sessionTopicKey } from '../lib/sessionTopic'
import {
  getSelfReport,
  synthesisPoll,
  getWorkManual,
  type SelfData,
  type SelfSynthesis,
  type WorkManual,
} from '../lib/self'
import { useAiInsights } from '../lib/aiInsights'
import { computeGolden } from '../lib/goldenScore'
import GoldenScore from '../components/GoldenScore'
import GoldenBreakdown from '../components/GoldenBreakdown'
import OneOnOne from '../components/OneOnOne'
import StickyNote from '../components/StickyNote'
import WorkManualDoc from '../components/WorkManual'
import Card from '../components/Card'
import Button from '../components/Button'

// A stable, bookmarkable per-session dashboard: /#/dashboard/:slug. Reads the session
// from the URL (not a single mutable localStorage slot), so it can't be clobbered by a
// second session or a colleague's survey, and it survives cleared storage.
//
// Before the report unlocks this is a to-do list (take yours, share your link). After it
// unlocks the job changes completely: it becomes a standing summary of the report, and
// the share link demotes to a footnote (you already have enough answers).
export default function Dashboard() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const [creator, setCreator] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [selfDone, setSelfDone] = useState(false)
  const [self, setSelf] = useState<SelfData | null>(null)
  const [synthesis, setSynthesis] = useState<SelfSynthesis | null>(null)
  const [manual, setManual] = useState<WorkManual | null>(null)
  const [copied, setCopied] = useState(false)
  // Which reference doc is open over the board, if any.
  const [openDoc, setOpenDoc] = useState<'golden' | 'oneOnOne' | 'manual' | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    getSession(slug).then((s) => {
      if (!s) {
        setNotFound(true)
        // Drop a stale "my session" pointer to this dead slug so /create doesn't bounce
        // right back here in a loop.
        try {
          const m = JSON.parse(localStorage.getItem('fishbowl_my_session') || 'null')
          if (m?.slug === slug) localStorage.removeItem('fishbowl_my_session')
        } catch {
          /* ignore */
        }
      } else {
        setCreator(s.creator_name)
        setSessionId(s.id)
        setSelfDone(Boolean(s.self_completed_at))
      }
      setLoading(false)
    })
    getResponseCount(slug).then(setCount)
  }, [slug])

  const unlocked = count >= REQUIRED_RESPONSES

  // Same source the report uses, so the numbers here can never disagree with it.
  const { insights } = useAiInsights(sessionId ?? undefined, count, Boolean(sessionId) && unlocked)

  // The self-read is what makes the Golden Score match the report's exactly (it blends
  // both sides). Without a bearer this quietly returns nothing and we fall back to the
  // team-only read.
  useEffect(() => {
    if (!slug || !unlocked) return
    let cancelled = false
    getSelfReport(slug).then((r) => {
      if (cancelled || !r.hasSelf) return
      setSelf(r.self)
      // Status-only read: shows the 1:1 points if the deep read already exists, and
      // never kicks off a (slow, expensive) generation just to fill a dashboard card.
      synthesisPoll(slug).then((s) => {
        if (!cancelled && s.synthesis) setSynthesis(s.synthesis)
      })
      getWorkManual(slug, count).then((m) => {
        if (!cancelled) setManual(m)
      })
    })
    return () => {
      cancelled = true
    }
  }, [slug, unlocked, count])

  const copy = async () => {
    if (!slug) return
    await navigator.clipboard.writeText(buildShareLink(slug, sessionTopicKey(slug)))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const startNew = () => {
    try {
      localStorage.removeItem('fishbowl_my_session')
      localStorage.removeItem('fishbowl_subject_auth')
      localStorage.removeItem('fishbowl_pending_self')
    } catch {
      /* storage unavailable */
    }
    navigate('/create')
  }

  if (loading) return null
  if (!slug || notFound) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-lg place-items-center px-5 text-center">
        <div>
          <div className="text-6xl">🐟</div>
          <h1 className="display mt-4 text-4xl">No Fishbowl here.</h1>
          <p className="mt-2 text-ink-soft">That link doesn't point to a session.</p>
          <div className="mt-6">
            <Button variant="pink" onClick={() => navigate('/create')} className="!text-lg">
              Create your link →
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const remaining = Math.max(0, REQUIRED_RESPONSES - count)
  const pct = Math.min(100, (count / REQUIRED_RESPONSES) * 100)

  const sp = (self?.self_payload ?? {}) as Record<string, unknown>
  const golden = insights
    ? computeGolden(
        insights.virtues,
        insights.hats ?? [],
        (sp.virtues as VirtueScores) ?? null,
        (sp.hats as HatScores) ?? null
      )
    : null
  const strengths = (insights?.topStrengths ?? []).slice(0, 3)
  const watchouts = (insights?.nohari?.counts ?? []).filter((c) => c.count >= 2).slice(0, 3)
  const stopNow = insights?.actionPlan?.stopNow ?? []
  const startNow = insights?.actionPlan?.startNow ?? []
  const oneOnOne = (synthesis?.oneOnOne ?? []).slice(0, 3)
  const biases = synthesis?.biases ?? []
  const manualEntries = manual?.entries ?? []

  // Everything after the report unlocks: the summary IS the page.
  const summary = (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker mb-2 text-pink-deep">your report is ready</p>
          <h1 className="display text-4xl">Hey {creator}.</h1>
          <p className="mt-1 text-ink-soft">
            The short version, from {count} {count === 1 ? 'colleague' : 'colleagues'}.
          </p>
        </div>

        {/* Reference docs: top-right on desktop, wrapping under the greeting when narrow. */}
        {(oneOnOne.length > 0 || manualEntries.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {oneOnOne.length > 0 && (
              <button
                onClick={() => setOpenDoc('oneOnOne')}
                className="press cursor-pointer rounded-full border-[2.5px] border-ink bg-paper-hi px-4 py-2 font-display text-sm font-black text-ink shadow-chunky-sm"
              >
                📋 For your next 1:1
              </button>
            )}
            {manualEntries.length > 0 && (
              <button
                onClick={() => setOpenDoc('manual')}
                className="press cursor-pointer rounded-full border-[2.5px] border-ink bg-paper-hi px-4 py-2 font-display text-sm font-black text-ink shadow-chunky-sm"
              >
                📖 Your work manual
              </button>
            )}
          </div>
        )}
      </div>

      {/* Always in reach while scanning the board, never competing with the content. */}
      <button
        onClick={() => navigate(`/r/${slug}`)}
        className="press sc-pink fixed bottom-5 right-5 z-40 cursor-pointer rounded-full border-[2.5px] border-ink bg-pink px-4 py-2 font-display text-sm font-black text-ink shadow-chunky"
      >
        Open the full report →
      </button>

      {/* A dense board: the score reads widest, everything else sits beside it. */}
      {/* Three columns only once there's genuinely room: at 1024 the score column would be
          too narrow for its own side-by-side layout, so the board stays single-column. */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {golden && (
          <button
            onClick={() => setOpenDoc('golden')}
            aria-label="See the dimensions behind your Golden Score"
            className="cursor-pointer text-left xl:col-span-2"
          >
            <Card tone="paper" className="h-full p-4">
              <GoldenScore golden={golden} />
              <p className="mt-2 text-center text-xs font-semibold text-ink-soft">
                Tap to see all sixteen dimensions →
              </p>
            </Card>
          </button>
        )}

        <div className="flex flex-col gap-4">
          {insights?.headline && (
            <Card tone="blue" className="p-4">
              <p className="kicker mb-1.5 text-paper-hi/70">the one-line read</p>
              <p className="display text-xl leading-tight text-paper-hi">{insights.headline}</p>
            </Card>
          )}
          {biases.length > 0 && <StickyNote bullets={biases} compact />}
          {strengths.length > 0 && (
            <Card tone="sand" className="p-4">
              <p className="kicker mb-2 text-blue-deep">what you lead with</p>
              <ul className="flex flex-wrap gap-1.5">
                {strengths.map((s) => (
                  <li key={s.dimension} className="rounded-full border-2 border-ink bg-paper-hi px-3 py-1 text-xs font-bold text-ink">
                    {s.label}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {watchouts.length > 0 && (
            <Card tone="sand" className="p-4">
              <p className="kicker mb-2 text-pink-deep">what to watch</p>
              <ul className="flex flex-wrap gap-1.5">
                {watchouts.map((w) => (
                  <li key={w.word} className="rounded-full border-2 border-ink bg-paper-hi px-3 py-1 text-xs font-bold text-ink">
                    {w.word}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {(stopNow.length > 0 || startNow.length > 0) && (
          <Card tone="paper" className="p-4 xl:col-span-3">
            <p className="kicker mb-3 text-pink-deep">this week</p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {stopNow.length > 0 && (
                <div>
                  <p className="serif mb-1.5 font-black text-ink">Stop</p>
                  <ul className="flex flex-col gap-1.5">
                    {stopNow.map((t, i) => (
                      <li key={i} className="flex gap-2 text-xs leading-snug text-ink">
                        <span className="shrink-0 text-pink-deep">✕</span>
                        <span>{t.replace(/\*\*/g, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {startNow.length > 0 && (
                <div>
                  <p className="serif mb-1.5 font-black text-ink">Start</p>
                  <ul className="flex flex-col gap-1.5">
                    {startNow.map((t, i) => (
                      <li key={i} className="flex gap-2 text-xs leading-snug text-ink">
                        <span className="shrink-0 text-blue-deep">✓</span>
                        <span>{t.replace(/\*\*/g, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}

        {!selfDone && (
          <Card tone="blue" className="p-4 xl:col-span-3">
            <p className="serif font-semibold text-paper-hi">You haven't done your own read yet.</p>
            <p className="mt-1 text-sm text-paper-hi/85">
              It unlocks the self-vs-team parts of the report, which is where most of the insight lives.
            </p>
            <button
              onClick={() => navigate(`/self/${slug}`)}
              className="press mt-3 cursor-pointer rounded-full border-[2.5px] border-ink bg-pink sc-pink px-5 py-2 font-display font-black text-ink shadow-chunky-sm"
            >
              Take it →
            </button>
          </Card>
        )}
      </div>

      {/* Demoted: you already have enough answers, so this is a footnote now. */}
      <div className="mt-8 rounded-[2rem] border-[2.5px] border-ink/15 bg-paper-hi/50 p-5">
        <p className="text-sm font-semibold text-ink-soft">
          Want an even sharper read? Send your link to a few more people.
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <input
            readOnly
            value={buildShareLink(slug, sessionTopicKey(slug))}
            className="min-w-0 flex-1 truncate rounded-full border-2 border-ink/15 bg-paper-hi px-4 py-2 font-mono text-xs text-ink-soft outline-none"
          />
          <button
            onClick={copy}
            className="press shrink-0 cursor-pointer rounded-full border-2 border-ink/30 bg-paper-hi px-4 py-2 text-sm font-bold text-ink"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      {/* Reference docs, rendered with the same components the report uses. */}
      {openDoc && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setOpenDoc(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-2xl">
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setOpenDoc(null)}
                aria-label="Close"
                className="press grid h-10 w-10 cursor-pointer place-items-center rounded-full border-[2.5px] border-ink bg-paper-hi text-lg font-black text-ink shadow-chunky-sm"
              >
                ✕
              </button>
            </div>
            {openDoc === 'golden' && golden && (
              <Card tone="paper" className="p-6">
                <p className="kicker mb-1 text-blue-deep">the golden mean</p>
                <h2 className="display mb-4 text-3xl">What makes up your {golden.score}</h2>
                <GoldenBreakdown golden={golden} />
              </Card>
            )}
            {openDoc === 'oneOnOne' && (
              <Card tone="paper" className="p-6">
                <p className="kicker mb-1 text-blue-deep">take it to your 1:1</p>
                <h2 className="display mb-1 text-3xl">For your next 1:1</h2>
                <p className="mb-5 text-sm text-ink-soft">
                  Questions to ask, and things to share, so this doesn't just sit in a report.
                </p>
                <OneOnOne items={synthesis?.oneOnOne ?? []} />
              </Card>
            )}
            {openDoc === 'manual' && manual && <WorkManualDoc name={creator} manual={manual} />}
          </div>
        </div>
      )}
    </>
  )

  // Before the report unlocks: the job is still to collect answers.
  const collecting = (
    <>
      <p className="kicker mb-4 text-pink-deep">your link is live</p>
      <h1 className="display text-5xl">Hey {creator}.</h1>
      <p className="mt-3 text-lg text-ink-soft">
        Fire your link at a few coworkers. Three answers and your report pops open.
      </p>

      {/* Step 1 — take yours first */}
      <p className="kicker mt-8 mb-2 text-pink-deep">step 1 · take yours first</p>
      <Card tone={selfDone ? 'sand' : 'blue'} className="p-6">
        <div className="flex items-center justify-between gap-3">
          <p className={`serif text-xl font-semibold ${selfDone ? 'text-ink' : 'text-paper-hi'}`}>
            {selfDone ? 'Self-assessment done ✓' : 'Your self-assessment'}
          </p>
          {!selfDone && (
            <button
              onClick={() => navigate(`/self/${slug}`)}
              className="press shrink-0 cursor-pointer rounded-full border-[2.5px] border-ink bg-pink sc-pink px-5 py-2.5 font-display font-black text-ink shadow-chunky-sm"
            >
              Take it →
            </button>
          )}
        </div>
        {!selfDone && (
          <p className="mt-2 text-sm text-paper-hi/85">
            Do your own first (4 to 8 min, depending on depth). It makes the whole thing sharper. Share in parallel.
          </p>
        )}
      </Card>

      {/* Step 2 — share with colleagues */}
      <p className="kicker mt-8 mb-2 text-pink-deep">step 2 · share with colleagues</p>
      <Card tone="sand" className="p-6">
        <div className="flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-paper-hi p-3">
          <input
            readOnly
            value={buildShareLink(slug, sessionTopicKey(slug))}
            className="min-w-0 flex-1 truncate bg-transparent px-2 font-mono text-sm text-ink outline-none"
          />
          <button
            onClick={copy}
            className="press shrink-0 cursor-pointer rounded-xl border-[2.5px] border-ink bg-pink sc-pink px-4 py-2 font-display font-black text-ink shadow-chunky-sm"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="mt-6 mb-3 flex items-baseline justify-between">
          <span className="kicker text-ink">responses</span>
          <span className="display text-2xl">
            {count} / {REQUIRED_RESPONSES}
          </span>
        </div>
        <div className="h-4 overflow-hidden rounded-full border-2 border-ink bg-paper-hi">
          <motion.div className="h-full bg-blue" animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut', duration: 0.7 }} />
        </div>
        <p className="mt-3 text-sm font-semibold text-ink-soft">{remaining} more and it's yours.</p>
      </Card>
    </>
  )

  return (
    <div
      className={`mx-auto flex min-h-dvh flex-col py-8 ${
        // Unlocked, this is a board rather than a form, so it takes the width it needs.
        unlocked ? 'w-[92%] max-w-none px-0' : 'w-full max-w-lg px-5'
      }`}
    >
      <button
        onClick={() => navigate('/')}
        aria-label="Back to home"
        className="press mb-8 inline-flex w-fit cursor-pointer items-center gap-2"
      >
        <span className="text-3xl">🐟</span>
        <span className="font-display text-2xl font-black text-ink">Fishbowl</span>
      </button>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="my-auto w-full">
        {unlocked ? summary : collecting}

        <div className="mt-10 text-center">
          <button onClick={startNew} className="cursor-pointer text-sm font-semibold text-ink-soft underline underline-offset-2 hover:text-ink">
            Not you, or want a fresh Fishbowl? Start over →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
