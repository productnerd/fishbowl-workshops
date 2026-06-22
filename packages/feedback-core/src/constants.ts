// Anonymity reveal threshold: responses stay locked until this many land.
// Single source of truth shared by the apps, the RLS policy, and the edge fn.
export const REQUIRED_RESPONSES = 5

// Percentile baseline (Fishbowl). Until a dimension has LIVE_NORM_MIN_SUBJECTS
// completed subjects, rank against a seeded normal centered on the virtuous
// mean; past it, rank purely against the live population.
export const DEFAULT_NORM_MEAN = 3
export const DEFAULT_NORM_SD = 0.9
export const LIVE_NORM_MIN_SUBJECTS = 50
