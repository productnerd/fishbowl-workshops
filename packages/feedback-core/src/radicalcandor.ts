// Radical Candor (Kim Scott). Two independent axes — Care Personally and Challenge
// Directly — each measured by 3 likert items (1–9). The subject self-rates and
// colleagues rate the subject; the report overlays the two as points on a 2×2 plot.
// Situational ("where you tend to land"), not a fixed trait. {name} interpolates to
// the subject for the team-facing 3rd-person framing.

export const CANDOR_ITEMS: { id: string; axis: 'care' | 'challenge'; text: string; personalText?: string }[] = [
  { id: 'care_1', axis: 'care', text: '{name} genuinely cares about people as people, not just the work they produce.', personalText: '{name} genuinely cares about people as people, not just what they can get from them.' },
  { id: 'care_2', axis: 'care', text: '{name} takes time to understand what matters to others and what they care about.' },
  { id: 'care_3', axis: 'care', text: '{name} shows up for people when it counts, even when it costs something.' },
  { id: 'challenge_1', axis: 'challenge', text: '{name} says the hard thing directly rather than softening or avoiding it.' },
  { id: 'challenge_2', axis: 'challenge', text: '{name} gives honest, specific feedback even when it might be uncomfortable.', personalText: '{name} tells you the honest truth even when it might be uncomfortable.' },
  { id: 'challenge_3', axis: 'challenge', text: "{name} pushes back and challenges others when they disagree, instead of staying quiet." },
]

// itemId -> 1..9
export type CandorAnswers = Record<string, number>

// 1–9 scale, midpoint 5. care/challenge ≥5 = high. Returns the quadrant a
// (care, challenge) pair lands in.
export function candorQuadrant(care: number, challenge: number): { key: string; name: string } {
  const hiCare = care >= 5
  const hiChallenge = challenge >= 5
  if (hiCare && hiChallenge) return { key: 'radical_candor', name: 'Radical Candor' }
  if (hiCare && !hiChallenge) return { key: 'ruinous_empathy', name: 'Ruinous Empathy' }
  if (!hiCare && hiChallenge) return { key: 'obnoxious_aggression', name: 'Obnoxious Aggression' }
  return { key: 'manipulative_insincerity', name: 'Manipulative Insincerity' }
}
