import { motion } from 'framer-motion'
import type { AggregatedResults } from '../../types'

interface Props {
  data: AggregatedResults
}

export default function SummaryCard({ data }: Props) {
  // Compute key stats
  const trustScore = (
    ((data.ratingResults[10]?.average || 0) +
     (data.ratingResults[28]?.average || 0) +
     (data.ratingResults[26]?.average || 0)) / 3
  ).toFixed(1)

  const eqScore = (
    ((data.ratingResults[19]?.average || 0) +
     (data.ratingResults[21]?.average || 0) +
     (data.ratingResults[24]?.average || 0)) / 3
  ).toFixed(1)

  const superpower = data.mcResults[6]?.winner || '—'
  const blindSpot = data.mcResults[30]?.winner || '—'
  const groupRole = data.mcResults[37]?.winner || '—'
  const oneOfAKind = data.mcResults[47]?.winner || '—'

  const stats = [
    { label: 'Trust Score', value: `${trustScore}/5`, icon: '🔒' },
    { label: 'EQ Score', value: `${eqScore}/5`, icon: '💜' },
    { label: 'Superpower', value: superpower, icon: '⚡' },
    { label: 'Group Role', value: groupRole, icon: '👥' },
    { label: 'Blind Spot', value: blindSpot, icon: '🔍' },
    { label: 'One of a Kind', value: oneOfAKind, icon: '✨' },
  ]

  return (
    <div className="w-full max-w-md">
      <div className="bg-gradient-to-br from-primary/20 via-surface-card to-accent/10 rounded-3xl p-6 border border-white/10">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest text-primary-light mb-2">Through Their Eyes</p>
          <h3 className="text-2xl font-bold">{data.creatorName}</h3>
          <p className="text-xs text-text-secondary mt-1">
            Based on {data.totalResponses} anonymous responses
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 rounded-xl p-3 text-center"
            >
              <div className="text-lg mb-1">{s.icon}</div>
              <p className="text-xs text-text-secondary mb-1">{s.label}</p>
              <p className="text-sm font-semibold truncate">{s.value}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
