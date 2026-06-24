import { TRAIT_POLES, type BigFiveScores } from '@fishbowl/feedback-core'

const DIALS = [
  { key: 'openness', name: 'Openness' },
  { key: 'conscientiousness', name: 'Conscientiousness' },
  { key: 'extraversion', name: 'Extraversion' },
  { key: 'agreeableness', name: 'Agreeableness' },
] as const

// Five bipolar dials. Neuroticism is shown as its friendly inverse, Emotional
// stability (high = calm), matching how the score is stored.
export default function OceanDials({ scores }: { scores: BigFiveScores }) {
  const rows = [
    ...DIALS.map((d) => ({ name: d.name, value: scores[d.key], low: TRAIT_POLES[d.key].low, high: TRAIT_POLES[d.key].high })),
    { name: 'Emotional stability', value: scores.emotionalStability, low: 'Sensitive', high: 'Calm' },
  ]
  return (
    <div className="flex flex-col gap-5">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="serif text-lg font-semibold">{r.name}</span>
            <span className="kicker text-ink-soft">{r.value}</span>
          </div>
          <div className="relative h-4 rounded-full border-[2.5px] border-ink bg-paper-hi">
            <div className="absolute inset-y-0 left-0 rounded-full bg-blue" style={{ width: `${r.value}%` }} />
            <div
              className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-ink bg-pink"
              style={{ left: `${r.value}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[12px] font-semibold text-ink-soft">
            <span>{r.low}</span>
            <span>{r.high}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
