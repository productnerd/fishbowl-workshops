import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getSubjectAuth } from '../lib/subjectAuth'
import { getMyReports, type MyReport } from '../lib/data'
import Button from '../components/Button'

// "Your reports" — every session this person owns, newest first. Reached via the
// recovery magic link or a link from a report. One person can accumulate several over
// time (that's intentional — the basis for comparing over time later).
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null

export default function MyReports() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<MyReport[] | null>(null)

  useEffect(() => {
    const auth = getSubjectAuth()
    if (!auth) {
      setReports([])
      return
    }
    getMyReports(auth.bearer).then(setReports)
  }, [])

  if (reports === null) {
    return (
      <div className="grid min-h-dvh place-items-center px-5">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1 }} className="text-5xl">
          🐟
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10">
      <p className="kicker text-pink-deep">everything you&rsquo;ve run</p>
      <h1 className="display mt-2 text-4xl">Your reports</h1>

      {reports.length === 0 ? (
        <div className="mt-8 rounded-2xl border-[2.5px] border-ink bg-paper-hi p-6 text-center shadow-chunky-sm">
          <p className="text-ink-soft">No reports on this device yet.</p>
          <div className="mt-4">
            <Button variant="pink" onClick={() => navigate('/create')} className="!text-lg">
              Start a Fishbowl →
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-7 flex flex-col gap-4">
          {reports.map((r) => (
            <div key={r.slug} className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-5 shadow-chunky-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-black text-ink">{r.name}</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-semibold text-ink">{r.respondents}</span> {r.respondents === 1 ? 'respondent' : 'respondents'}
                    {r.generatedAt
                      ? <> · generated {fmtDate(r.generatedAt)}</>
                      : <> · started {fmtDate(r.createdAt)}</>}
                  </p>
                </div>
                {r.ready ? (
                  <span
                    className="shrink-0 rounded-full border-2 border-ink px-3 py-0.5 text-xs font-black uppercase tracking-wide text-ink"
                    style={{ backgroundColor: 'rgba(47,158,122,0.28)' }}
                  >
                    ready
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border-2 border-ink bg-sand px-3 py-0.5 text-xs font-black uppercase tracking-wide text-ink-soft">
                    {r.respondents}/5
                  </span>
                )}
              </div>
              <div className="mt-4">
                {r.ready ? (
                  <button
                    onClick={() => navigate(`/r/${r.slug}`)}
                    className="press w-full cursor-pointer rounded-xl border-[2.5px] border-ink bg-ink px-5 py-2.5 font-display font-black text-paper-hi shadow-chunky-sm sc-sand"
                  >
                    Open this report →
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/dashboard/${r.slug}`)}
                    className="press w-full cursor-pointer rounded-xl border-[2.5px] border-ink bg-paper px-5 py-2.5 font-display font-black text-ink shadow-chunky-sm"
                  >
                    Invite more people →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
