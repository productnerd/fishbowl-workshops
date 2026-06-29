// Anonymity reveal threshold: responses stay locked until this many land.
// Single source of truth shared by the apps, the RLS policy, and the edge fn.
export const REQUIRED_RESPONSES = 3

// Percentile baseline (Fishbowl): spread of the seeded default norm used until a
// dimension has enough completed subjects to rank against the live population.
// (The mean and the live-population threshold live in the SQL/percentile path.)
export const DEFAULT_NORM_SD = 0.9
