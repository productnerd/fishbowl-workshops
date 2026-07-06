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
  // A warm, purely-positive team love-note (the "good vibes" slide). Team-only.
  goodVibes?: string
  // A short, always-present P.S. for the letter: emotional, sweet, playful, witty.
  postscript?: string
  // A practical action plan: 2 each to stop/start now, then 2 each to add later.
  actionPlan?: {
    stopNow: string[]
    startNow: string[]
    stopNext: string[]
    startNext: string[]
  } | null
  // Phase 2 — team energizers/drains aggregate (−2..2 mean per activity).
  energizers?: { id: string; label: string; teamMean: number; n: number }[]
  // Phase 2 — per-responsibility team tier (1=under, 2=meets, 3=exceeds) + spread.
  responsibilities?: { index: number; label: string; teamTier: number; n: number; note?: string; notes?: string[] }[]
  // Phase 3 — framework team aggregates (keys map to the feedback-core data modules).
  hats?: { key: string; mu: number; n: number }[]
  radicalCandor?: { teamCare: number; teamChallenge: number; n: number } | null
  sdt?: { key: string; meanPoints: number; n: number }[]
  belbin?: { key: string; teamShare: number; n: number }[]
  via?: { id: string; count: number; n: number }[]
  johari?: { counts: { word: string; count: number }[]; n: number }
  nohari?: { counts: { word: string; count: number }[]; n: number }
}
