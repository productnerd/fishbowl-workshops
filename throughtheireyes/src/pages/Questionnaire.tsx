import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getQuestionsForName } from '../data/questions'
import type { Question, Session } from '../types'
import MultipleChoice from '../components/questions/MultipleChoice'
import Rating from '../components/questions/Rating'
import FreeText from '../components/questions/FreeText'
import ProgressBar from '../components/ui/ProgressBar'
import Button from '../components/ui/Button'

export default function Questionnaire() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string | number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    const load = async () => {
      if (!slug) return

      if (isSupabaseConfigured()) {
        const { data } = await supabase
          .from('sessions')
          .select('*')
          .eq('slug', slug)
          .single()
        if (data) {
          setSession(data)
          setQuestions(getQuestionsForName(data.creator_name))
        }
      } else {
        const sessions = JSON.parse(localStorage.getItem('tte_sessions') || '{}')
        const s = sessions[slug]
        if (s) {
          setSession(s)
          setQuestions(getQuestionsForName(s.creator_name))
        }
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const alreadyResponded = slug ? localStorage.getItem(`tte_responded_${slug}`) === 'true' : false

  const q = questions[current]
  const isAnswered = q ? answers[q.id] !== undefined && answers[q.id] !== '' : false
  const isLast = current === questions.length - 1

  const handleNext = useCallback(() => {
    if (!isAnswered) return
    if (isLast) {
      handleSubmit()
    } else {
      setDirection(1)
      setCurrent((c) => c + 1)
    }
  }, [isAnswered, isLast, current])

  const handleBack = () => {
    if (current > 0) {
      setDirection(-1)
      setCurrent((c) => c - 1)
    }
  }

  const handleSubmit = async () => {
    if (!slug || !session) return
    setSubmitting(true)

    if (isSupabaseConfigured()) {
      const { error: dbError } = await supabase.from('responses').insert({
        session_id: session.id,
        answers,
      })
      if (dbError) {
        setError('Failed to submit. Please try again.')
        setSubmitting(false)
        return
      }
    } else {
      const responses = JSON.parse(localStorage.getItem('tte_responses') || '{}')
      if (!responses[slug]) responses[slug] = []
      responses[slug].push({
        id: crypto.randomUUID(),
        session_id: session.id,
        answers,
        completed_at: new Date().toISOString(),
      })
      localStorage.setItem('tte_responses', JSON.stringify(responses))

      // Update response count
      const sessions = JSON.parse(localStorage.getItem('tte_sessions') || '{}')
      if (sessions[slug]) {
        sessions[slug].response_count = (sessions[slug].response_count || 0) + 1
        localStorage.setItem('tte_sessions', JSON.stringify(sessions))
      }
    }

    localStorage.setItem(`tte_responded_${slug}`, 'true')
    navigate(`/s/${slug}/done`)
  }

  if (loading) {
    return (
      <div className="card-screen">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="text-4xl">
          👁
        </motion.div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="card-screen text-center">
        <div className="text-5xl mb-4">😕</div>
        <h1 className="text-2xl font-bold mb-2">Link not found</h1>
        <p className="text-text-secondary">This link doesn't exist or has expired.</p>
      </div>
    )
  }

  if (alreadyResponded) {
    return (
      <div className="card-screen text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">You've already responded!</h1>
        <p className="text-text-secondary">
          Thanks for helping {session.creator_name} see themselves through your eyes.
        </p>
      </div>
    )
  }

  if (!q) return null

  // Determine if we're entering a new section
  const prevQ = current > 0 ? questions[current - 1] : null
  const isNewSection = !prevQ || prevQ.section !== q.section

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface/80 backdrop-blur-lg px-4 pt-4 pb-3">
        <ProgressBar current={current + 1} total={questions.length} />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={q.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-6 w-full max-w-lg"
          >
            {isNewSection && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mb-2"
              >
                <p className="text-xs uppercase tracking-widest text-primary-light font-semibold mb-1">
                  {q.section}
                </p>
                <p className="text-xs text-text-secondary">{q.sectionDescription}</p>
              </motion.div>
            )}

            <h2 className="text-xl md:text-2xl font-bold text-center leading-snug">
              {q.text}
            </h2>

            {q.type === 'mc' && q.options && (
              <MultipleChoice
                options={q.options}
                selected={answers[q.id] as string | null ?? null}
                onSelect={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              />
            )}
            {q.type === 'rating' && (
              <Rating
                value={answers[q.id] as number | null ?? null}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              />
            )}
            {q.type === 'freetext' && (
              <FreeText
                value={(answers[q.id] as string) || ''}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-lg border-t border-white/5 px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button
            onClick={handleBack}
            disabled={current === 0}
            className="text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 cursor-pointer transition-colors"
          >
            ← Back
          </button>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <Button
            onClick={handleNext}
            disabled={!isAnswered || submitting}
            variant="primary"
            className="!px-6 !py-3 text-sm"
          >
            {submitting ? 'Submitting...' : isLast ? 'Submit' : 'Next →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
