import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSession } from '../lib/data'
import Card from '../components/Card'
import Button from '../components/Button'

export default function Done() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const [name, setName] = useState<string | null>(null)

  // Fetch the receiving party's name so the thank-you can speak to them by name.
  useEffect(() => {
    if (!slug) return
    getSession(slug).then((s) => {
      if (s?.creator_name) setName(s.creator_name)
    })
  }, [slug])

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease: [0.2, 0.8, 0.2, 1] as const }} className="w-full max-w-md">
        <Card tone="blue" className="p-10 text-center">
          <div className="text-6xl">🙏</div>
          <h1 className="display mt-4 text-4xl">Thank you.</h1>
          <p className="mt-3 text-lg text-ink">
            {name ? `${name} is going to feel genuinely seen, thanks to you.` : 'They are going to feel genuinely seen, thanks to you.'}
          </p>
        </Card>

        {/* Their turn: nudge the respondent to get their own honest mirror. */}
        <Card tone="paper" className="mt-5 p-7 text-center">
          <p className="serif text-xl font-semibold text-ink">Curious how your people see you?</p>
          <div className="mt-5">
            <Button variant="pink" onClick={() => navigate('/create')} className="!text-lg">
              Create my Fishbowl →
            </Button>
          </div>
          <p className="mt-3 text-sm text-ink-soft">It takes less than a minute.</p>
        </Card>
      </motion.div>
    </div>
  )
}
