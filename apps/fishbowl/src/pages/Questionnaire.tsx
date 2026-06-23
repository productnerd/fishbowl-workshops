import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Question, Session } from '@fishbowl/feedback-core'
import { getSession, submitResponse } from '../lib/data'
import { getQuestionsForName } from '../data/questions'
import VirtueSlider from '../components/VirtueSlider'
import LikertScale from '../components/LikertScale'
import ScenarioChoice from '../components/ScenarioChoice'
import FreeText from '../components/FreeText'
import Button from '../components/Button'

function Screen({ children }: { children: ReactNode }) {
  return <div className="grid min-h-dvh place-items-center px-5">{children}</div>
}

export default function Questionnaire() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string | number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [dir, setDir] = useState(1)
  const advanceTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!slug) return
    getSession(slug).then((s) => {
      if (s) {
        setSession(s)
        setQuestions(getQuestionsForName(s.creator_name))
      }
      setLoading(false)
    })
  }, [slug])

  // Clear any pending auto-advance on unmount.
  useEffect(
    () => () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    },
    []
  )

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
  const answered = a !== undefined && a !== ''
  const isLast = i === questions.length - 1
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
    set(v)
    if (q.type !== 'freetext' && !isLast) {
      clearAdvance()
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null
        go(1)
      }, 500)
    }
  }
  const prevSection = i > 0 ? questions[i - 1].section : null
  const newSection = q.section !== prevSection
  const submit = async () => {
    setSubmitting(true)
    try {
      await submitResponse(session.id, answers, email.trim() || undefined)
    } catch {
      /* best effort */
    }
    navigate(`/s/${slug}/done`)
  }

  const pct = ((i + 1) / questions.length) * 100

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5">
      {/* progress */}
      <div className="sticky top-0 z-10 -mx-5 bg-paper/85 px-5 pb-3 pt-5 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="kicker text-pink-deep">{q.section}</span>
          <span className="kicker text-ink-soft">
            {i + 1} / {questions.length}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper-hi">
          <motion.div className="h-full bg-blue" animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut' }} />
        </div>
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
            {newSection && <p className="serif mb-2 text-base text-ink-soft">{q.sectionDescription}</p>}
            <h2 className="display mb-8 text-[clamp(1.9rem,5vw,2.9rem)]">{q.text}</h2>

            {q.type === 'virtue' && q.virtue && (
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
            )}
            {q.type === 'likert' && (
              <LikertScale value={(a as number) ?? null} onChange={handleSelect} lowLabel={q.lowLabel || 'Disagree'} highLabel={q.highLabel || 'Agree'} />
            )}
            {q.type === 'scenario' && q.options && (
              <ScenarioChoice options={q.options} selected={(a as string) ?? null} onSelect={handleSelect} />
            )}
            {q.type === 'freetext' && <FreeText value={(a as string) || ''} onChange={set} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {isLast && (
        <div className="pb-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email (optional) — get notified + your own Fishbowl"
            className="w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-base text-ink shadow-chunky-sm outline-none placeholder:text-ink-soft/55 focus:shadow-chunky"
          />
          <p className="mt-1.5 text-center text-xs text-ink-soft">
            Never shown to {session.creator_name}. You stay anonymous to them.
          </p>
        </div>
      )}

      {/* nav */}
      <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 bg-paper/85 px-5 pb-5 pt-3 backdrop-blur-sm">
        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          className="press cursor-pointer rounded-full border-[2.5px] border-ink bg-paper-hi px-5 py-3 font-semibold text-ink shadow-chunky-sm disabled:opacity-40 disabled:pointer-events-none"
        >
          ← Back
        </button>
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
    </div>
  )
}
