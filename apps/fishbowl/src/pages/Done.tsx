import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSession } from '../lib/data'
import Card from '../components/Card'
import Button from '../components/Button'
import ReportPreview from '../components/ReportPreview'

// A few character cut-outs to tease the personality match ("which one are you?").
const CHAR_TEASE = ['ENFP', 'ESFJ', 'ESTP']

export default function Done() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const [name, setName] = useState<string | null>(null)
  const [showSample, setShowSample] = useState(false)

  // Fetch the receiving party's name so the thank-you can speak to them by name.
  useEffect(() => {
    if (!slug) return
    getSession(slug).then((s) => {
      if (s?.creator_name) setName(s.creator_name)
    })
  }, [slug])

  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-md place-items-center px-5 py-8">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease: [0.2, 0.8, 0.2, 1] as const }} className="w-full">
        {/* Thank you, spoken to the person they just helped. */}
        <Card tone="blue" className="p-7 text-center">
          <div className="text-5xl">🙏</div>
          <h1 className="display mt-3 text-3xl">Thank you.</h1>
          <p className="mt-2 text-paper-hi/90">
            {name ? `${name} is going to be really glad you did this.` : 'They are going to be really glad you did this.'}
          </p>
        </Card>

        {/* Their turn: reciprocity flip + a taste of the actual reward. */}
        <Card tone="paper" className="mt-4 p-7 text-center">
          <div className="mb-4 flex h-24 items-end justify-center">
            {CHAR_TEASE.map((t, k) => (
              <motion.img
                key={t}
                src={`${import.meta.env.BASE_URL}characters/${t}.webp`}
                alt=""
                aria-hidden
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + k * 0.08, ease: [0.2, 0.8, 0.2, 1] as const }}
                className="h-24 w-auto object-contain object-bottom drop-shadow-[3px_4px_0_rgba(42,36,32,0.16)]"
                style={{ marginLeft: k ? '-1rem' : 0, zIndex: k }}
              />
            ))}
          </div>

          <p className="kicker text-pink-deep">okay, your turn</p>
          <h2 className="display mt-1 text-3xl leading-tight">Which one are you?</h2>
          <p className="mt-2 leading-snug text-ink/85">
            You just gave {name ?? 'them'} their mirror. Now get yours: a playful, wrapped-style read of how your people really see you.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-bold text-ink">
            <span className="rounded-full border-2 border-ink bg-paper-hi px-3 py-1">Free</span>
            <span className="rounded-full border-2 border-ink bg-paper-hi px-3 py-1">Under a minute</span>
            <span className="rounded-full border-2 border-ink bg-paper-hi px-3 py-1">They stay anonymous</span>
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <Button variant="pink" onClick={() => navigate('/create')} className="!text-lg">
              Create my Fishbowl →
            </Button>
            <button
              onClick={() => setShowSample(true)}
              className="press cursor-pointer rounded-full border-[2.5px] border-ink bg-paper-hi px-5 py-2.5 font-display font-black text-ink shadow-chunky-sm"
            >
              See a sample report
            </button>
          </div>
          <p className="mt-3 text-sm text-ink-soft">Just share one link with your team.</p>
        </Card>
      </motion.div>

      {/* The same Wrapped-style sample carousel the homepage shows, in a peek-modal. */}
      <AnimatePresence>
        {showSample && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSample(false)}
            className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 px-4 py-8 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] as const }}
              onClick={(e) => e.stopPropagation()}
              className="mx-auto max-w-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="kicker text-paper-hi">a sample report</p>
                <button
                  onClick={() => setShowSample(false)}
                  aria-label="Close"
                  className="press grid h-10 w-10 cursor-pointer place-items-center rounded-full border-[2.5px] border-ink bg-paper-hi text-lg font-black text-ink shadow-chunky-sm"
                >
                  ✕
                </button>
              </div>
              <ReportPreview />
              <div className="mt-5">
                <Button variant="pink" onClick={() => navigate('/create')} className="!w-full !text-lg">
                  Create my Fishbowl →
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
