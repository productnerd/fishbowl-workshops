import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TOPICS, getTopic } from '@fishbowl/feedback-core'
import { getSubjectAuth } from '../lib/subjectAuth'
import {
  listWorkshops,
  createWorkshop,
  trainerSignIn,
  trainerTestMode,
  type WorkshopSummary,
  type WorkshopConfig,
} from '../lib/workshops'

// The trainer's home: every workshop they run, and the form to start another.
//
// Identity is the same magic link the rest of the app uses, so there is no separate
// account system. A trainer is a person who happens to own workshops.

function SignIn() {
  const [email, setEmail] = useState('')
  const [testMode, setTestMode] = useState(false)
  useEffect(() => {
    trainerTestMode().then(setTestMode)
  }, [])
  // null = not attempted, true = accepted for delivery, false = the send was rejected.
  // Telling someone to check an inbox nothing was sent to is the worst of the three.
  const [sent, setSent] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const go = async () => {
    if (!ok || busy) return
    setBusy(true)
    const res = await trainerSignIn(email)
    // Testing mode: the server handed back the claim link rather than emailing it, so walk
    // straight through it. This is a real claim, so the bearer and person are real too.
    if (res.devClaimUrl) {
      window.location.href = res.devClaimUrl
      return
    }
    setBusy(false)
    setSent(res.sent)
  }

  if (sent === false) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
        <div className="rounded-3xl border-[2.5px] border-ink bg-paper-hi p-8 text-center shadow-chunky">
          <div className="text-5xl">📭</div>
          <h1 className="display mt-3 text-3xl">We could not send that</h1>
          <p className="mt-2 text-sm leading-snug text-ink-soft">
            The email did not go out, so there is nothing in your inbox to wait for. This is on our side, not yours.
          </p>
          <button
            onClick={() => setSent(null)}
            className="press mt-6 w-full cursor-pointer rounded-2xl border-[2.5px] border-ink bg-paper px-5 py-3 font-display font-black text-ink shadow-chunky-sm"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
        <div className="rounded-3xl border-[2.5px] border-ink bg-paper-hi p-8 text-center shadow-chunky">
          <div className="text-5xl">📬</div>
          <h1 className="display mt-3 text-3xl">Check your email</h1>
          <p className="mt-2 text-sm leading-snug text-ink-soft">
            If we know that address, a link to your workshops is on its way. It works once and expires in 30 minutes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <p className="kicker text-pink-deep">for trainers</p>
        <h1 className="display mt-2 text-4xl leading-tight">Your workshops</h1>
        <p className="serif mt-3 leading-snug text-ink-soft">
          Run a Fishbowl with a group: pick a topic, share one link, and watch the room fill up. We will email you a
          private link, no password to remember.
        </p>
        {/* Only rendered when the server actually is in testing mode, so it cannot quietly
            outlive the switch it describes. */}
        {testMode && (
          <p className="mt-4 rounded-2xl border-2 border-dashed border-pink-deep px-4 py-3 text-sm leading-snug text-pink-deep">
            <span className="font-black">Testing mode.</span> Email is off, so any address signs straight in. Turn it
            off before anyone else has this link.
          </p>
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
          placeholder="you@yourpractice.com"
          className="mt-6 w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-lg outline-none"
        />
        <button
          disabled={!ok || busy}
          onClick={go}
          className="press mt-4 w-full cursor-pointer rounded-2xl border-[2.5px] border-ink bg-pink sc-pink px-5 py-3.5 font-display text-lg font-black text-ink shadow-chunky-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Sending…' : 'Email me my link →'}
        </button>
      </motion.div>
    </div>
  )
}

function NewWorkshop({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [topicKey, setTopicKey] = useState(TOPICS[0].key)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const topic = getTopic(topicKey)
  // Composition-level customisation: which modules run, how long, who counts as a persona.
  // Rewording individual questions belongs to the deeper builder.
  const [length, setLength] = useState(topic.lengths[topic.lengths.length - 1].key)
  const [personas, setPersonas] = useState<string[]>(topic.personas.map((p) => p.key))

  // Changing topic invalidates any length or persona chosen against the previous one.
  useEffect(() => {
    const t = getTopic(topicKey)
    setLength(t.lengths[t.lengths.length - 1].key)
    setPersonas(t.personas.map((p) => p.key))
  }, [topicKey])

  const togglePersona = (key: string) =>
    setPersonas((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))

  const save = async () => {
    if (!name.trim() || !personas.length) return
    setSaving(true)
    setError(null)
    const config: WorkshopConfig = { length, personas }
    const res = await createWorkshop({
      name: name.trim(),
      client_name: client.trim() || undefined,
      topic_key: topicKey,
      config,
    })
    setSaving(false)
    if ('error' in res) {
      setError(res.error)
      return
    }
    onDone()
  }

  return (
    <div className="rounded-3xl border-[2.5px] border-ink bg-paper-hi p-6 shadow-chunky">
      <h2 className="display text-2xl">New workshop</h2>

      <label className="kicker mt-5 block text-ink-soft">What is it called?</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Q3 Leadership Intensive"
        className="mt-1.5 w-full rounded-2xl border-[2.5px] border-ink bg-paper px-4 py-2.5 outline-none"
      />

      <label className="kicker mt-4 block text-ink-soft">Client (optional)</label>
      <input
        value={client}
        onChange={(e) => setClient(e.target.value)}
        placeholder="Acme Corp"
        className="mt-1.5 w-full rounded-2xl border-[2.5px] border-ink bg-paper px-4 py-2.5 outline-none"
      />

      <label className="kicker mt-5 block text-ink-soft">Topic</label>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
        {TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTopicKey(t.key)}
            className={`press cursor-pointer rounded-2xl border-[2.5px] px-4 py-3 text-left ${
              t.key === topicKey ? 'border-ink shadow-chunky-sm' : 'border-ink/25'
            }`}
            style={t.key === topicKey ? { background: `${t.accent}18` } : undefined}
          >
            <span className="text-xl" aria-hidden>
              {t.emoji}
            </span>
            <span className="display mt-1 block text-base leading-tight">{t.name}</span>
          </button>
        ))}
      </div>

      <label className="kicker mt-5 block text-ink-soft">How long for each person answering</label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {topic.lengths.map((l) => (
          <button
            key={l.key}
            onClick={() => setLength(l.key)}
            className={`press cursor-pointer rounded-full border-[2.5px] px-4 py-1.5 text-sm font-bold ${
              l.key === length ? 'border-ink bg-pink' : 'border-ink/25'
            }`}
          >
            {l.label} · {l.minutes[0] === l.minutes[1] ? l.minutes[0] : `${l.minutes[0]} to ${l.minutes[1]}`} min
          </button>
        ))}
      </div>

      <label className="kicker mt-5 block text-ink-soft">Who can answer</label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {topic.personas.map((p) => (
          <button
            key={p.key}
            onClick={() => togglePersona(p.key)}
            className={`press cursor-pointer rounded-full border-[2.5px] px-4 py-1.5 text-sm font-bold ${
              personas.includes(p.key) ? 'border-ink bg-pink' : 'border-ink/25 opacity-60'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {!personas.length && <p className="mt-2 text-sm text-pink-deep">Pick at least one, or nobody can answer.</p>}

      {error && <p className="mt-4 text-sm text-pink-deep">{error}</p>}

      <button
        disabled={!name.trim() || !personas.length || saving}
        onClick={save}
        className="press mt-6 w-full cursor-pointer rounded-2xl border-[2.5px] border-ink bg-pink sc-pink px-5 py-3 font-display text-lg font-black text-ink shadow-chunky-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? 'Creating…' : 'Create workshop →'}
      </button>
    </div>
  )
}

export default function Trainer() {
  const navigate = useNavigate()
  const [signedIn] = useState(() => Boolean(getSubjectAuth()))
  const [workshops, setWorkshops] = useState<WorkshopSummary[] | null>(null)
  const [creating, setCreating] = useState(false)

  const load = () => {
    listWorkshops().then((res) => setWorkshops('error' in res ? [] : res.workshops))
  }
  useEffect(() => {
    if (signedIn) load()
  }, [signedIn])

  if (!signedIn) return <SignIn />

  if (workshops === null) {
    return (
      <div className="grid min-h-dvh place-items-center px-5">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1 }} className="text-5xl">
          🐟
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-pink-deep">for trainers</p>
          <h1 className="display mt-1 text-4xl">Your workshops</h1>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="press cursor-pointer rounded-2xl border-[2.5px] border-ink bg-pink sc-pink px-5 py-2.5 font-display font-black text-ink shadow-chunky-sm"
          >
            + New workshop
          </button>
        )}
      </div>

      {creating && (
        <div className="mt-6">
          <NewWorkshop
            onDone={() => {
              setCreating(false)
              setWorkshops(null)
              load()
            }}
          />
          <button onClick={() => setCreating(false)} className="mt-3 cursor-pointer text-sm text-ink-soft underline">
            Cancel
          </button>
        </div>
      )}

      {!creating && workshops.length === 0 && (
        <div className="mt-8 rounded-3xl border-[2.5px] border-dashed border-ink/30 p-10 text-center">
          <div className="text-5xl">🎪</div>
          <p className="display mt-3 text-xl">No workshops yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-snug text-ink-soft">
            Create one, share the link or QR code with the room, and every participant gets their own private Fishbowl.
            You will see who has finished, never what anyone said.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {workshops.map((w) => {
          const topic = getTopic(w.topicKey)
          return (
            <button
              key={w.id}
              onClick={() => navigate(`/workshop/${w.id}`)}
              className="press flex cursor-pointer flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border-[2.5px] border-ink bg-paper-hi p-5 text-left shadow-chunky-sm"
            >
              <span className="text-3xl" aria-hidden>
                {topic.emoji}
              </span>
              <span className="min-w-[12rem] flex-1">
                <span className="display block text-xl leading-tight">{w.name}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">
                  {topic.name}
                  {w.clientName ? ` · ${w.clientName}` : ''}
                </span>
              </span>
              <span className="text-sm text-ink-soft">
                <span className="display text-2xl text-ink">{w.joined}</span> joined
              </span>
              <span className="text-sm text-ink-soft">
                <span className="display text-2xl text-ink">{w.reports}</span> reports
              </span>
              <span className="display text-lg" style={{ color: topic.accent }}>
                Open →
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
