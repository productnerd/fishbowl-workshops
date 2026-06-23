import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Card from '../components/Card'
import Button from '../components/Button'

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
  const [password, setPassword] = useState('')
  const [emailsText, setEmailsText] = useState('')
  const [roster, setRoster] = useState<Member[] | null>(null)
  const [allComplete, setAllComplete] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const call = async (generate: boolean) => {
    const emails = emailsText.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean)
    if (!password.trim()) return setError('Enter the manager password.')
    if (emails.length === 0) return setError('Add at least one team email.')
    setError('')
    if (generate) setGenerating(true)
    else setLoading(true)
    try {
      const { data, error: err } = await supabase.functions.invoke('fishbowl-team-report', {
        body: { password: password.trim(), emails, generate },
      })
      if (err || !data) return setError('Something went wrong. Please try again.')
      if (data.error) return setError(data.error === 'wrong password' ? 'Wrong password.' : data.error)
      setRoster(data.roster)
      setAllComplete(data.allComplete)
      if (data.team) setTeam(data.team)
    } finally {
      setGenerating(false)
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10">
      <p className="kicker text-pink-deep">🔒 managers only</p>
      <h1 className="display mt-2 text-5xl">Team report</h1>
      <p className="mt-3 text-lg text-ink-soft">
        Add your team's emails. See who has completed their Fishbowl, open each report, and build a team
        report once everyone is in.
      </p>

      <Card tone="paper" className="mt-7 p-6">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Manager password"
          className="w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-base text-ink shadow-chunky-sm outline-none placeholder:text-ink-soft/55 focus:shadow-chunky"
        />
        <textarea
          value={emailsText}
          onChange={(e) => setEmailsText(e.target.value)}
          rows={5}
          placeholder="Team emails, one per line"
          className="mt-4 w-full resize-none rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-base text-ink shadow-chunky-sm outline-none placeholder:text-ink-soft/55 focus:shadow-chunky"
        />
        {error && <p className="mt-3 text-sm font-semibold text-pink-deep">{error}</p>}
        <div className="mt-5">
          <Button variant="blue" onClick={() => call(false)} disabled={loading}>
            {loading ? 'Checking…' : 'Check team'}
          </Button>
        </div>
      </Card>

      {roster && (
        <Card tone="paper" className="mt-6 p-6">
          <p className="kicker mb-4 text-blue-deep">team status</p>
          <ul className="flex flex-col gap-3">
            {roster.map((m) => (
              <li key={m.email} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-sand px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{m.name || m.email}</p>
                  <p className="truncate text-xs text-ink-soft">{m.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  {m.completed && m.slug ? (
                    <a href={`#/r/${m.slug}`} className="font-display font-black text-blue-deep">
                      View →
                    </a>
                  ) : (
                    <span className="kicker text-pink-deep">{m.responseCount}/5</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Button variant="pink" onClick={() => call(true)} disabled={!allComplete || generating}>
              {generating ? 'Generating…' : allComplete ? 'Generate team report →' : 'Waiting for everyone…'}
            </Button>
          </div>
        </Card>
      )}

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
