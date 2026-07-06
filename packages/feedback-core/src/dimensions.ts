// A three-orientation trait read (how you think / engage / apply yourself) layered on top
// of the Big Five. Each of the 12 dimensions is scored from a mix of REUSED Big Five items
// and a handful of new dimension-specific items, the Big Five core is untouched.
//
// Items are answered on the same 1 to 7 self scale. Scoring mirrors scoreBigFive:
// reverse then 8 minus raw, then mean then (mean minus 1) / 6 times 100.
import { BIG_FIVE_ITEMS } from './personality'

export type Orientation = 'cognitive' | 'interpersonal' | 'motivational'

export interface OrientationMeta {
  key: Orientation
  title: string
  tagline: string
  color: string // mid shade (accent)
  colorLight: string // low scores
  colorDark: string // high scores
}

export const ORIENTATIONS: OrientationMeta[] = [
  { key: 'cognitive', title: 'How You Prefer to Think', tagline: 'Your approach to thinking and solving problems.', color: '#1366ac', colorLight: '#8fb9dd', colorDark: '#0c3a63' },
  { key: 'interpersonal', title: 'How You Engage with Others', tagline: 'How you naturally relate to the people around you.', color: '#a83f6f', colorLight: '#e6a9c3', colorDark: '#6b2544' },
  { key: 'motivational', title: 'How You Apply Yourself', tagline: 'How you set goals, cope with setbacks, and drive forward.', color: '#b8892a', colorLight: '#dcbf7a', colorDark: '#765414' },
]

// Level → shade: the depth of colour signals how strongly the dimension applies
// (light = low, mid = moderate, dark = high). No words, just the shade.
export function shadeFor(o: OrientationMeta, score: number): string {
  return score >= 70 ? o.colorDark : score >= 40 ? o.color : o.colorLight
}

// The new, original items (asked after the Big Five block). Answered 1–7, reverse = 8−raw.
export interface DimensionItem {
  id: string
  text: string
  reverse: boolean
}

export const DIMENSION_ITEMS: DimensionItem[] = [
  { id: 'dim_delib_logic', reverse: false, text: 'I like to lay the logic out step by step before I commit to a call.' },
  { id: 'dim_delib_impartial', reverse: false, text: 'I set my own feelings aside and weigh the facts on their merits.' },
  { id: 'dim_conceptual', reverse: false, text: 'I enjoy turning a messy problem into a clean model or framework.' },
  { id: 'dim_empathy', reverse: false, text: "I pick up on how someone's really feeling before they say a word." },
  { id: 'dim_lead_charge', reverse: false, text: "When a group's drifting with no plan, I'm the one who steps up and steers." },
  { id: 'dim_lead_bar', reverse: false, text: 'I hold the people around me to a high bar.' },
  { id: 'dim_auto_accountable', reverse: false, text: 'When something goes wrong on my watch, I own it rather than blame circumstances.' },
  { id: 'dim_auto_internal', reverse: false, text: "My drive comes from inside, I don't need someone standing over me." },
  { id: 'dim_flex_agile', reverse: false, text: 'When the plan changes last minute, I switch gears without missing a beat.' },
  { id: 'dim_flex_growth', reverse: false, text: 'I go looking for ways to stretch and improve, even when things are fine.' },
  { id: 'dim_determined', reverse: false, text: 'I go after what I want head-on instead of waiting for it to come to me.' },
]

// Each dimension: which items feed it, and whether each is reversed RELATIVE TO THIS
// dimension (agreeing means LESS of it). Big Five item ids are reused here with the sign
// that matches the dimension, independent of their Big Five keying.
export interface Dimension {
  key: string
  label: string
  orientation: Orientation
  blurb: string // shown at a high score
  items: { id: string; reverse: boolean }[]
}

export const DIMENSIONS: Dimension[] = [
  // ── Cognitive ── (blurbs are neutral descriptors; the % + band carry the level)
  { key: 'creative', label: 'Creative', orientation: 'cognitive', blurb: 'Creative thinking, comfort with the unknown, doing things your own way.', items: [
    { id: 'ocean_O1', reverse: false }, { id: 'ocean_O5', reverse: false }, { id: 'ocean_O7', reverse: false }, { id: 'ocean_O6', reverse: true } ] },
  { key: 'deliberative', label: 'Deliberative', orientation: 'cognitive', blurb: 'Logic, method, and objectivity when reaching decisions.', items: [
    { id: 'dim_delib_logic', reverse: false }, { id: 'dim_delib_impartial', reverse: false }, { id: 'ocean_C2', reverse: false } ] },
  { key: 'detailed', label: 'Detailed & Reliable', orientation: 'cognitive', blurb: 'Dependability, planning, and attention to detail.', items: [
    { id: 'ocean_C1', reverse: false }, { id: 'ocean_C7', reverse: false }, { id: 'ocean_C3', reverse: true }, { id: 'ocean_C8', reverse: true } ] },
  { key: 'conceptual', label: 'Conceptual', orientation: 'cognitive', blurb: 'Abstract, theoretical thinking using models and ideas.', items: [
    { id: 'dim_conceptual', reverse: false }, { id: 'ocean_O7', reverse: false }, { id: 'ocean_O8', reverse: true } ] },

  // ── Interpersonal ──
  { key: 'extraverted', label: 'Extraverted', orientation: 'interpersonal', blurb: 'Energy from people, social activity, and being in the mix.', items: [
    { id: 'ocean_E1', reverse: false }, { id: 'ocean_E5', reverse: false }, { id: 'ocean_E7', reverse: false }, { id: 'ocean_E3', reverse: true }, { id: 'ocean_E6', reverse: true } ] },
  { key: 'tough', label: 'Tough', orientation: 'interpersonal', blurb: 'Directness, candour, and willingness to challenge.', items: [
    { id: 'ocean_A3', reverse: false }, { id: 'ocean_A4', reverse: false }, { id: 'ocean_A6', reverse: false }, { id: 'ocean_A8', reverse: false }, { id: 'ocean_A1', reverse: true } ] },
  { key: 'nurturing', label: 'Nurturing', orientation: 'interpersonal', blurb: "Sensitivity to others' needs, feelings, and tendencies.", items: [
    { id: 'dim_empathy', reverse: false }, { id: 'ocean_A5', reverse: false }, { id: 'ocean_A2', reverse: false }, { id: 'ocean_A7', reverse: false } ] },
  { key: 'leadership', label: 'Leadership', orientation: 'interpersonal', blurb: 'Taking charge, motivating others, and setting a high bar.', items: [
    { id: 'dim_lead_charge', reverse: false }, { id: 'dim_lead_bar', reverse: false }, { id: 'ocean_E5', reverse: false } ] },

  // ── Motivational ──
  { key: 'composed', label: 'Composed', orientation: 'motivational', blurb: 'Staying calm, confident, and controlled under pressure.', items: [
    { id: 'ocean_N3', reverse: false }, { id: 'ocean_N4', reverse: false }, { id: 'ocean_N6', reverse: false }, { id: 'ocean_N8', reverse: false }, { id: 'ocean_N2', reverse: true } ] },
  { key: 'autonomous', label: 'Autonomous', orientation: 'motivational', blurb: 'Independence, self-motivation, and accountability.', items: [
    { id: 'dim_auto_accountable', reverse: false }, { id: 'dim_auto_internal', reverse: false } ] },
  { key: 'flexible', label: 'Flexible', orientation: 'motivational', blurb: 'Adaptability, agility, and openness to growth.', items: [
    { id: 'dim_flex_agile', reverse: false }, { id: 'dim_flex_growth', reverse: false }, { id: 'ocean_N3', reverse: false } ] },
  { key: 'determined', label: 'Determined', orientation: 'motivational', blurb: 'Ambition, persistence, and drive to get things done.', items: [
    { id: 'dim_determined', reverse: false }, { id: 'ocean_C1', reverse: false } ] },
]

export interface DimensionScore {
  key: string
  label: string
  orientation: Orientation
  blurb: string
  score: number // 0–100, or null-ish 50 default when no items answered
  band: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High'
  answered: number // how many of its items had a response (for a confidence hint)
}

const bandOf = (s: number): DimensionScore['band'] =>
  s >= 80 ? 'Very High' : s >= 60 ? 'High' : s >= 40 ? 'Moderate' : s >= 20 ? 'Low' : 'Very Low'

// Score all 12 dimensions from the raw 1–7 answers (Big Five + dimension items pooled).
export function scoreDimensions(answers: Record<string, number>): DimensionScore[] {
  return DIMENSIONS.map((d) => {
    const vals = d.items
      .map((it) => {
        const raw = answers[it.id]
        if (typeof raw !== 'number') return null
        return it.reverse ? 8 - raw : raw
      })
      .filter((v): v is number => v != null)
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 4
    const score = Math.round(((mean - 1) / 6) * 100)
    return { key: d.key, label: d.label, orientation: d.orientation, blurb: d.blurb, score, band: bandOf(score), answered: vals.length }
  })
}

// The person's OWN strongest statement behind a dimension's score: the item (from the
// Big Five or dimension pool) that pulled hardest on this dimension, with whether they
// agreed with it or pushed back. This is the honest "what you actually said" for a score.
export function dimensionEvidence(
  key: string,
  answers: Record<string, number>
): { text: string; lean: 'agreed with' | 'pushed back on' } | null {
  const dim = DIMENSIONS.find((d) => d.key === key)
  if (!dim) return null
  let best: { text: string; adj: number; raw: number } | null = null
  for (const it of dim.items) {
    const raw = answers[it.id]
    if (typeof raw !== 'number') continue
    const adj = it.reverse ? 8 - raw : raw // higher = more of this dimension
    const src = DIMENSION_ITEMS.find((i) => i.id === it.id) ?? BIG_FIVE_ITEMS.find((i) => i.id === it.id)
    if (!src) continue
    // The item that leans furthest from neutral (4) in the dimension's direction.
    if (!best || Math.abs(adj - 4) > Math.abs(best.adj - 4)) best = { text: src.text, adj, raw }
  }
  if (!best) return null
  // Lean is about their stance on the STATEMENT (raw), not the dimension-adjusted value.
  return { text: best.text, lean: best.raw >= 4 ? 'agreed with' : 'pushed back on' }
}
