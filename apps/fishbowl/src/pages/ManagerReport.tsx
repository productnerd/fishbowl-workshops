import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import Card from '../components/Card'
import Button from '../components/Button'

const TEAM_KEY = 'fishbowl_manager_team'

type Member = { email: string; name: string | null; responseCount: number; completed: boolean; slug: string | null }
type Team = {
  headline: string
  strengths: string[]
  risks: string[]
  complementarity: string[]
  advice: string[]
  closing: string
}

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-bold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}

export default function ManagerReport() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [checking, setChecking] = useState(false)
  const [emails, setEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [roster, setRoster] = useState<Member[]>([])
  const [allComplete, setAllComplete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem(TEAM_KEY)
      if (s) setEmails(JSON.parse(s))
    } catch {
      /* ignore */
    }
  }, [])

  const callFn = async (pw: string, mails: string[], generate = false) => {
    const { data, error } = await supabase.functions.invoke('fishbowl-team-report', {
      body: { password: pw, emails: mails, generate },
    })
    if (error || !data) return { ok: false as const, error: 'Something went wrong. Please try again.' }
    if (data.error) return { ok: false as const, error: data.error === 'wrong password' ? 'Wrong password.' : data.error }
    return { ok: true as const, roster: data.roster as Member[], allComplete: data.allComplete as boolean, team: (data.team as Team | null) ?? null }
  }

  // Password gate: validates, and (on success) does the first status check.
  const submitPassword = async () => {
    if (!pwInput.trim()) return setPwError('Enter the password.')
    setChecking(true)
    setPwError('')
    const r = await callFn(pwInput.trim(), emails, false)
    setChecking(false)
    if (!r.ok) return setPwError(r.error)
    setPassword(pwInput.trim())
    setRoster(r.roster)
    setAllComplete(r.allComplete)
    setAuthed(true)
  }

  // Re-check completion (on add / remove).
  const refresh = async (mails: string[]) => {
    setTeam(null)
    setBusy(true)
    const r = await callFn(password, mails, false)
    setBusy(false)
    if (r.ok) {
      setRoster(r.roster)
      setAllComplete(r.allComplete)
    }
  }

  const addEmail = async () => {
    const e = newEmail.trim().toLowerCase()
    setNewEmail('')
    if (!e || emails.includes(e)) return
    const next = [...emails, e]
    setEmails(next)
    localStorage.setItem(TEAM_KEY, JSON.stringify(next))
    await refresh(next)
  }

  const removeEmail = async (e: string) => {
    const next = emails.filter((x) => x !== e)
    setEmails(next)
    localStorage.setItem(TEAM_KEY, JSON.stringify(next))
    await refresh(next)
  }

  const generate = async () => {
    setGenerating(true)
    const r = await callFn(password, emails, true)
    setGenerating(false)
    if (r.ok && r.team) setTeam(r.team)
  }

  // ── Password popup gate ──
  if (!authed) {
    return (
      <div className="grid min-h-dvh place-items-center px-5">
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <Card tone="paper" className="p-7 text-center">
            <div className="text-5xl">🔒</div>
            <h1 className="display mt-3 text-3xl">Managers only</h1>
            <p className="mt-2 text-ink-soft">Enter the manager password to continue.</p>
            <input
              type="password"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
              autoFocus
              placeholder="Password"
              className="mt-5 w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-center text-base text-ink shadow-chunky-sm outline-none focus:shadow-chunky"
            />
            {pwError && <p className="mt-3 text-sm font-semibold text-pink-deep">{pwError}</p>}
            <div className="mt-5">
              <Button variant="blue" onClick={submitPassword} disabled={checking}>
                {checking ? 'Checking…' : 'Enter →'}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ── Team screen ──
  const canGenerate = roster.length >= 2 && allComplete
  const genLabel = generating
    ? 'Generating…'
    : roster.length < 2
      ? 'Add 2+ teammates for a team report'
      : !allComplete
        ? 'Waiting for everyone to finish…'
        : 'Generate team report →'

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10">
      <p className="kicker text-pink-deep">🔒 managers only</p>
      <h1 className="display mt-2 text-5xl">Team report</h1>
      <p className="mt-3 text-lg text-ink-soft">
        Add your team. We check who has completed their Fishbowl, and build a team report once everyone
        (two or more) is in.
      </p>

      <Card tone="paper" className="mt-7 p-6">
        <p className="kicker mb-4 text-blue-deep">your team{busy ? ' · checking…' : ''}</p>

        {roster.length === 0 ? (
          <p className="text-ink-soft">No one yet. Add your first teammate below.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {roster.map((m) => (
              <li key={m.email} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-sand px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{m.name || m.email}</p>
                  <p className="truncate text-xs text-ink-soft">{m.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {m.completed && m.slug ? (
                    <a href={`#/r/${m.slug}`} className="font-display font-black text-blue-deep">
                      View →
                    </a>
                  ) : (
                    <span className="kicker text-pink-deep">{m.responseCount}/5</span>
                  )}
                  <button
                    onClick={() => removeEmail(m.email)}
                    aria-label={`Remove ${m.email}`}
                    className="cursor-pointer text-xl leading-none text-ink-soft hover:text-pink-deep"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEmail()}
            placeholder="teammate@email.com"
            className="min-w-0 flex-1 rounded-2xl border-[2.5px] border-ink bg-paper-hi px-4 py-3 text-base text-ink shadow-chunky-sm outline-none placeholder:text-ink-soft/55 focus:shadow-chunky"
          />
          <button
            onClick={addEmail}
            className="press shrink-0 cursor-pointer rounded-2xl border-[2.5px] border-ink bg-blue sc-navy px-5 py-3 font-display font-black text-paper-hi shadow-chunky-sm"
          >
            Add
          </button>
        </div>
      </Card>

      <div className="mt-6">
        <Button variant="pink" onClick={generate} disabled={!canGenerate || generating}>
          {genLabel}
        </Button>
      </div>

      {team && (
        <div className="mt-8 flex flex-col gap-5">
          <Card tone="blue" className="p-7">
            <p className="kicker text-paper-hi/70">your team</p>
            <h2 className="display mt-2 text-4xl text-paper-hi">
              <Rich text={team.headline} />
            </h2>
          </Card>
          <Card tone="paper" className="p-6">
            <p className="kicker mb-3 text-blue-deep">collective strengths</p>
            <ul className="flex flex-col gap-2 text-lg leading-relaxed">
              {team.strengths.map((s, i) => (
                <li key={i}>✦ <Rich text={s} /></li>
              ))}
            </ul>
          </Card>
          <Card tone="paper" className="p-6">
            <p className="kicker mb-3 text-pink-deep">watch-outs</p>
            <ul className="flex flex-col gap-2 text-lg leading-relaxed">
              {team.risks.map((s, i) => (
                <li key={i}>• <Rich text={s} /></li>
              ))}
            </ul>
          </Card>
          <Card tone="sand" className="p-6">
            <p className="kicker mb-3 text-ink">how you balance each other</p>
            <ul className="flex flex-col gap-2 text-lg leading-relaxed">
              {team.complementarity.map((s, i) => (
                <li key={i}>
                  <Rich text={s} />
                </li>
              ))}
            </ul>
          </Card>
          <Card tone="paper" className="p-6">
            <p className="kicker mb-3 text-blue-deep">what you could do</p>
            <ul className="flex flex-col gap-2 text-lg leading-relaxed">
              {team.advice.map((s, i) => (
                <li key={i}>→ <Rich text={s} /></li>
              ))}
            </ul>
          </Card>
          <Card tone="pink" className="p-6 text-center">
            <p className="serif text-2xl text-ink">
              <Rich text={team.closing} />
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}
