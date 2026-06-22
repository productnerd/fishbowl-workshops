import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { REQUIRED_RESPONSES, buildShareLink } from '@fishbowl/feedback-core'
import { createSession, getResponseCount } from '../lib/data'
import Card from '../components/Card'
import Button from '../components/Button'

const KEY = 'fishbowl_my_session'

export default function Create() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState<string | null>(null)
  const [creator, setCreator] = useState('')
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(true)

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
  }, [slug])

  const create = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const s = await createSession(name.trim())
      localStorage.setItem(KEY, JSON.stringify({ slug: s, creator_name: name.trim() }))
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
          <p className="kicker mb-4 text-red-deep">your link is live</p>
          <h1 className="display text-5xl">Hey {creator}.</h1>
          <p className="mt-3 text-lg text-ink-soft">
            Send this to {REQUIRED_RESPONSES}+ colleagues. When {REQUIRED_RESPONSES} have answered, your
            report unlocks.
          </p>

          <Card tone="paper" className="mt-7 flex items-center gap-3 p-3">
            <input
              readOnly
              value={buildShareLink(slug)}
              className="min-w-0 flex-1 truncate bg-transparent px-2 font-mono text-sm text-ink outline-none"
            />
            <button
              onClick={copy}
              className="press shrink-0 cursor-pointer rounded-xl border-[2.5px] border-ink bg-red px-4 py-2 font-display font-black text-paper-hi shadow-chunky-sm"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </Card>

          <Card tone="sand" className="mt-5 p-6">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="kicker text-ink">responses</span>
              <span className="display text-2xl">
                {count} / {REQUIRED_RESPONSES}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full border-2 border-ink bg-paper-hi">
              <motion.div className="h-full bg-cyan" animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut', duration: 0.7 }} />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink-soft">
              {unlocked ? '✨ Your report is ready.' : `${remaining} more to unlock your report.`}
            </p>
          </Card>

          {unlocked && (
            <div className="mt-7">
              <Button variant="red" onClick={() => navigate(`/r/${slug}`)} className="!text-xl">
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
        <div className="mt-7">
          <Button variant="red" onClick={create} disabled={!name.trim() || loading} className="!text-xl">
            {loading ? 'Creating…' : 'Create my link →'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
