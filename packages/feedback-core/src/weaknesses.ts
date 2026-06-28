// Workplace "watch-outs" — the weakness counterpart to the VIA strengths and the
// Johari adjectives. The subject and colleagues pick the ones that fit; the report
// shows the team's most-flagged (top watch-outs) and a Nohari-style window comparing
// the subject's read with the team's. A curated, constructive set (the kind you can
// act on), plus a few milder words from the classic Nohari list. Kept kind on purpose.
export const WEAKNESSES: string[] = [
  'impatient',
  'blunt',
  'defensive',
  'perfectionist',
  'conflict-avoidant',
  'disorganized',
  'controlling',
  'overcommitted',
  'indecisive',
  'stubborn',
  'aloof',
  'scattered',
  'impulsive',
  'guarded',
  'pessimistic',
  'over-accommodating',
  'long-winded',
  'risk-averse',
  'self-critical',
  'inflexible',
  'distractible',
  'credit-seeking',
  'slow to respond',
  'domineering',
  'cynical',
  'smug',
  'passive',
  'arrogant',
  'brash',
  'withdrawn',
  'needy',
  'dismissive',
]

// Soft floor 3 / hard cap 8 picks per respondent.
export const NOHARI_MIN = 3
export const NOHARI_MAX = 8

// dimension -> picked words (mirrors the Johari shape)
export type NohariPicks = string[]
