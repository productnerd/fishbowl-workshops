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

  const totalCards = 21
  const next = useCallback(() => setCardIndex((i) => Math.min(i + 1, totalCards - 1)), [])
  const prev = useCallback(() => setCardIndex((i) => Math.max(i - 1, 0)), [])

  // Keyboard and touch navigation
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

  const cards: Array<{ gradient: string; content: React.ReactNode }> = [
    // 0: First Impressions
    {
      gradient: 'warm',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">First Impressions</p>
          <h2 className="text-2xl md:text-3xl font-bold">Before they knew you, this is what they felt</h2>
          <div className="w-full space-y-4">
            <p className="text-sm text-text-secondary mb-2">What people notice first about you:</p>
            <BarChart items={topAnswers(1).map(a => ({ label: a.option, value: a.pct }))} />
            <div className="mt-4 p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-text-secondary mb-1">Your 5-minute vibe:</p>
              <p className="text-xl font-bold text-primary-light">{mc(4)?.winner}</p>
            </div>
          </div>
        </>
      ),
    },
    // 1: The Misconception
    {
      gradient: 'ocean',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">The Misconception</p>
          <h2 className="text-2xl md:text-3xl font-bold">What people assumed about you that was wrong</h2>
          <BarChart items={topAnswers(2).map(a => ({ label: a.option, value: a.pct }))} />
          <div className="mt-2">
            <p className="text-sm text-text-secondary mb-3">How it actually changed:</p>
            <QuoteCarousel quotes={freetext(5)} />
          </div>
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
            <p className="text-5xl md:text-6xl font-black bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
              {mc(6)?.winner}
            </p>
          </motion.div>
          <p className="text-text-secondary">Your most underrated skill, according to your people.</p>
          <div className="w-full mt-2">
            <p className="text-sm text-text-secondary mb-2">In a crisis, you're the one who:</p>
            <p className="text-lg font-semibold text-primary-light">{mc(7)?.winner}</p>
          </div>
          <div className="w-full mt-2">
            <p className="text-sm text-text-secondary mb-2">If talent alone decided, you'd be famous for:</p>
            <p className="text-lg font-semibold text-accent">{mc(11)?.winner}</p>
          </div>
        </>
      ),
    },
    // 3: Moments That Mattered
    {
      gradient: 'golden',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Moments That Mattered</p>
          <h2 className="text-2xl md:text-3xl font-bold">Times you left an impression</h2>
          <QuoteCarousel quotes={freetext(12)} />
        </>
      ),
    },
    // 4: Hidden Talent
    {
      gradient: 'forest',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Hidden Talent</p>
          <h2 className="text-2xl md:text-3xl font-bold">What you're great at and don't even realize</h2>
          <QuoteCarousel quotes={freetext(9)} />
          <GaugeChart value={rating(8)?.average || 0} label="Follow-through" sublabel="How well you deliver on promises" />
        </>
      ),
    },
    // 5: Trust Score
    {
      gradient: 'midnight',
      content: (() => {
        const trustAvg = +(((rating(10)?.average || 0) + (rating(28)?.average || 0) + (rating(26)?.average || 0)) / 3).toFixed(1)
        return (
          <>
            <p className="text-xs uppercase tracking-widest text-accent font-semibold">Trust Score</p>
            <GaugeChart value={trustAvg} label="How much people trust you" sublabel="Judgment + Secrets + Consistency" />
            <div className="grid grid-cols-3 gap-3 w-full mt-2">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{rating(10)?.average || 0}</p>
                <p className="text-[10px] text-text-secondary">Judgment</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{rating(28)?.average || 0}</p>
                <p className="text-[10px] text-text-secondary">Secrets</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{rating(26)?.average || 0}</p>
                <p className="text-[10px] text-text-secondary">Consistency</p>
              </div>
            </div>
          </>
        )
      })(),
    },
    // 6: How You Communicate
    {
      gradient: 'warm',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">How You Communicate</p>
          <h2 className="text-2xl font-bold">When you talk, people feel:</h2>
          <BarChart items={topAnswers(13).map(a => ({ label: a.option, value: a.pct }))} />
          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{rating(14)?.average || 0}</p>
              <p className="text-xs text-text-secondary">Listening</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{rating(16)?.average || 0}</p>
              <p className="text-xs text-text-secondary">Safe to be honest with</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-2">Your texting style:</p>
          <p className="text-lg font-semibold text-primary-light">{mc(15)?.winner}</p>
        </>
      ),
    },
    // 7: Hard Conversations
    {
      gradient: 'ocean',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">The Hard Conversations</p>
          <h2 className="text-2xl font-bold">In a disagreement, you tend to:</h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-bold text-primary-light"
          >
            {mc(17)?.winner}
          </motion.p>
          <QuoteCarousel quotes={freetext(18)} emptyMessage="No comments on your communication yet" />
        </>
      ),
    },
    // 8: Emotional Depth
    {
      gradient: 'rose',
      content: (() => {
        const eqAvg = +(((rating(19)?.average || 0) + (rating(21)?.average || 0) + (rating(24)?.average || 0)) / 3).toFixed(1)
        return (
          <>
            <p className="text-xs uppercase tracking-widest text-accent font-semibold">Emotional Depth</p>
            <GaugeChart value={eqAvg} label="Your Emotional Intelligence" sublabel="Availability + Stress handling + Reading the room" />
            <div className="grid grid-cols-3 gap-3 w-full mt-2">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{rating(19)?.average || 0}</p>
                <p className="text-[10px] text-text-secondary">Available</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{rating(21)?.average || 0}</p>
                <p className="text-[10px] text-text-secondary">Under stress</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{rating(24)?.average || 0}</p>
                <p className="text-[10px] text-text-secondary">Reads room</p>
              </div>
            </div>
          </>
        )
      })(),
    },
    // 9: What You Struggle to Show
    {
      gradient: 'sunset',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">What You Struggle to Show</p>
          <h2 className="text-2xl font-bold">The emotion you hold back the most:</h2>
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="text-4xl font-black text-accent"
          >
            {mc(22)?.winner}
          </motion.p>
          <p className="text-sm text-text-secondary">When you're going through something hard, you're the friend who:</p>
          <p className="text-lg font-semibold text-primary-light">{mc(20)?.winner}</p>
          <QuoteCarousel quotes={freetext(23)} emptyMessage="No vulnerability moments shared" />
        </>
      ),
    },
    // 10: Your Role in the Group
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
            {mc(37)?.winner}
          </motion.p>
          <BarChart items={topAnswers(40).map(a => ({ label: a.option, value: a.pct }))} />
          <GaugeChart value={rating(38)?.average || 0} label="Room-changing energy" sublabel="How much your presence shifts the vibe" />
        </>
      ),
    },
    // 11: What They'd Miss
    {
      gradient: 'golden',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">If You Left</p>
          <h2 className="text-2xl font-bold">What the group would lose without you:</h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-black text-primary-light"
          >
            {mc(39)?.winner}
          </motion.p>
          <BarChart items={topAnswers(39).map(a => ({ label: a.option, value: a.pct }))} />
          <QuoteCarousel quotes={freetext(41)} emptyMessage="No comments yet" />
        </>
      ),
    },
    // 12: Your Blind Spots
    {
      gradient: 'midnight',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Your Blind Spots</p>
          <h2 className="text-2xl font-bold">The things you can't see about yourself</h2>
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="text-xl font-bold text-accent"
          >
            {mc(30)?.winner}
          </motion.p>
          <BarChart items={topAnswers(30).map(a => ({ label: a.option, value: a.pct }))} />
          <GaugeChart value={rating(31)?.average || 0} label="Self-awareness" sublabel="According to your people" />
        </>
      ),
    },
    // 13: The Growth Edge
    {
      gradient: 'forest',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">The Growth Edge</p>
          <h2 className="text-2xl font-bold">Where your friends want to see you level up</h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-primary-light"
          >
            {mc(32)?.winner}
          </motion.p>
          <GaugeChart value={rating(35)?.average || 0} label="Handles feedback" sublabel="How you take criticism" />
          <QuoteCarousel quotes={freetext(33)} emptyMessage="No patterns noticed" />
        </>
      ),
    },
    // 14: What No One Tells You
    {
      gradient: 'warm',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">What No One Tells You</p>
          <h2 className="text-2xl font-bold">What you need to hear:</h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-2xl md:text-3xl font-black text-primary-light leading-snug"
          >
            "{mc(34)?.winner}"
          </motion.p>
          <p className="text-sm text-text-secondary mt-4">Hard truths from people who love you:</p>
          <QuoteCarousel quotes={freetext(36)} />
        </>
      ),
    },
    // 15: The Annoying Truth
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
            {mc(42)?.winner}
          </motion.p>
          <p className="text-sm text-text-secondary mt-2">What you think is charming but is a bit much:</p>
          <p className="text-lg font-semibold text-primary-light">{mc(43)?.winner}</p>
          <GaugeChart value={rating(44)?.average || 0} label="Easy to make plans with" />
          <QuoteCarousel quotes={freetext(45)} emptyMessage="No quirks reported" />
        </>
      ),
    },
    // 16: Reliability
    {
      gradient: 'ocean',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Can People Count on You?</p>
          <h2 className="text-2xl font-bold">2am phone call?</h2>
          <BarChart items={topAnswers(25).map(a => ({ label: a.option, value: a.pct }))} />
          <p className="text-sm text-text-secondary mt-3">Where you sometimes let people down:</p>
          <p className="text-lg font-semibold text-primary-light">{mc(27)?.winner}</p>
          <QuoteCarousel quotes={freetext(29)} emptyMessage="No suggestions" />
        </>
      ),
    },
    // 17: The Good Stuff
    {
      gradient: 'golden',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">The Good Stuff ❤️</p>
          <h2 className="text-2xl font-bold">What people genuinely cherish about you</h2>
          <QuoteCarousel quotes={freetext(46)} />
          <p className="text-sm text-text-secondary mt-3">A quality they wish they had:</p>
          <QuoteCarousel quotes={freetext(48)} />
        </>
      ),
    },
    // 18: One of a Kind
    {
      gradient: 'purple',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">One of a Kind</p>
          <h2 className="text-2xl font-bold">What makes you truly one-of-a-kind:</h2>
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="text-3xl font-black bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent"
          >
            {mc(47)?.winner}
          </motion.p>
          <p className="text-sm text-text-secondary mt-3">What makes you irreplaceable:</p>
          <QuoteCarousel quotes={freetext(49)} />
        </>
      ),
    },
    // 19: The Final Message
    {
      gradient: 'rose',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">The Final Message</p>
          <h2 className="text-2xl font-bold">"If you only read one thing…"</h2>
          <QuoteCarousel quotes={freetext(50)} />
        </>
      ),
    },
    // 20: Summary
    {
      gradient: 'midnight',
      content: (
        <>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Your Summary</p>
          <h2 className="text-2xl font-bold">Through Their Eyes</h2>
          <SummaryCard data={data} />
          <Button
            onClick={() => {
              const base = window.location.origin + window.location.pathname
              navigator.clipboard.writeText(`${base}#/s/${slug}`)
            }}
            variant="secondary"
            className="mt-4"
          >
            Share your link with more friends
          </Button>
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
        </WrapCard>
      </AnimatePresence>

      {/* Tap zones */}
      <button
        onClick={prev}
        className="fixed left-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer opacity-0"
        aria-label="Previous"
      />
      <button
        onClick={next}
        className="fixed right-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer opacity-0"
        aria-label="Next"
      />
    </>
  )
}
