import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { createSession } from '../lib/data'
import { setSubjectAuth } from '../lib/subjectAuth'
import Button from '../components/Button'

const KEY = 'fishbowl_my_session'

export default function Create() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // If this browser already owns a session, its dashboard lives at a stable slug URL —
  // send them there instead of showing the name-entry form again.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored) {
        const { slug } = JSON.parse(stored)
        if (slug) {
          navigate(`/dashboard/${slug}`, { replace: true })
          return
        }
      }
    } catch {
      localStorage.removeItem(KEY)
    }
    setChecking(false)
  }, [navigate])

  const create = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const { slug, bearer, person_id } = await createSession(name.trim(), context.trim() || undefined, email.trim() || undefined)
      // This browser now owns the session: store the device key so the self-read saves
      // and the report unlocks here with no magic link.
      setSubjectAuth({ bearer, person_id, slug })
      localStorage.setItem(KEY, JSON.stringify({ slug, creator_name: name.trim(), email: email.trim() || null }))
      navigate(`/dashboard/${slug}`)
      return
    } catch {
      /* surface later */
    }
    setLoading(false)
  }

  if (checking) return null

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
