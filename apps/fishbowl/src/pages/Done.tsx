import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'

export default function Done() {
  const navigate = useNavigate()
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease: [0.2, 0.8, 0.2, 1] as const }} className="w-full max-w-md">
        <Card tone="blue" className="p-10 text-center">
          <div className="text-6xl">🙏</div>
          <h1 className="display mt-4 text-4xl">Thank you.</h1>
          <p className="mt-3 text-lg text-ink">
            Your answers are completely anonymous. They will never know which ones were yours.
          </p>
        </Card>

        {/* Their turn: nudge the respondent to get their own honest mirror. */}
        <Card tone="paper" className="mt-5 p-7 text-center">
          <p className="serif text-xl font-semibold text-ink">Curious how your team sees you?</p>
          <p className="mt-2 text-ink-soft">Spin up your own Fishbowl. Same honest, anonymous mirror, pointed at you.</p>
          <div className="mt-5">
            <Button variant="pink" onClick={() => navigate('/create')} className="!text-lg">
              Create my Fishbowl →
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
