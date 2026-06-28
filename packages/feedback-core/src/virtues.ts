// The ten Aristotelian "golden mean" virtues the report is built around. Each is a
// bipolar 1-9 scale where 1 and 9 are the two vices and 5 is the virtue. Colleagues
// rate the subject on these (see questions.ts); the subject rates themselves with the
// same list so the report can overlay both reads. Dimension keys MUST match the
// colleague question dimensions so the two line up.

export interface VirtueDef {
  dimension: string
  name: string
  deficientPole: string
  excessivePole: string
}

export const VIRTUES: VirtueDef[] = [
  { dimension: 'courage', name: 'Courage', deficientPole: 'Avoids all risk', excessivePole: 'Recklessly bold' },
  { dimension: 'candor', name: 'Candor', deficientPole: 'Evasive', excessivePole: 'Brutally blunt' },
  { dimension: 'confidence', name: 'Confidence', deficientPole: 'Self-deprecating', excessivePole: 'Arrogant' },
  { dimension: 'drive', name: 'Drive', deficientPole: 'Complacent', excessivePole: 'Ruthless' },
  { dimension: 'composure', name: 'Composure', deficientPole: 'A pushover', excessivePole: 'Short-fused' },
  { dimension: 'collaboration', name: 'Collaboration', deficientPole: 'A lone wolf', excessivePole: 'Cannot decide alone' },
  { dimension: 'rigor', name: 'Rigor', deficientPole: 'Sloppy', excessivePole: 'Cannot ship' },
  { dimension: 'receptiveness', name: 'Receptiveness', deficientPole: 'Defensive', excessivePole: 'Over-accommodating' },
  { dimension: 'generosity', name: 'Generosity', deficientPole: 'Credit-hoarding', excessivePole: 'Self-sacrificing' },
  { dimension: 'decisiveness', name: 'Decisiveness', deficientPole: 'Indecisive', excessivePole: 'Impulsive' },
]

// dimension -> 1..9 (5 = the virtue)
export type VirtueScores = Record<string, number>
