import { motion } from 'framer-motion'
import Card from '../components/Card'

export default function Done() {
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease: [0.2, 0.8, 0.2, 1] as const }}>
        <Card tone="cyan" className="max-w-md p-10 text-center">
          <div className="text-6xl">🙏</div>
          <h1 className="display mt-4 text-4xl">Thank you.</h1>
          <p className="mt-3 text-lg text-ink">
            Your answers are completely anonymous. They will never know which ones were yours.
          </p>
        </Card>
      </motion.div>
    </div>
  )
}
