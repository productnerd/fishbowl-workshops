import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { REQUIRED_RESPONSES, buildShareLink } from '@fishbowl/feedback-core'
import { createSession, getResponseCount, getSession } from '../lib/data'
import { finishSelf } from '../lib/self'
import { setSubjectAuth } from '../lib/subjectAuth'
import Card from '../components/Card'
import Button from '../components/Button'

const KEY = 'fishbowl_my_session'

export default function Create() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [context, setContext] = useState('')
  const [slug, setSlug] = useState<string | null>(null)
  const [creator, setCreator] = useState('')
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(true)
  const [selfDone, setSelfDone] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(KEY)
    if (stored) {
      try {
        const { slug: s, creator_name } = JSON.parse(stored)
        setSlug(s)
        setCreator(creator_name)
      } catch {
        localStorage.removeItem(KEY)
      }
    }
    setChecking(false)
  }, [])

  useEffect(() => {
    if (!slug) return
    getResponseCount(slug).then(setCount)
    getSession(slug).then((s) => setSelfDone(Boolean(s?.self_completed_at)))
  }, [slug])

  const create = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const s = await createSession(name.trim(), context.trim() || undefined, email.trim() || undefined)
      localStorage.setItem(KEY, JSON.stringify({ slug: s, creator_name: name.trim(), email: email.trim() || null }))
      // If they just did a self-read elsewhere (the "create your own Fishbowl" invite),
      // carry it straight into this new session. Needs an email to tie it to them.
      const pending = localStorage.getItem('fishbowl_pending_self')
      if (pending && email.trim()) {
        try {
          const res = await finishSelf(email.trim(), s, JSON.parse(pending))
          if (res.ok && res.bearer && res.person_id) setSubjectAuth({ bearer: res.bearer, person_id: res.person_id, slug: s })
        } catch {
          /* if it fails, they can still take the self-read from the share screen */
        }
      }
      localStorage.removeItem('fishbowl_pending_self')
      setSlug(s)
      setCreator(name.trim())
    } catch {
      /* surface later */
    }
    setLoading(false)
  }

  const copy = async () => {
    if (!slug) return
    await navigator.clipboard.writeText(buildShareLink(slug))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (checking) return null

  // ── Share / status screen ──
  if (slug) {
    const remaining = Math.max(0, REQUIRED_RESPONSES - count)
    const unlocked = count >= REQUIRED_RESPONSES
    const pct = Math.min(100, (count / REQUIRED_RESPONSES) * 100)
    return (
      <div className="mx-auto grid min-h-dvh max-w-lg place-items-center px-5 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
          <p className="kicker mb-4 text-pink-deep">your link is live</p>
          <h1 className="display text-5xl">Hey {creator}.</h1>
          <p className="mt-3 text-lg text-ink-soft">
            Fire your link at a few coworkers. Three answers and your report pops open.
          </p>

          {/* Step 1 — label outside the card */}
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

          {/* Step 2 — label outside, everything in one card */}
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
        </motion.div>
      </div>
    )
  }

  // ── Name entry ──
  return (
    <div className="mx-auto grid min-h-dvh max-w-lg place-items-center px-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full text-center">
        <div className="text-6xl">🐟</div>
        <h1 className="display mt-4 text-5xl">What's your name?</h1>
        <p className="mt-3 text-lg text-ink-soft">It's how your colleagues will see the questions framed.</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          placeholder="First name"
          autoFocus
          maxLength={40}
          className="mt-7 w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-6 py-4 text-center font-display text-2xl font-black text-ink shadow-chunky-sm outline-none placeholder:text-ink-soft/50 focus:shadow-chunky"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional) — get notified + your report"
          maxLength={120}
          className="mt-4 w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-left text-base text-ink shadow-chunky-sm outline-none placeholder:text-ink-soft/55 focus:shadow-chunky"
        />
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Optional: your role + what your team or company does. This sharpens the AI report and its advice."
          rows={3}
          maxLength={400}
          className="mt-4 w-full resize-none rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-left text-base text-ink shadow-chunky-sm outline-none placeholder:text-ink-soft/55 focus:shadow-chunky"
        />
        <div className="mt-7">
          <Button variant="pink" onClick={create} disabled={!name.trim() || loading} className="!text-xl">
            {loading ? 'Creating…' : 'Create my link →'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
