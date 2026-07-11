// The merged "which words describe them" pick. Johari (how they show up) and Nohari
// (watch-outs) are collapsed into ONE grid so a respondent picks adjectives once instead
// of across three separate decks. Picks are split back into the existing johari / nohari
// answer buckets by which source list each word belongs to (the two lists share no
// words), so the report and AI aggregation stay exactly as they were.
import { JOHARI_ADJECTIVES } from './johari'
import { WEAKNESSES } from './weaknesses'

export const ADJECTIVE_MIN = 5
export const ADJECTIVE_MAX = 14
// Per-group caps: up to 8 "how they show up", up to 6 watch-outs — so nobody piles on 14
// flattering words. Keys must match the ADJECTIVE_OPTIONS group names below.
export const ADJECTIVE_GROUP_MAX: Record<string, number> = {
  'How they show up': 8,
  'Watch-outs (meant kindly)': 6,
}

export const ADJECTIVE_OPTIONS: { id: string; label: string; group: string }[] = [
  ...JOHARI_ADJECTIVES.map((w) => ({ id: w, label: w, group: 'How they show up' })),
  ...WEAKNESSES.map((w) => ({ id: w, label: w, group: 'Watch-outs (meant kindly)' })),
]

const JOHARI_SET = new Set<string>(JOHARI_ADJECTIVES)

// Route a combined selection back into the two legacy buckets.
export function splitAdjectives(picks: string[]): { johari: string[]; nohari: string[] } {
  const johari: string[] = []
  const nohari: string[] = []
  for (const w of picks) (JOHARI_SET.has(w) ? johari : nohari).push(w)
  return { johari, nohari }
}
