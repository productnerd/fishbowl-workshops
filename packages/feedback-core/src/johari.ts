// Johari Window (Luft & Ingham). The subject picks adjectives that describe
// themselves; colleagues pick adjectives for the subject. Quadrants are derived
// at view time: Open (both), Blind Spot (team only), Hidden (self only),
// Unknown (neither). Only aggregate per-adjective counts ever surface.

export const JOHARI_ADJECTIVES: string[] = [
  'able',
  'accepting',
  'adaptable',
  'bold',
  'brave',
  'calm',
  'caring',
  'cheerful',
  'clever',
  'complex',
  'confident',
  'dependable',
  'dignified',
  'empathetic',
  'energetic',
  'extroverted',
  'friendly',
  'giving',
  'happy',
  'helpful',
  'idealistic',
  'independent',
  'ingenious',
  'intelligent',
  'introverted',
  'kind',
  'knowledgeable',
  'logical',
  'loving',
  'mature',
  'modest',
  'nervous',
  'observant',
  'organized',
  'patient',
  'powerful',
  'proud',
  'quiet',
  'reflective',
  'relaxed',
  'religious',
  'responsive',
  'searching',
  'self-assertive',
  'self-conscious',
  'sensible',
  'sentimental',
  'shy',
  'silly',
  'smart',
  'spontaneous',
  'sympathetic',
  'tense',
  'trustworthy',
  'warm',
  'wise',
]

// Soft floor 5 / hard cap 10 picks per respondent.
export const JOHARI_MIN = 5
export const JOHARI_MAX = 10

// Partition the subject's self-picks against the team-picked adjectives:
//   Open   = self ∩ team
//   Blind  = team ∖ self
//   Hidden = self ∖ team
export function johariQuadrants(
  self: string[],
  teamPicked: string[],
): { open: string[]; blind: string[]; hidden: string[] } {
  const selfSet = new Set(self)
  const teamSet = new Set(teamPicked)
  return {
    open: teamPicked.filter((w) => selfSet.has(w)),
    blind: teamPicked.filter((w) => !selfSet.has(w)),
    hidden: self.filter((w) => !teamSet.has(w)),
  }
}
