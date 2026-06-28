// The subject's self-rating on the ten Aristotelian "golden mean" virtues. Each is a
// bipolar 1-9 scale where 1 and 9 are the two vices and 5 is the virtue. The full
// virtue definitions (labels + vice/virtue behaviours) live with the colleague survey
// in apps/fishbowl/src/data/questions.ts, the single source of truth; this keeps just
// the score shape so the report can overlay the self read on the team's.

// dimension -> 1..9 (5 = the virtue)
export type VirtueScores = Record<string, number>
