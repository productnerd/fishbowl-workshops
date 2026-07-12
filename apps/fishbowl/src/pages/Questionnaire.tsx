import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Question, Session, ResponsibilityTiers, HatScores, CandorAnswers, Lens } from '@fishbowl/feedback-core'
import {
  SDT_NEEDS,
  SDT_TOTAL,
  BELBIN_ROLES,
  BELBIN_TOTAL,
  ADJECTIVE_OPTIONS,
  ADJECTIVE_MIN,
  ADJECTIVE_MAX,
  ADJECTIVE_GROUP_MAX,
  splitAdjectives,
} from '@fishbowl/feedback-core'
import { getSession, submitResponse } from '../lib/data'
import { playQuizTick } from '../lib/sound'
import { getSurvey, type SurveyDepth } from '../data/questions'
import VirtueSlider from '../components/VirtueSlider'
import LikertScale from '../components/LikertScale'
import ScenarioSlider from '../components/ScenarioSlider'
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

// Personal-lens descriptions for the "what you fuel" needs, so a friend never rates
// "on top of my game" or "why the work matters". Keys = SDT need keys; absent = universal.
const PERSONAL_SDT_SUB: Record<string, string> = {
  autonomy: '…free to be fully myself',
  competence: '…more capable and sure of myself',
  relatedness: '…genuinely connected and close',
  purpose: '…clearer on what matters',
  impact: '…that I make a real difference to them',
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
// Keyed by link slug. The chosen `depth` is saved too, so the same question set comes back.
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
  // How much the colleague chose to give: quick (~2-3 min) or full (~6-8 min). Null until
  // they pick on the screen after the intro. Restored from saved progress so resume matches.
  const [depth, setDepth] = useState<SurveyDepth | null>(() =>
    saved.depth === 'quick' || saved.depth === 'standard' || saved.depth === 'full' ? (saved.depth as SurveyDepth) : null
  )
  // Relationship lens: colleagues answer 'work', friends/family answer 'personal' (re-framed
  // questions, work-only activities dropped). Chosen on the gate before the depth screen.
  // `?as=work|personal` in the URL pre-selects it (for testing both flows from a link).
  const [searchParams] = useSearchParams()
  const [lens, setLens] = useState<Lens | null>(() => {
    const as = searchParams.get('as')
    if (as === 'work' || as === 'personal') return as
    return saved.lens === 'work' || saved.lens === 'personal' ? (saved.lens as Lens) : null
  })
  const questions = useMemo<Question[]>(
    () =>
      session && depth && lens
        ? getSurvey(session.creator_name, (session.responsibilities?.length ?? 0) > 0, depth, lens)
        : [],
    [session, depth, lens]
  )
  const [i, setI] = useState<number>(() => (typeof saved.i === 'number' ? saved.i : 0))
  const [answers, setAnswers] = useState<Record<number, string | number>>(() => (saved.answers as Record<number, string | number>) ?? {})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  // Respondent email is no longer collected inline — the Done screen handles the
  // "create your own Fishbowl" conversion. Kept for payload/persistence shape only.
  const [email] = useState<string>(() => (typeof saved.email === 'string' ? saved.email : ''))
  const [dir, setDir] = useState(1)
  const [myProfile, setMyProfile] = useState<Record<string, number> | null>(null)
  const [respTiers, setRespTiers] = useState<ResponsibilityTiers>(() => (saved.respTiers as ResponsibilityTiers) ?? {})
  const [respNotes, setRespNotes] = useState<Record<number, string>>(() => (saved.respNotes as Record<number, string>) ?? {})
  const [hats, setHats] = useState<HatScores>(() => (saved.hats as HatScores) ?? {})
  const [candor, setCandor] = useState<CandorAnswers>(() => (saved.candor as CandorAnswers) ?? {})
  const [sdt, setSdt] = useState<Record<string, number>>(() => (saved.sdt as Record<string, number>) ?? {})
  const [belbin, setBelbin] = useState<Record<string, number>>(() => (saved.belbin as Record<string, number>) ?? {})
  // VIA is retired from the survey (its aggregate fed nothing); the bucket stays so the
  // submit payload shape is unchanged. Johari + Nohari are now one merged pick.
  const [via] = useState<string[]>(() => (saved.via as string[]) ?? [])
  const [johari, setJohari] = useState<string[]>(() => (saved.johari as string[]) ?? [])
  const [nohari, setNohari] = useState<string[]>(() => (saved.nohari as string[]) ?? [])
  // One-time midway breather (thank + encourage to finish).
  const [midSeen, setMidSeen] = useState(false)
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

  useEffect(() => {
    if (!slug) return
    getSession(slug).then((s) => {
      if (s) setSession(s)
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
        JSON.stringify({ lens, depth, i, answers, respTiers, respNotes, hats, candor, sdt, belbin, via, johari, nohari, email })
      )
    } catch {
      /* storage full / disabled */
    }
  }, [slug, loading, submitting, lens, depth, i, answers, respTiers, respNotes, hats, candor, sdt, belbin, via, johari, nohari, email])

  // Safety: if a restored index somehow lands past the (depth-based) question set, clamp it.
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

  // Relationship gate: colleagues and friends/family answer the same constructs with
  // differently-framed scenarios, so the subject gets a fuller, multi-context picture.
  if (!lens) {
    const pick = (l: Lens) => {
      playQuizTick()
      setLens(l)
    }
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
        {/* First-open explainer for the friend who arrived with no context — shows before
            the relationship question. */}
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
                      It shows them their <span className="font-bold text-ink">blind spots</span> so they can grow and be easier to be around.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span aria-hidden>⏱️</span>
                    <span>
                      A couple of quick questions set it up, then just <span className="font-bold text-ink">answer honestly</span>.
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

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="kicker text-pink-deep">before you start</p>
          <h1 className="display mt-2 text-4xl leading-tight">How do you know {session.creator_name}?</h1>
          <p className="serif mt-3 leading-snug text-ink-soft">
            It shapes the questions — a friend gets asked different things than a colleague, so {session.creator_name}{' '}
            gets a fuller picture of who they are.
          </p>
          <div className="mt-7 flex flex-col gap-4">
            <button
              onClick={() => pick('work')}
              className="press cursor-pointer rounded-3xl border-[2.5px] border-ink bg-paper-hi px-6 py-5 text-left shadow-chunky-sm"
            >
              <span className="display block text-2xl leading-tight">We work together</span>
              <p className="mt-1 text-sm leading-snug text-ink-soft">Colleague, manager, report, or client.</p>
            </button>
            <button
              onClick={() => pick('personal')}
              className="press cursor-pointer rounded-3xl border-[2.5px] border-ink bg-paper-hi px-6 py-5 text-left shadow-chunky-sm"
            >
              <span className="display block text-2xl leading-tight">We&rsquo;re friends or family</span>
              <p className="mt-1 text-sm leading-snug text-ink-soft">Friend, partner, family, or someone close.</p>
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Intro explainer, then the duration choice. Full is framed as the bigger gift so people
  // lean toward giving the richer, more accurate read.
  if (!depth) {
    const choose = (d: SurveyDepth) => {
      playQuizTick()
      setDepth(d)
    }
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="kicker text-pink-deep">before you start</p>
          <h1 className="display mt-2 text-4xl leading-tight">How much time do you have for {session.creator_name}?</h1>
          <p className="serif mt-3 leading-snug text-ink-soft">
            The more you share, the richer and more accurate their mirror. Going all in is the biggest gift you can give them.
          </p>

          <div className="mt-7 flex flex-col gap-4">
            {/* Full — the hero */}
            <button
              onClick={() => choose('full')}
              className="press relative cursor-pointer rounded-3xl border-[2.5px] border-ink bg-pink sc-pink px-6 py-5 text-left shadow-chunky"
            >
              <span className="absolute -top-3 right-5 rounded-full border-2 border-ink bg-paper-hi px-3 py-0.5 text-xs font-black uppercase tracking-wide text-pink-deep">
                ♥ the most love
              </span>
              <span className="kicker text-ink/70">~6 to 8 minutes</span>
              <span className="display mt-1 block text-2xl leading-tight">Go all in</span>
              <p className="mt-1.5 text-[0.95rem] leading-snug text-ink/80">
                Every activity, the whole picture. The deepest, most accurate read.
              </p>
            </button>

            {/* Standard — the middle read */}
            <button
              onClick={() => choose('standard')}
              className="press cursor-pointer rounded-3xl border-[2.5px] border-ink bg-paper-hi px-6 py-4 text-left shadow-chunky-sm"
            >
              <span className="kicker text-ink-soft">~3 to 4 minutes</span>
              <span className="display mt-1 block text-xl leading-tight">A generous read</span>
              <p className="mt-1 text-sm leading-snug text-ink-soft">
                The essentials, plus the words people reach for and a few kind watch-outs.
              </p>
            </button>

            {/* Quick — secondary */}
            <button
              onClick={() => choose('quick')}
              className="press cursor-pointer rounded-3xl border-[2.5px] border-ink bg-paper-hi px-6 py-4 text-left shadow-chunky-sm"
            >
              <span className="kicker text-ink-soft">~2 to 3 minutes</span>
              <span className="display mt-1 block text-xl leading-tight">Keep it short</span>
              <p className="mt-1 text-sm leading-snug text-ink-soft">
                The essentials: their character, the core ratings, and your honest words.
              </p>
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  const q = questions[i]
  const a = answers[q.id]
  const structuredTypes = ['energizer', 'responsibilities', 'sixhats', 'radical_candor', 'sdt', 'belbin', 'via', 'johari', 'nohari']
  const answered = structuredTypes.includes(q.type) ? true : a !== undefined && a !== ''
  // Point-allocation slides (SDT / Belbin) are optional: the forward button reads "Skip"
  // until more than one point is spent, then it flips to "Next".
  const allocSpent =
    q.type === 'sdt'
      ? Object.values(sdt).reduce((s, v) => s + (v || 0), 0)
      : q.type === 'belbin'
        ? Object.values(belbin).reduce((s, v) => s + (v || 0), 0)
        : null
  const allocSkippable = allocSpent !== null && allocSpent <= 1
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
          _relationship: lens ?? 'work',
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

  // Progress = slides completed, not current position: 0% on the first slide (nothing
  // answered yet), and the last slide sits below 100% until submit navigates away.
  const pct = (i / questions.length) * 100

  // A one-time breather at the halfway point: thank them and nudge them to finish.
  const midIdx = Math.floor(questions.length / 2)
  if (!midSeen && !isLast && i === midIdx && questions.length >= 8) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="text-6xl">🌊</div>
          <p className="kicker mt-4 text-pink-deep">halfway there</p>
          <h1 className="display mt-2 text-4xl leading-tight">You&rsquo;re halfway. Thank you.</h1>
          <p className="serif mt-3 text-lg leading-snug text-ink-soft">
            Most people never do this for someone. {session.creator_name} is going to feel it — and the richest
            part of their report comes from the second half.
          </p>
          <div className="mt-5 inline-block rounded-2xl border-2 border-ink bg-paper-hi px-4 py-2 text-sm font-semibold text-ink shadow-chunky-sm">
            {Math.round(pct)}% done · just a few minutes left
          </div>
          <div className="mt-7">
            <Button variant="pink" onClick={() => setMidSeen(true)} className="!text-xl">
              Keep going →
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5">
      {/* progress */}
      <div className="sticky top-0 z-10 -mx-5 px-5 pb-3 pt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="kicker text-pink-deep">{q.section}</span>
          {/* Percent, not "N / 31": some slides hold several activities, so a raw slide
              count reads as fast-then-slow. A filling % tracks the bar honestly. */}
          <span className="kicker text-ink-soft">{Math.round(pct)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper-hi">
          <motion.div className="h-full bg-blue" animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut' }} />
        </div>
        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          className="press mt-3 cursor-pointer rounded-full border-[2.5px] border-ink bg-paper-hi px-4 py-1.5 text-sm font-semibold text-ink shadow-chunky-sm disabled:opacity-40 disabled:pointer-events-none sm:fixed sm:left-5 sm:top-5 sm:z-30 sm:mt-0"
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
              <ScenarioSlider
                id={`q${q.id}`}
                value={(a as number) ?? null}
                onChange={handleSelect}
                deficientLabel={q.options.find((o) => q.optionTendencies?.[o] === 'deficient') ?? q.options[0]}
                balancedLabel={q.options.find((o) => q.optionTendencies?.[o] === 'balanced') ?? q.options[1]}
                excessiveLabel={q.options.find((o) => q.optionTendencies?.[o] === 'excessive') ?? q.options[2]}
              />
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
              <CandorTagger name={session.creator_name} value={candor} onChange={setCandor} lens={lens ?? 'work'} />
            )}
            {q.type === 'sdt' && (
              <AllocationTagger
                buckets={SDT_NEEDS.map((s) => ({
                  key: s.key,
                  label: s.label,
                  sub: (lens === 'personal' && PERSONAL_SDT_SUB[s.key]) || s.feelStem,
                }))}
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
            {/* Merged adjective pick: one grid of "how they show up" + "watch-outs", split
                back into the johari / nohari answer buckets so the report is unchanged. */}
            {q.type === 'johari' && (
              <ChipPicker
                options={ADJECTIVE_OPTIONS}
                min={ADJECTIVE_MIN}
                max={ADJECTIVE_MAX}
                groupMax={ADJECTIVE_GROUP_MAX}
                value={[...johari, ...nohari]}
                onChange={(picks) => {
                  const s = splitAdjectives(picks)
                  setJohari(s.johari)
                  setNohari(s.nohari)
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* nav — Back lives up in the header; here we only float the forward action
          (most discrete screens auto-advance and show nothing here). Free-text is
          optional: it always shows a Skip that flips to Next / Submit once text is typed. */}
      {(isLast || showNext || q.type === 'freetext') && (
        <div className="sticky bottom-0 -mx-5 flex justify-end px-5 pb-5 pt-3">
          {isLast ? (
            <Button variant="blue" onClick={submit} disabled={(!answered && q.type !== 'freetext') || submitting}>
              {submitting ? 'Sending…' : answered ? 'Submit ✓' : 'Skip & submit ✓'}
            </Button>
          ) : (q.type === 'freetext' && !answered) || allocSkippable ? (
            <Button variant="paper" onClick={() => go(1)}>
              Skip →
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
