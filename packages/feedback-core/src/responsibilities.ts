// Responsibilities & performance levels. The subject lists up to 5 core
// responsibilities; the subject self-tiers them, and colleagues tier each on a
// behaviorally-anchored 3-level scale. The report overlays the two.

export const MAX_RESPONSIBILITIES = 5

export const RESPONSIBILITY_TIERS: { v: number; label: string; short: string; emoji: string }[] = [
  { v: 1, label: 'Underperforms', short: 'Below', emoji: '🌱' },
  { v: 2, label: 'Meets expectations', short: 'Meets', emoji: '✅' },
  { v: 3, label: 'Exceeds / delights', short: 'Exceeds', emoji: '✨' },
]

// responsibility index (as string) -> tier 1|2|3
export type ResponsibilityTiers = Record<string, number>
