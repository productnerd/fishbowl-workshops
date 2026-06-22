import type { Tendency } from '@fishbowl/feedback-core'

// Shape of the cached report the fishbowl-ai-insights edge function stores.
export interface FishbowlReport {
  headline: string
  topStrengths: { dimension: string; label: string; blurb: string }[]
  virtues: {
    dimension: string
    name: string
    deficientPole: string
    excessivePole: string
    mu: number
    sigma: number
    tendency: Tendency
    balanceScore: number
    blurb: string
  }[]
  competencies: { dimension: string; statement: string; average: number; interpretation: string }[]
  scenarios: { dimension: string; prompt: string; winner: string; tally: Record<Tendency, number> }[]
  growthEdges: { dimension: string; title: string; actions: string[] }[]
  appreciations: string[]
  closing: string
}
