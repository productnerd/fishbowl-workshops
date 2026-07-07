import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Question, Session, ResponsibilityTiers, HatScores, CandorAnswers } from '@fishbowl/feedback-core'
import {
  SDT_NEEDS,
  SDT_TOTAL,
  BELBIN_ROLES,
  BELBIN_TOTAL,
  VIA_STRENGTHS,
  VIA_PICK,
  JOHARI_ADJECTIVES,
  JOHARI_MIN,
  JOHARI_MAX,
  WEAKNESSES,
  NOHARI_MIN,
  NOHARI_MAX,
} from '@fishbowl/feedback-core'
import { getSession, submitResponse } from '../lib/data'
import { playQuizTick } from '../lib/sound'
import { getColleagueSurvey } from '../data/questions'
import VirtueSlider from '../components/VirtueSlider'
import LikertScale from '../components/LikertScale'
import ScenarioChoice from '../components/ScenarioChoice'
import FreeText from '../components/FreeText'
import TierTagger from '../components/TierTagger'
import HatsTagger from '../components/HatsTagger'
import CandorTagger from '../components/CandorTagger'
import AllocationTagger from '../components/AllocationTagger'
import ChipPicker from '../components/ChipPicker'
import Button from '../components/Button'

function Screen({ children }: { children: ReactNode }) {
  return <div className="grid min-h-dvh place-items-center px-5">{children}</div>
}

// Snappy real-time read for returning respondents: their own lean (from their
// own Fishbowl) vs how they're placing this person. Deliberately terse — often
// just a few words, often nothing at all.
function compareNudge(mine: number, theirs: number): string | null {
  const dm = Math.round(mine) - 5
  const dt = theirs - 5
  const am = Math.abs(dm)
  const at = Math.abs(dt)
  if (am <= 1 && at <= 1) return null
  const sm = Math.sign(dm)
  const st = Math.sign(dt)
  if (sm !== 0 && st !== 0 && sm !== st) {
    return am >= 2 && at >= 2 ? 'Total opposites here. That can spark, or balance you out.' : 'Opposite of you.'
  }
  if (sm === st && am >= 2 && at >= 2) return 'Same strong lean as you.'
  if (sm === st && am >= 1 && at >= 1) return 'You tilt this way too.'
  if (am <= 1 && at >= 2) return 'Further out than you sit.'
  if (at <= 1 && am >= 2) return 'You hold the middle better here.'
  return null
}

// Locally-saved survey progress, so a closed/reopened tab resumes where it left off.
// Keyed by link slug. The `seed` is saved too, so the same sampled question set comes back.
const progressKey = (slug: string | undefined) => `fishbowl_survey_progress_${slug ?? ''}`
function readSurveyProgress(slug: string | undefined): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(progressKey(slug)) || '{}') || {}
  } catch {
    return {}
  }
}

export default function Questionnaire() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [saved] = useState(() => readSurveyProgress(slug))
  const [session, setSession] = useState<Session | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [i, setI] = useState<number>(() => (typeof saved.i === 'number' ? saved.i : 0))
  const [answers, setAnswers] = useState<Record<number, string | number>>(() => (saved.answers as Record<number, string | number>) ?? {})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState<string>(() => (typeof saved.email === 'string' ? saved.email : ''))
  const [dir, setDir] = useState(1)
  const [myProfile, setMyProfile] = useState<Record<string, number> | null>(null)
  const [respTiers, setRespTiers] = useState<ResponsibilityTiers>(() => (saved.respTiers as ResponsibilityTiers) ?? {})
  const [respNotes, setRespNotes] = useState<Record<number, string>>(() => (saved.respNotes as Record<number, string>) ?? {})
  const [hats, setHats] = useState<HatScores>(() => (saved.hats as HatScores) ?? {})
  const [candor, setCandor] = useState<CandorAnswers>(() => (saved.candor as CandorAnswers) ?? {})
  const [sdt, setSdt] = useState<Record<string, number>>(() => (saved.sdt as Record<string, number>) ?? {})
  const [belbin, setBelbin] = useState<Record<string, number>>(() => (saved.belbin as Record<string, number>) ?? {})
  const [via, setVia] = useState<string[]>(() => (saved.via as string[]) ?? [])
  const [johari, setJohari] = useState<string[]>(() => (saved.johari as string[]) ?? [])
  const [nohari, setNohari] = useState<string[]>(() => (saved.nohari as string[]) ?? [])
  // First-open explainer: the friend often gets this link with zero context, so we
  // spell out what it is (anonymous, to help the person grow) before the first question.
  // Shown once per link (localStorage-gated).
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !localStorage.getItem(`fishbowl_intro_seen_${slug}`)
    } catch {
      return true
    }
  })
  const dismissIntro = () => {
    try {
      localStorage.setItem(`fishbowl_intro_seen_${slug}`, '1')
    } catch {
      /* storage unavailable */
    }
    setShowIntro(false)
  }
  const advanceTimer = useRef<number | null>(null)
  // Sampled-subset seed. Restored from saved progress so the SAME question set comes back
  // on resume; otherwise fresh per respondent.
  const seedRef = useRef(typeof saved.seed === 'number' ? saved.seed : Math.floor(Math.random() * 1e9))

  useEffect(() => {
    if (!slug) return
    getSession(slug).then((s) => {
      if (s) {
        setSession(s)
        setQuestions(getColleagueSurvey(s.creator_name, seedRef.current, (s.responsibilities?.length ?? 0) > 0))
      }
      setLoading(false)
    })
  }, [slug])

  // If this respondent has their own Fishbowl (and isn't answering their own
  // link), load their profile so we can show live "you vs them" reads.
  useEffect(() => {
    const stored = localStorage.getItem('fishbowl_my_session')
    if (!stored) return
    try {
      const { slug: mySlug } = JSON.parse(stored)
      if (!mySlug || mySlug === slug) return
      getSession(mySlug).then((s) => {
        if (s?.dimension_means) setMyProfile(s.dimension_means as Record<string, number>)
      })
    } catch {
      /* ignore */
    }
  }, [slug])

  // Clear any pending auto-advance on unmount.
  useEffect(
    () => () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    },
    []
  )

  // Persist progress locally on every change, so closing the tab and reopening the link
  // resumes exactly where they left off. Cleared on submit.
  useEffect(() => {
    if (!slug || loading || submitting) return
    try {
      localStorage.setItem(
        progressKey(slug),
        JSON.stringify({ seed: seedRef.current, i, answers, respTiers, respNotes, hats, candor, sdt, belbin, via, johari, nohari, email })
      )
    } catch {
      /* storage full / disabled */
    }
  }, [slug, loading, submitting, i, answers, respTiers, respNotes, hats, candor, sdt, belbin, via, johari, nohari, email])

  // Safety: if a restored index somehow lands past the (re-sampled) question set, clamp it.
  useEffect(() => {
    if (questions.length && i > questions.length - 1) setI(questions.length - 1)
  }, [questions.length, i])

  if (loading) {
    return (
      <Screen>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1 }} className="text-5xl">
          🐟
        </motion.div>
      </Screen>
    )
  }
  if (!session) {
    return (
      <Screen>
        <p className="display text-3xl">This link doesn't exist.</p>
      </Screen>
    )
  }

  const q = questions[i]
  const a = answers[q.id]
  const structuredTypes = ['energizer', 'responsibilities', 'sixhats', 'radical_candor', 'sdt', 'belbin', 'via', 'johari', 'nohari']
  const answered = structuredTypes.includes(q.type) ? true : a !== undefined && a !== ''
  const isLast = i === questions.length - 1
  const myMean = q.dimension ? myProfile?.[q.dimension] : undefined
  const nudgeMsg = q.type === 'virtue' && myMean != null && typeof a === 'number' ? compareNudge(myMean, a) : null
  // Discrete answers auto-advance, so they need no Next button; only free-text / the
  // tag grids (or a virtue paused on a nudge) show one.
  const autoAdvances = q.type === 'virtue' || q.type === 'likert' || q.type === 'scenario'
  const showNext = !isLast && answered && !autoAdvances
  const clearAdvance = () => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
  }
  const go = (d: number) => {
    clearAdvance()
    setDir(d)
    setI((c) => Math.min(Math.max(c + d, 0), questions.length - 1))
  }
  const set = (v: string | number) => setAnswers((prev) => ({ ...prev, [q.id]: v }))
  // Picking a discrete option auto-advances after a beat; free-text uses Next.
  const handleSelect = (v: string | number) => {
    playQuizTick()
    set(v)
    if (q.type === 'freetext' || isLast) return
    // Auto-advance on any discrete pick (like the self-flow, no Next button). If a live
    // "you vs them" nudge will show, linger a beat longer so it can be read, but still
    // advance on its own.
    const mine = q.dimension ? myProfile?.[q.dimension] : undefined
    const willNudge = q.type === 'virtue' && mine != null && compareNudge(mine, v as number) != null
    clearAdvance()
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null
      go(1)
    }, willNudge ? 1100 : 340)
  }
  const submit = async () => {
    setSubmitting(true)
    try {
      await submitResponse(
        session.id,
        {
          ...answers,
          responsibility_tiers: respTiers,
          responsibility_notes: respNotes,
          hats,
          radical_candor: candor,
          sdt,
          belbin,
          via,
          johari,
          nohari,
        },
        email.trim() || undefined
      )
    } catch {
      /* best effort */
    }
    try {
      localStorage.removeItem(progressKey(slug))
    } catch {
      /* ignore */
    }
    navigate(`/s/${slug}/done`)
  }

  const pct = ((i + 1) / questions.length) * 100

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5">
      {/* First-open explainer for the friend who arrived with no context. */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] as const }}
              className="w-full max-w-sm rounded-3xl border-[2.5px] border-ink bg-paper-hi p-7 text-center shadow-chunky"
            >
              <div className="text-5xl">🪞</div>
              <p className="kicker mt-3 text-pink-deep">you were asked for feedback</p>
              <h2 className="display mt-1 text-3xl leading-tight">Help {session.creator_name} level-up as a human</h2>
              <ul className="mx-auto mt-5 flex max-w-xs flex-col gap-3 text-left text-[0.95rem] leading-snug text-ink-soft">
                <li className="flex gap-2.5">
                  <span aria-hidden>🔒</span>
                  <span>
                    <span className="font-bold text-ink">Completely anonymous.</span> {session.creator_name} sees the patterns, never who said what.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden>💡</span>
                  <span>
                    It shows them their <span className="font-bold text-ink">blind spots</span> so they can grow and be easier to work with.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden>⏱️</span>
                  <span>
                    About <span className="font-bold text-ink">3 minutes</span>. Just answer honestly.
                  </span>
                </li>
              </ul>
              <button
                onClick={dismissIntro}
                className="press mt-7 w-full cursor-pointer rounded-2xl border-[2.5px] border-ink bg-pink sc-pink px-5 py-3.5 font-display text-lg font-black text-ink shadow-chunky-sm"
              >
                Got it, let&rsquo;s go →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* progress */}
      <div className="sticky top-0 z-10 -mx-5 px-5 pb-3 pt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="kicker text-pink-deep">{q.section}</span>
          <span className="kicker text-ink-soft">
            {i + 1} / {questions.length}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper-hi">
          <motion.div className="h-full bg-blue" animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut' }} />
        </div>
        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          className="press mt-3 cursor-pointer rounded-full border-[2.5px] border-ink bg-paper-hi px-4 py-1.5 text-sm font-semibold text-ink shadow-chunky-sm disabled:opacity-40 disabled:pointer-events-none"
        >
          ← Back
        </button>
      </div>

      {/* question */}
      <div className="flex flex-1 flex-col justify-center py-8">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={q.id}
            custom={dir}
            initial={{ opacity: 0, x: dir > 0 ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir > 0 ? -60 : 60 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] as const }}
          >
            <h2 className="display mb-8 text-[clamp(1.9rem,5vw,2.9rem)]">{q.text}</h2>

            {q.type === 'virtue' && q.virtue && (
              <>
                <VirtueSlider
                  id={`q${q.id}`}
                  value={(a as number) ?? null}
                  onChange={handleSelect}
                  virtueLabel={q.virtue.name}
                  deficientLabel={q.virtue.deficientPole}
                  excessiveLabel={q.virtue.excessivePole}
                  deficientTraits={q.virtue.deficientTraits}
                  virtueTraits={q.virtue.virtueTraits}
                  excessiveTraits={q.virtue.excessiveTraits}
                />
                {nudgeMsg && (
                  <motion.p
                    key={nudgeMsg}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 text-center text-sm font-semibold text-blue-deep"
                  >
                    ✦ {nudgeMsg}
                  </motion.p>
                )}
              </>
            )}
            {q.type === 'likert' && (
              <LikertScale value={(a as number) ?? null} onChange={handleSelect} lowLabel={q.lowLabel || 'Disagree'} highLabel={q.highLabel || 'Agree'} />
            )}
            {q.type === 'scenario' && q.options && (
              <ScenarioChoice options={q.options} selected={(a as string) ?? null} onSelect={handleSelect} />
            )}
            {q.type === 'freetext' && <FreeText value={(a as string) || ''} onChange={set} maxLength={q.maxLength} placeholder={q.placeholder} />}
            {q.type === 'responsibilities' && (
              <TierTagger
                items={session.responsibilities || []}
                value={respTiers}
                onChange={setRespTiers}
                notes={respNotes}
                onNotesChange={setRespNotes}
              />
            )}
            {q.type === 'sixhats' && <HatsTagger value={hats} onChange={setHats} />}
            {q.type === 'radical_candor' && (
              <CandorTagger name={session.creator_name} value={candor} onChange={setCandor} />
            )}
            {q.type === 'sdt' && (
              <AllocationTagger
                buckets={SDT_NEEDS.map((s) => ({ key: s.key, label: s.label, sub: s.feelStem }))}
                total={SDT_TOTAL}
                value={sdt}
                onChange={setSdt}
              />
            )}
            {q.type === 'belbin' && (
              <AllocationTagger
                buckets={BELBIN_ROLES.map((r) => ({ key: r.key, label: r.name, sub: r.short }))}
                total={BELBIN_TOTAL}
                value={belbin}
                onChange={setBelbin}
              />
            )}
            {q.type === 'via' && (
              <ChipPicker
                options={VIA_STRENGTHS.map((s) => ({ id: s.id, label: s.name, group: s.virtue }))}
                min={VIA_PICK}
                max={VIA_PICK}
                value={via}
                onChange={setVia}
              />
            )}
            {q.type === 'johari' && (
              <ChipPicker
                options={JOHARI_ADJECTIVES.map((w) => ({ id: w, label: w }))}
                min={JOHARI_MIN}
                max={JOHARI_MAX}
                value={johari}
                onChange={setJohari}
              />
            )}
            {q.type === 'nohari' && (
              <ChipPicker
                options={WEAKNESSES.map((w) => ({ id: w, label: w }))}
                min={NOHARI_MIN}
                max={NOHARI_MAX}
                value={nohari}
                onChange={setNohari}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {isLast && (
        <div className="pb-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email (optional), get notified + your own Fishbowl"
            className="w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-base text-ink shadow-chunky-sm outline-none placeholder:text-ink-soft/55 focus:shadow-chunky"
          />
          <p className="mt-1.5 text-center text-xs text-ink-soft">
            Never shown to {session.creator_name}. You stay anonymous to them.
          </p>
        </div>
      )}

      {/* nav — Back lives up in the header; here we only float the forward action
          (most discrete screens auto-advance and show nothing here) */}
      {(isLast || showNext) && (
        <div className="sticky bottom-0 -mx-5 flex justify-end px-5 pb-5 pt-3">
          {isLast ? (
            <Button variant="blue" onClick={submit} disabled={!answered || submitting}>
              {submitting ? 'Sending…' : 'Submit ✓'}
            </Button>
          ) : (
            <Button variant="pink" onClick={() => go(1)} disabled={!answered}>
              Next →
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
