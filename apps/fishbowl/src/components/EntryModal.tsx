import { motion } from 'framer-motion'
import Card from './Card'
import Button from './Button'

// First-view nudge: recommend the self-assessment before reading the team report.
export default function EntryModal({ onTakeNow, onLater }: { onTakeNow: () => void; onLater: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-5 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
        <Card tone="paper" className="p-7 text-center">
          <div className="text-5xl">🪞</div>
          <h2 className="display mt-3 text-3xl">See yourself first</h2>
          <p className="mt-2 text-ink-soft">
            We recommend the quick self-assessment first (about four minutes), your report is richer when we can show
            it next to how you see yourself.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <Button variant="blue" onClick={onTakeNow}>
              OK, I'll take it now
            </Button>
            <button
              onClick={onLater}
              className="press cursor-pointer rounded-full border-[2.5px] border-ink bg-paper-hi px-5 py-3 font-semibold text-ink shadow-chunky-sm"
            >
              Show me the report, I'll do it later
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
