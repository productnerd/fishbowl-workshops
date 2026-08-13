import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getTopic } from '@fishbowl/feedback-core'
import { createSession, getSession } from '../lib/data'
import { setSubjectAuth } from '../lib/subjectAuth'
import { rememberSessionTopic } from '../lib/sessionTopic'
import { peekWorkshop, joinWorkshop } from '../lib/workshops'

// Where a workshop participant lands after scanning the QR code.
//
// They arrive knowing nothing, so this explains what they are about to get before asking
// for anything. Then it creates their own private Fishbowl for the workshop's topic and
// hands them straight to the normal flow: the trainer's involvement ends here.

interface Peeked {
  name: string
  clientName: string | null
  topicKey: string
}

export default function Join() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [workshop, setWorkshop] = useState<Peeked | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    peekWorkshop(token).then((res) => {
      if ('error' in res) {
        setProblem(
          res.error === 'closed'
            ? 'This workshop has closed.'
            : res.error === 'not_open'
              ? 'This workshop has not opened yet.'
              : 'That link does not point to a workshop.'
        )
        return
      }
      setWorkshop(res.workshop)
    })
  }, [token])

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canGo = Boolean(name.trim() && emailOk && workshop && !busy)

  const start = async () => {
    if (!canGo || !token || !workshop) return
    setBusy(true)
    try {
      const { slug, bearer, person_id } = await createSession(name.trim(), undefined, email.trim())
      setSubjectAuth({ bearer, person_id, slug })
      rememberSessionTopic(slug, workshop.topicKey)
      localStorage.setItem(
        'fishbowl_my_session',
        JSON.stringify({ slug, creator_name: name.trim(), email: email.trim() })
      )
      // The workshop link is by session id, which createSession does not return.
      const session = await getSession(slug)
      if (session) await joinWorkshop(token, session.id, name.trim())
      navigate(`/dashboard/${slug}`)
    } catch {
      setBusy(false)
      setProblem('Something went wrong starting your Fishbowl. Try again in a moment.')
    }
  }

  if (problem) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-md place-items-center px-5 text-center">
        <div>
          <div className="text-5xl">🫧</div>
          <p className="display mt-3 text-3xl">{problem}</p>
          <p className="mt-2 text-sm text-ink-soft">Ask whoever is running the session for a fresh link.</p>
        </div>
      </div>
    )
  }

  if (!workshop) {
    return (
      <div className="grid min-h-dvh place-items-center px-5">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1 }} className="text-5xl">
          🐟
        </motion.div>
      </div>
    )
  }

  const topic = getTopic(workshop.topicKey)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="kicker text-pink-deep">
          {workshop.clientName ? `${workshop.clientName} · ` : ''}
          {workshop.name}
        </p>
        <h1 className="display mt-2 text-4xl leading-tight">
          {topic.emoji} {topic.name}
        </h1>
        <p className="serif mt-3 leading-snug text-ink-soft">{topic.description}</p>

        <ul className="mt-6 flex flex-col gap-3 text-[0.95rem] leading-snug text-ink-soft">
          <li className="flex gap-2.5">
            <span aria-hidden>🪞</span>
            <span>
              You get your <span className="font-bold text-ink">own private report</span>, built from what people who
              know you say about you.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden>🔒</span>
            <span>
              Your trainer sees only that you <span className="font-bold text-ink">finished</span>. Never your report,
              never anyone's answers.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden>📨</span>
            <span>
              Next you will get a link to share with the people whose view you want. Three answers and it opens.
            </span>
          </li>
        </ul>

        <label className="kicker mt-7 block text-ink-soft">Your name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name is fine"
          className="mt-1.5 w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-4 py-3 text-lg outline-none"
        />

        <label className="kicker mt-4 block text-ink-soft">Your email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && start()}
          placeholder="so we can send your report"
          className="mt-1.5 w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-4 py-3 text-lg outline-none"
        />

        <button
          disabled={!canGo}
          onClick={start}
          className="press mt-6 w-full cursor-pointer rounded-2xl border-[2.5px] border-ink bg-pink sc-pink px-5 py-3.5 font-display text-lg font-black text-ink shadow-chunky-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Setting yours up…' : 'Start my Fishbowl →'}
        </button>
      </motion.div>
    </div>
  )
}
