import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { REQUIRED_RESPONSES, buildShareLink } from '@fishbowl/feedback-core'
import { getResponseCount, getSession } from '../lib/data'
import Card from '../components/Card'
import Button from '../components/Button'

// A stable, bookmarkable per-session dashboard: /#/dashboard/:slug. Reads the session
// from the URL (not a single mutable localStorage slot), so it can't be clobbered by a
// second session or a colleague's survey, and it survives cleared storage.
export default function Dashboard() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const [creator, setCreator] = useState('')
  const [count, setCount] = useState(0)
  const [selfDone, setSelfDone] = useState(false)
  const [copied, setCopied] = useState(false)
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
        setSelfDone(Boolean(s.self_completed_at))
      }
      setLoading(false)
    })
    getResponseCount(slug).then(setCount)
  }, [slug])

  const copy = async () => {
    if (!slug) return
    await navigator.clipboard.writeText(buildShareLink(slug))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  // Escape hatch: forget this browser's session so /create shows the name form again
  // (create a different Fishbowl, or start clean if this one isn't really yours).
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
  const unlocked = count >= REQUIRED_RESPONSES
  const pct = Math.min(100, (count / REQUIRED_RESPONSES) * 100)
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-8">
      <button
        onClick={() => navigate('/')}
        aria-label="Back to home"
        className="press mb-8 inline-flex w-fit cursor-pointer items-center gap-2"
      >
        <span className="text-3xl">🐟</span>
        <span className="font-display text-2xl font-black text-ink">Fishbowl</span>
      </button>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="my-auto w-full">
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
          <p className={`mt-2 text-sm ${selfDone ? 'text-ink-soft' : 'text-paper-hi/85'}`}>
            {selfDone
              ? "Your report will show your self-view next to your team's."
              : 'Do your own first (~2 min). It makes the whole thing sharper. Share in parallel.'}
          </p>
        </Card>

        {/* Step 2 — share with colleagues */}
        <p className="kicker mt-8 mb-2 text-pink-deep">step 2 · share with colleagues</p>
        <Card tone="sand" className="p-6">
          <div className="flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-paper-hi p-3">
            <input
              readOnly
              value={buildShareLink(slug)}
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
          <p className="mt-3 text-sm font-semibold text-ink-soft">
            {unlocked ? '✨ Your report is ready.' : `${remaining} more and it's yours.`}
          </p>
        </Card>

        {unlocked && (
          <div className="mt-7">
            <Button variant="pink" onClick={() => navigate(`/r/${slug}`)} className="!text-xl">
              See your report →
            </Button>
          </div>
        )}

        <div className="mt-10 text-center">
          <button onClick={startNew} className="cursor-pointer text-sm font-semibold text-ink-soft underline underline-offset-2 hover:text-ink">
            Not you, or want a fresh Fishbowl? Start over →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
