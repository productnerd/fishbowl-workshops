import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { aggregateResponses, topMcAnswers } from '../lib/aggregation'
import type { Session, AggregatedResults } from '../types'
import WrapCard from '../components/wrapped/WrapCard'
import BarChart from '../components/wrapped/BarChart'
import GaugeChart from '../components/wrapped/GaugeChart'
import QuoteCarousel from '../components/wrapped/QuoteCarousel'
import SummaryCard from '../components/wrapped/SummaryCard'
import ProgressDots from '../components/wrapped/ProgressDots'
import Button from '../components/ui/Button'

const REQUIRED_RESPONSES = 6

export default function Results() {
  const { slug } = useParams<{ slug: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [data, setData] = useState<AggregatedResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [cardIndex, setCardIndex] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!slug) return

      if (isSupabaseConfigured()) {
        const { data: sessionData } = await supabase
          .from('tte_sessions').select('*').eq('slug', slug).single()
        if (!sessionData) { setLoading(false); return }
        setSession(sessionData)

        if (sessionData.response_count >= REQUIRED_RESPONSES) {
          const { data: responses } = await supabase
            .from('tte_responses').select('answers').eq('session_id', sessionData.id)
          if (responses) {
            setData(aggregateResponses(responses, sessionData.creator_name))
          }
        }
      } else {
        const sessions = JSON.parse(localStorage.getItem('tte_sessions') || '{}')
        const s = sessions[slug]
        if (!s) { setLoading(false); return }
        setSession(s)

        const responses = JSON.parse(localStorage.getItem('tte_responses') || '{}')
        const resps = responses[slug] || []
        if (resps.length >= REQUIRED_RESPONSES) {
          setData(aggregateResponses(resps, s.creator_name))
        }
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const totalCards = 16
  const next = useCallback(() => setCardIndex((i) => Math.min(i + 1, totalCards - 1)), [])
  const prev = useCallback(() => setCardIndex((i) => Math.max(i - 1, 0)), [])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev])

  // Touch swipe
  useEffect(() => {
    let startX = 0
    const handleStart = (e: TouchEvent) => { startX = e.touches[0].clientX }
    const handleEnd = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX
      if (Math.abs(diff) > 50) {
        if (diff > 0) next()
        else prev()
      }
    }
    window.addEventListener('touchstart', handleStart)
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('touchstart', handleStart)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [next, prev])

  if (loading) {
    return (
      <div className="card-screen">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="text-4xl">👁</motion.div>
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

  // Locked state
  if (!data) {
    const remaining = Math.max(0, REQUIRED_RESPONSES - (session.response_count || 0))
    const shareLink = `${window.location.origin}${window.location.pathname}#/s/${slug}`

    return (
      <div className="card-screen text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 max-w-lg"
        >
          <div className="text-7xl">🔒</div>
          <h1 className="text-3xl font-bold">Results are locked</h1>
          <p className="text-lg text-text-secondary">
            You need <span className="text-primary-light font-bold">{remaining} more</span>{' '}
            {remaining === 1 ? 'response' : 'responses'} to unlock your reveal.
          </p>

          <div className="w-full bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-text-secondary">Progress</span>
              <span className="text-primary-light font-semibold">
                {session.response_count || 0} / {REQUIRED_RESPONSES}
              </span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((session.response_count || 0) / REQUIRED_RESPONSES) * 100}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              />
            </div>
          </div>

          <p className="text-sm text-text-secondary">Share your link to get more responses:</p>
          <div className="w-full p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2">
            <input readOnly value={shareLink} className="flex-1 bg-transparent text-xs text-text-primary truncate outline-none" />
            <button
              onClick={() => navigator.clipboard.writeText(shareLink)}
              className="px-3 py-1.5 bg-primary rounded-lg text-xs font-medium text-white cursor-pointer hover:bg-primary-dark transition-colors"
            >
              Copy
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── THE REVEAL ───

  if (!started) {
    return (
      <WrapCard gradient="purple">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="text-7xl">👁</div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            {data.totalResponses} people looked at you
            <br />
            <span className="text-primary-light">— really looked.</span>
          </h1>
          <p className="text-text-secondary text-lg">Ready to see what they saw?</p>
          <Button onClick={() => setStarted(true)}>
            Show me →
          </Button>
        </motion.div>
      </WrapCard>
    )
  }

  // Helper functions
  const mc = (id: number) => data.mcResults[id]
  const rating = (id: number) => data.ratingResults[id]
  const freetext = (id: number) => data.freetextResults[id] || []
  const topAnswers = (id: number, n = 4) => topMcAnswers(mc(id), n)

  // MC options are phrased in third person during the quiz ("That they were serious").
  // When shown back to the creator, swap pronouns to second person.
  const toSecondPerson = (s: string): string =>
    s
      .replace(/\bthey're\b/gi, (m) => (m[0] === 'T' ? "You're" : "you're"))
      .replace(/\bthey\b/gi, (m) => (m[0] === 'T' ? 'You' : 'you'))
      .replace(/\btheir\b/gi, (m) => (m[0] === 'T' ? 'Your' : 'your'))
      .replace(/\bthemselves\b/gi, 'yourself')
  const topAnswersYou = (id: number, n = 4) =>
    topAnswers(id, n).map((a) => ({ ...a, option: toSecondPerson(a.option) }))

  const cards: Array<{ gradient: string; content: React.ReactNode }> = [
    // 0: First Impressions
    {
      gradient: 'warm',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">First Impressions</p>
          <h2 className="text-2xl md:text-3xl font-bold">Before they knew you, this is what they felt</h2>
          <div className="w-full space-y-4">
            <p className="text-sm text-text-secondary mb-2">The vibe you give off in the first 5 minutes:</p>
            <BarChart items={topAnswers(2).map(a => ({ label: a.option, value: a.pct }))} />
            <div className="mt-4 p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-text-secondary mb-1">What they wrongly assumed:</p>
              <p className="text-xl font-bold text-primary-light">{toSecondPerson(mc(1)?.winner || '')}</p>
            </div>
          </div>
        </>
      ),
    },
    // 1: How They Saw You Change
    {
      gradient: 'ocean',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">The Shift</p>
          <h2 className="text-2xl md:text-3xl font-bold">First impressions that changed once they knew you</h2>
          <QuoteCarousel quotes={freetext(3)} emptyMessage="No stories shared yet" />
        </>
      ),
    },
    // 2: Your Superpower
    {
      gradient: 'purple',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Your Superpower</p>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
          >
            <p className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
              {mc(4)?.winner}
            </p>
          </motion.div>
          <p className="text-text-secondary">Your most underrated skill, according to your people.</p>
          <div className="w-full mt-2">
            <p className="text-sm text-text-secondary mb-2">How the vote broke down:</p>
            <BarChart items={topAnswers(4).map(a => ({ label: a.option, value: a.pct }))} />
          </div>
        </>
      ),
    },
    // 3: Trust in your judgment
    {
      gradient: 'ocean',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Trust</p>
          <h2 className="text-2xl md:text-3xl font-bold">How much people trust your judgment when it matters</h2>
          <GaugeChart value={rating(6)?.average || 0} label="Trust in your judgment" sublabel="Average rating out of 5" />
        </>
      ),
    },
    // 3: Hidden Talent
    {
      gradient: 'forest',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Hidden Talent</p>
          <h2 className="text-2xl md:text-3xl font-bold">What you're great at and don't even notice</h2>
          <QuoteCarousel quotes={freetext(5)} emptyMessage="No talents noted yet" />
        </>
      ),
    },
    // 4: How You Communicate
    {
      gradient: 'ocean',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">How You Communicate</p>
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{rating(7)?.average || 0}</p>
              <p className="text-xs text-text-secondary mt-1">How well you listen</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{rating(8)?.average || 0}</p>
              <p className="text-xs text-text-secondary mt-1">Safe to be honest with</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-3">In a disagreement, you tend to:</p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-bold text-primary-light"
          >
            {mc(9)?.winner}
          </motion.p>
        </>
      ),
    },
    // 5: Feel Heard
    {
      gradient: 'rose',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">In Conversation</p>
          <h2 className="text-2xl font-bold">What you do that makes people feel really heard — or really unheard</h2>
          <QuoteCarousel quotes={freetext(10)} emptyMessage="No notes on your conversation style" />
        </>
      ),
    },
    // 6: Emotional Depth
    {
      gradient: 'sunset',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Emotional Depth</p>
          <p className="text-sm text-text-secondary">When people are going through something hard, you're the friend who:</p>
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="text-xl font-bold text-primary-light"
          >
            {mc(11)?.winner}
          </motion.p>
          <div className="w-full mt-2">
            <p className="text-sm text-text-secondary mb-1">The emotion you struggle most to express:</p>
            <p className="text-2xl font-black text-accent">{mc(12)?.winner}</p>
          </div>
          <GaugeChart value={rating(13)?.average || 0} label="Reading the room" sublabel="How well you pick up on how people feel" />
        </>
      ),
    },
    // 7: Reliability
    {
      gradient: 'midnight',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Can People Count on You?</p>
          <GaugeChart value={rating(14)?.average || 0} label="How consistent you are" sublabel="Hot and cold → Rock solid" />
          <p className="text-sm text-text-secondary mt-4">Where you sometimes let people down:</p>
          <BarChart items={topAnswers(15).map(a => ({ label: a.option, value: a.pct }))} />
        </>
      ),
    },
    // 8: Blind Spots
    {
      gradient: 'midnight',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Your Biggest Blind Spot</p>
          <h2 className="text-2xl font-bold">The thing you can't see about yourself</h2>
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="text-xl font-bold text-accent"
          >
            {toSecondPerson(mc(16)?.winner || '')}
          </motion.p>
          <BarChart items={topAnswersYou(16).map(a => ({ label: a.option, value: a.pct }))} />
        </>
      ),
    },
    // 9: Pattern They See
    {
      gradient: 'forest',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Patterns You Don't See</p>
          <h2 className="text-2xl font-bold">What they notice that you might miss</h2>
          <QuoteCarousel quotes={freetext(18)} emptyMessage="No patterns shared" />
          <p className="text-sm text-text-secondary mt-3">If you invested in one growth area, it should be:</p>
          <p className="text-xl font-bold text-primary-light">{mc(17)?.winner}</p>
        </>
      ),
    },
    // 10: Hard Truth with Love
    {
      gradient: 'warm',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Hard Truth, With Love</p>
          <h2 className="text-2xl font-bold">What they'd tell you if they could, from a place of love</h2>
          <QuoteCarousel quotes={freetext(19)} emptyMessage="No hard truths yet" />
        </>
      ),
    },
    // 11: Your Role in the Group
    {
      gradient: 'purple',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Your Role in the Group</p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-black bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent"
          >
            {mc(20)?.winner}
          </motion.p>
          <p className="text-text-secondary">That's what you naturally become.</p>
          <div className="w-full mt-2">
            <p className="text-sm text-text-secondary mb-2">What the group would lose without you:</p>
            <BarChart items={topAnswers(21).map(a => ({ label: a.option, value: a.pct }))} />
          </div>
        </>
      ),
    },
    // 12: The Annoying Truth
    {
      gradient: 'sunset',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">The Annoying Truth 😅</p>
          <h2 className="text-2xl font-bold">Your most annoying habit:</h2>
          <motion.p
            initial={{ opacity: 0, rotate: -5 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="text-2xl font-bold text-accent"
          >
            {mc(22)?.winner}
          </motion.p>
          <BarChart items={topAnswers(22).map(a => ({ label: a.option, value: a.pct }))} />
        </>
      ),
    },
    // 13: The Good Stuff
    {
      gradient: 'golden',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">The Good Stuff ❤️</p>
          <h2 className="text-2xl font-bold">What they genuinely cherish about you</h2>
          <QuoteCarousel quotes={freetext(23)} />
          <p className="text-sm text-text-secondary mt-3">What makes you irreplaceable:</p>
          <QuoteCarousel quotes={freetext(24)} />
        </>
      ),
    },
    // 14: The Final Message + Summary
    {
      gradient: 'rose',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">The Final Message</p>
          <h2 className="text-2xl font-bold">"If you only read one thing…"</h2>
          <QuoteCarousel quotes={freetext(25)} />
          <SummaryCard data={data} />
        </>
      ),
    },
  ]

  return (
    <>
      <ProgressDots total={cards.length} current={cardIndex} onNavigate={setCardIndex} />

      <AnimatePresence mode="wait">
        <WrapCard key={cardIndex} gradient={cards[cardIndex].gradient}>
          {cards[cardIndex].content}

          {/* Inline nav rendered inside every card so it's always visible */}
          <div className="mt-8 flex items-center justify-center gap-4 w-full">
            <button
              onClick={prev}
              disabled={cardIndex === 0}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-text-primary text-xl flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
              aria-label="Previous card"
            >
              ←
            </button>
            <span className="text-xs text-text-secondary tabular-nums bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5">
              {cardIndex + 1} / {cards.length}
            </span>
            {cardIndex === cards.length - 1 ? (
              <button
                disabled
                className="h-12 px-5 rounded-full bg-white/10 border border-white/15 text-text-secondary text-sm flex items-center justify-center opacity-60"
                aria-label="End"
              >
                The End ✨
              </button>
            ) : (
              <button
                onClick={next}
                className="h-12 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-primary/30"
                aria-label="Next card"
              >
                Next →
              </button>
            )}
          </div>
        </WrapCard>
      </AnimatePresence>
    </>
  )
}
