import { DEFAULT_NORM_SD } from '@fishbowl/feedback-core'
import { supabase } from './supabase'

// Abramowitz-Stegun erf approximation -> standard normal CDF.
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x)
  return x >= 0 ? y : -y
}
export const normalCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2))

// "Goodness" on a higher-is-better axis: raw score for competencies, balance
// (closeness to the virtuous mean 5 on the 1-9 scale) for virtues.
const goodness = (score: number, higherIsBest: boolean) =>
  higherIsBest ? score : 1 - Math.abs(score - 5) / 4

// Returns the subject's "top X%" for a dimension. Uses the live population
// percentile once >= 50 subjects exist; until then a seeded default norm.
export async function topPercent(
  dimension: string,
  score: number,
  higherIsBest: boolean
): Promise<number> {
  const { data } = await supabase.rpc('fishbowl_dimension_percentile', {
    p_dimension: dimension,
    p_score: score,
    p_higher_is_best: higherIsBest,
  })
  const live = (data as { percentile: number | null } | null)?.percentile
  if (live != null) return Math.max(1, Math.min(99, 100 - live))

  // Default norm, centered on the virtuous middle.
  const g = goodness(score, higherIsBest)
  const [mean, sd] = higherIsBest ? [3.5, DEFAULT_NORM_SD] : [0.78, 0.18]
  const below = normalCdf((g - mean) / sd) * 100
  return Math.max(1, Math.min(99, Math.round(100 - below)))
}
