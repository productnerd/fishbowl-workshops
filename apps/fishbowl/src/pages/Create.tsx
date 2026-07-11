import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createSession, emailHasSession, recoverLatestResults } from '../lib/data'
import { setSubjectAuth } from '../lib/subjectAuth'
import Button from '../components/Button'
import CountryPicker from '../components/CountryPicker'

const KEY = 'fishbowl_my_session'

export default function Create() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [vertical, setVertical] = useState('')
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  const emailRef = useRef<HTMLInputElement>(null)
  const [existsOpen, setExistsOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [recoverSent, setRecoverSent] = useState(false)
  // Once they pick "create new" for a given email, don't nag again for that same one.
  const [dismissedEmail, setDismissedEmail] = useState('')

  // When they finish typing an email, check whether it already owns a Fishbowl and, if
  // so, offer to retrieve results vs. start fresh — instead of silently making a duplicate.
  const checkExisting = async () => {
    const e = email.trim().toLowerCase()
    if (!e.includes('@') || e === dismissedEmail || loading || existsOpen) return
    if (await emailHasSession(e)) setExistsOpen(true)
  }

  // "Take me to previous results": email the owner a one-tap magic link to their latest
  // report (works on any device, and never hands a session to whoever typed the address).
  const retrievePrevious = async () => {
    if (sending) return
    setSending(true)
    await recoverLatestResults(email.trim())
    setSending(false)
    setRecoverSent(true)
  }

  const dismissAndCreate = () => {
    setDismissedEmail(email.trim().toLowerCase())
    setExistsOpen(false)
  }

  const changeEmail = () => {
    setExistsOpen(false)
    setEmail('')
    setTimeout(() => emailRef.current?.focus(), 0)
  }

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
    // Compose a labelled context the AI can parse: role + company vertical + country.
    // Country lets the AI weigh cultural tendencies; role + vertical the work environment.
    const context = [
      role.trim() && `Role: ${role.trim()}`,
      vertical.trim() && `Company / what the team does: ${vertical.trim()}`,
      country.trim() && `Country: ${country.trim()}`,
    ]
      .filter(Boolean)
      .join('. ')
    try {
      const { slug, bearer, person_id } = await createSession(name.trim(), context || undefined, email.trim() || undefined)
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
          ref={emailRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={checkExisting}
          placeholder="Email (optional), get notified + your report"
          maxLength={120}
          className="mt-4 w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-left text-base text-ink shadow-chunky-sm outline-none placeholder:text-ink-soft/55 focus:shadow-chunky"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Your role (e.g. Product Manager)"
          maxLength={80}
          className="mt-4 w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-left text-base text-ink shadow-chunky-sm outline-none placeholder:text-ink-soft/55 focus:shadow-chunky"
        />
        <input
          value={vertical}
          onChange={(e) => setVertical(e.target.value)}
          placeholder="What your company does (e.g. fintech, investment banking)"
          maxLength={120}
          className="mt-3 w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-left text-base text-ink shadow-chunky-sm outline-none placeholder:text-ink-soft/55 focus:shadow-chunky"
        />
        <div className="mt-3">
          <CountryPicker value={country} onChange={setCountry} />
        </div>
        <p className="mt-7 mb-2 text-sm font-semibold text-ink">A little context sharpens the whole AI report</p>
        <div className="mt-1">
          <Button variant="pink" onClick={create} disabled={!name.trim() || loading} className="!text-xl">
            {loading ? 'Creating…' : 'Create my link →'}
          </Button>
        </div>
      </motion.div>

      {/* Email already on record: retrieve results, start fresh, or fix the address. */}
      <AnimatePresence>
        {existsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissAndCreate}
            className="fixed inset-0 z-50 grid place-items-center bg-ink/60 px-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] as const }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border-[2.5px] border-ink bg-paper-hi p-6 text-center shadow-chunky"
            >
              {recoverSent ? (
                <>
                  <div className="text-5xl">📬</div>
                  <h2 className="display mt-3 text-2xl">Check your inbox</h2>
                  <p className="mt-2 text-ink-soft">
                    We sent a one-tap link to your latest results to{' '}
                    <span className="font-semibold text-ink">{email.trim()}</span>. It works once and expires in 30 minutes.
                  </p>
                  <button
                    onClick={() => {
                      setExistsOpen(false)
                      setRecoverSent(false)
                    }}
                    className="press mt-5 w-full cursor-pointer rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3 font-display font-black text-ink shadow-chunky-sm"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="text-4xl">🐟</div>
                  <div className="mt-3 rounded-2xl border-2 border-[#7c3aed]/35 bg-[#7c3aed]/10 px-4 py-3">
                    <p className="font-semibold leading-snug text-[#6d28d9]">
                      This email already has a Fishbowl. Would you like to retrieve your latest results, or create a brand
                      new survey?
                    </p>
                  </div>
                  <div className="mt-5 flex flex-col gap-2.5">
                    <Button variant="pink" onClick={retrievePrevious} disabled={sending} className="!w-full">
                      {sending ? 'Sending…' : 'Take me to previous results'}
                    </Button>
                    <button
                      onClick={dismissAndCreate}
                      className="press w-full cursor-pointer rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3 font-display font-black text-ink shadow-chunky-sm"
                    >
                      Create new session
                    </button>
                    <button onClick={changeEmail} className="mt-1 cursor-pointer text-sm font-semibold text-ink-soft underline">
                      I&rsquo;ll change my email
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
