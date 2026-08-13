import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MODULES, TOPICS, minutesRange, resolveSurvey, type TopicConfig } from '@fishbowl/feedback-core'
import { questions as QUESTION_BANK } from '../data/questions'

// The workshops catalogue. Each card is a topic: a saved configuration over the module
// bank, never new code. A trainer picks one, and every participant in the cohort runs
// their own fishbowl against it.

// The longest survey anyone answering this topic could be given. Shown on the card because
// length is what a trainer is actually choosing between, and what we price on.
function longestSurvey(topic: TopicConfig): number {
  let most = 0
  for (const persona of topic.personas) {
    for (const len of topic.lengths) {
      const n = resolveSurvey({
        topic,
        modules: MODULES,
        bank: QUESTION_BANK,
        persona: persona.key,
        length: len.key,
        name: 'them',
        hasResponsibilities: true,
      }).length
      if (n > most) most = n
    }
  }
  return most
}

function TopicCard({ topic, index }: { topic: TopicConfig; index: number }) {
  const navigate = useNavigate()
  const count = longestSurvey(topic)
  // The whole span a respondent might spend, shortest length's floor to longest's ceiling.
  const span: [number, number] = [
    topic.lengths[0].minutes[0],
    topic.lengths[topic.lengths.length - 1].minutes[1],
  ]

  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      onClick={() => navigate(`/create/t/${topic.key}`)}
      className="press flex cursor-pointer flex-col rounded-3xl border-[2.5px] border-ink bg-paper-hi p-6 text-left shadow-chunky"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-4xl" aria-hidden>
          {topic.emoji}
        </span>
        <span
          className="rounded-full border-2 border-ink px-3 py-0.5 text-xs font-black uppercase tracking-wide"
          style={{ background: topic.accent, color: '#fdfaf5' }}
        >
          {topic.personas.length} {topic.personas.length === 1 ? 'persona' : 'personas'}
        </span>
      </div>

      <h2 className="display mt-3 text-2xl leading-tight">{topic.name}</h2>
      <p className="mt-2 text-sm leading-snug text-ink-soft">{topic.description}</p>

      <p className="serif mt-4 flex-1 text-sm italic leading-snug text-ink-soft">{topic.audience}</p>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t-2 border-dashed border-ink/20 pt-4 text-xs text-ink-soft">
        <span>
          <span className="font-black text-ink">{count}</span> questions max
        </span>
        <span>
          <span className="font-black text-ink">{minutesRange(span)}</span> min
        </span>
        <span>
          <span className="font-black text-ink">{topic.lengths.length}</span>{' '}
          {topic.lengths.length === 1 ? 'length' : 'lengths'}
        </span>
      </div>

      <span className="display mt-5 text-lg" style={{ color: topic.accent }}>
        Start this fishbowl →
      </span>
    </motion.button>
  )
}

export default function Topics() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <p className="kicker text-pink-deep">the catalogue</p>
        <h1 className="display mt-2 text-4xl leading-tight sm:text-5xl">Pick what you want to find out</h1>
        <p className="serif mt-3 max-w-2xl leading-snug text-ink-soft">
          Every topic asks a different set of people a different set of questions, and returns a report built from
          what they said. Same engine underneath, so the reports stay comparable.
        </p>
      </motion.div>

      <div className="mt-9 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {TOPICS.map((t, i) => (
          <TopicCard key={t.key} topic={t} index={i} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-10 rounded-3xl border-[2.5px] border-dashed border-ink/30 p-7 text-center"
      >
        <p className="display text-xl">Running a workshop?</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-snug text-ink-soft">
          Trainers start from one of these, then reword the questions, drop the ones that do not fit their group, set
          who counts as a persona, and choose how long it runs. The scoring stays ours, so the report still holds up.
        </p>
      </motion.div>
    </div>
  )
}
