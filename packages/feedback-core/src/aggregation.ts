import type { AggregatedResults, Question, Tendency } from './types'

// Population standard deviation of a score set.
export function stdDev(scores: number[]): number {
  if (scores.length === 0) return 0
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length
  return Math.sqrt(variance)
}

// Aristotelian classification of a virtue mean (1-5, 3 = the mean).
export function classifyTendency(mu: number): Tendency {
  if (mu < 2.5) return 'deficient'
  if (mu <= 3.5) return 'balanced'
  return 'excessive'
}

// 1 = perfectly balanced (mu=3); 0 = an extreme pole (mu=1 or 5).
export function balanceScore(mu: number): number {
  return 1 - Math.abs(mu - 3) / 2
}

export function aggregateResponses(
  responses: Array<{ answers: Record<number, string | number> }>,
  questions: Question[],
  creatorName: string
): AggregatedResults {
  const mcResults: AggregatedResults['mcResults'] = {}
  const ratingResults: AggregatedResults['ratingResults'] = {}
  const freetextResults: AggregatedResults['freetextResults'] = {}
  const likertResults: AggregatedResults['likertResults'] = {}
  const virtueResults: AggregatedResults['virtueResults'] = {}
  const scenarioResults: AggregatedResults['scenarioResults'] = {}

  for (const q of questions) {
    if (q.type === 'mc') {
      const counts: Record<string, number> = {}
      for (const r of responses) {
        const val = r.answers[q.id] as string
        if (val) counts[val] = (counts[val] || 0) + 1
      }
      const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      mcResults[q.id] = {
        counts,
        winner: winner?.[0] || '',
        winnerCount: winner?.[1] || 0,
      }
    } else if (q.type === 'rating' || q.type === 'likert') {
      const scores: number[] = []
      for (const r of responses) {
        const val = r.answers[q.id] as number
        if (val) scores.push(val)
      }
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      const result = { average: Math.round(avg * 10) / 10, scores }
      if (q.type === 'rating') ratingResults[q.id] = result
      else likertResults[q.id] = result
    } else if (q.type === 'virtue') {
      const scores: number[] = []
      for (const r of responses) {
        const val = r.answers[q.id] as number
        if (val) scores.push(val)
      }
      const mu = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 3
      virtueResults[q.id] = {
        mu: Math.round(mu * 100) / 100,
        sigma: Math.round(stdDev(scores) * 100) / 100,
        tendency: classifyTendency(mu),
        balanceScore: Math.round(balanceScore(mu) * 1000) / 1000,
        scores,
      }
    } else if (q.type === 'scenario') {
      const counts: Record<string, number> = {}
      const tendencyTally: Record<Tendency, number> = { deficient: 0, balanced: 0, excessive: 0 }
      for (const r of responses) {
        const val = r.answers[q.id] as string
        if (!val) continue
        counts[val] = (counts[val] || 0) + 1
        const t = q.optionTendencies?.[val]
        if (t) tendencyTally[t] += 1
      }
      const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      scenarioResults[q.id] = {
        counts,
        winner: winner?.[0] || '',
        winnerCount: winner?.[1] || 0,
        tendencyTally,
      }
    } else if (q.type === 'freetext') {
      const texts: string[] = []
      for (const r of responses) {
        const val = r.answers[q.id] as string
        if (val && val.trim()) texts.push(val.trim())
      }
      freetextResults[q.id] = texts
    }
  }

  return {
    totalResponses: responses.length,
    creatorName,
    mcResults,
    ratingResults,
    freetextResults,
    likertResults,
    virtueResults,
    scenarioResults,
  }
}

// Helper to get a percentage for a specific MC answer
export function mcPercentage(result: AggregatedResults['mcResults'][number], option: string): number {
  const total = Object.values(result.counts).reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  return Math.round(((result.counts[option] || 0) / total) * 100)
}

// Get top N MC answers sorted by count
export function topMcAnswers(result: AggregatedResults['mcResults'][number], n = 3): Array<{ option: string; count: number; pct: number }> {
  const total = Object.values(result.counts).reduce((a, b) => a + b, 0)
  return Object.entries(result.counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([option, count]) => ({
      option,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
}
