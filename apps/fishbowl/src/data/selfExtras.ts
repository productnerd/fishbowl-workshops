// Self-only "deeper read" question banks + scoring. These feed new report slides
// (values, motivation, career fit, love language, conflict repair, life satisfaction)
// and are never asked of colleagues, so they live apart from the shared `questions`
// contract in questions.ts. The ids/keys here are the storage contract for
// self_payload.{values,motivation,riasec,love,conflict,lifesat} — don't rename them
// without migrating stored reads.

export interface Opt {
  id: string
  label: string
}

// ── Values (Schwartz basic values, in plain language). Pick top 3, then the one
// you care least about — the two poles give "what moves you" and "what won't". ──
export const VALUE_OPTIONS: Opt[] = [
  { id: 'autonomy', label: 'Freedom to do things my own way' },
  { id: 'stimulation', label: 'New experiences and a challenge' },
  { id: 'enjoyment', label: 'Enjoying life and having fun' },
  { id: 'mastery', label: 'Being excellent at what I do' },
  { id: 'recognition', label: 'Influence and recognition' },
  { id: 'security', label: 'Security and stability' },
  { id: 'tradition', label: "Tradition and doing what's expected" },
  { id: 'loyalty', label: 'Loyalty to the people close to me' },
  { id: 'fairness', label: 'Fairness and care for everyone' },
]
export const VALUES_PICK = 3

// ── Motivation: where you sit on the intrinsic ↔ extrinsic spectrum. Two items per
// pole; higher agreement on intrinsic items and lower on extrinsic pushes you toward
// the intrinsic (inner-driven) end. ──
export const MOTIVATION_ITEMS: { id: string; pole: 'intrinsic' | 'extrinsic'; text: string }[] = [
  { id: 'intr_work', pole: 'intrinsic', text: 'The work itself is the reward.' },
  { id: 'extr_reco', pole: 'extrinsic', text: "I do my best when there's recognition or a title on the line." },
  { id: 'intr_noticed', pole: 'intrinsic', text: "I'd keep doing my work even if no one noticed." },
  { id: 'extr_pressure', pole: 'extrinsic', text: 'Outside pressure and deadlines are what get me moving.' },
]

// 0..100, higher = more intrinsic. Each item is 1..5. Returns null until all answered.
export function motivationScore(a: Record<string, number>): number | null {
  const answered = MOTIVATION_ITEMS.every((m) => typeof a[m.id] === 'number')
  if (!answered) return null
  const mean = (pole: 'intrinsic' | 'extrinsic') => {
    const xs = MOTIVATION_ITEMS.filter((m) => m.pole === pole)
    return xs.reduce((s, m) => s + a[m.id], 0) / xs.length
  }
  const diff = mean('intrinsic') - mean('extrinsic') // -4..4
  return Math.round(50 + (diff / 4) * 50) // 0..100
}

// ── Career fit (Holland's RIASEC). Pick the 3 work-flavors most like you → a
// three-letter code; the flavors you didn't pick hint at what would drain you. ──
export const RIASEC_OPTIONS: { id: string; label: string; name: string }[] = [
  { id: 'R', label: 'Building or fixing tangible things', name: 'Realistic' },
  { id: 'I', label: 'Digging into problems and analysis', name: 'Investigative' },
  { id: 'A', label: 'Creating and designing', name: 'Artistic' },
  { id: 'S', label: 'Helping and developing people', name: 'Social' },
  { id: 'E', label: 'Leading, pitching, persuading', name: 'Enterprising' },
  { id: 'C', label: 'Organizing systems and getting details right', name: 'Conventional' },
]
export const RIASEC_PICK = 3

// ── Love language. Asked twice on purpose: how you SHOW care and how you FEEL cared
// for are often different, and the gap is the insight. ──
export const LOVE_OPTIONS: Opt[] = [
  { id: 'acts', label: 'Doing things for them' },
  { id: 'words', label: 'Saying it out loud' },
  { id: 'time', label: 'Time and full attention' },
  { id: 'presence', label: 'Showing up, physical closeness' },
  { id: 'gifts', label: 'Small gifts and tokens' },
]

// ── Conflict repair + needs (deepens the existing conflict scenario). ──
export const CONFLICT_REPAIR: Opt[] = [
  { id: 'talk', label: 'A direct talk that names what happened' },
  { id: 'space', label: 'Space first, then talk' },
  { id: 'gesture', label: 'A gesture: a coffee, a joke, a small act' },
  { id: 'apology_plan', label: "An apology and a plan so it doesn't repeat" },
  { id: 'move_on', label: 'We just move on, no big talk needed' },
]
export const CONFLICT_NEED: Opt[] = [
  { id: 'heard', label: 'To be heard, not fixed' },
  { id: 'straight', label: 'Straight talk, no tiptoeing' },
  { id: 'cool', label: 'A minute to cool down' },
  { id: 'reassurance', label: "Reassurance we're still okay" },
  { id: 'solve', label: 'To solve it now and move on' },
]
export const CONFLICT_WORSE: Opt[] = [
  { id: 'rushed', label: 'Being rushed' },
  { id: 'vague', label: 'Vagueness' },
  { id: 'raised', label: 'Raised voices' },
  { id: 'placated', label: 'Being managed or placated' },
  { id: 'public', label: 'A public callout' },
]

// ── Life satisfaction (a short SWLS) + where you feel most alive right now. ──
export const LIFESAT_ITEMS: { id: string; text: string }[] = [
  { id: 'ideal', text: "In most ways, my life is close to what I'd want it to be." },
  { id: 'satisfied', text: "I'm satisfied with where I am right now." },
  { id: 'again', text: "If I lived it over, I'd change little." },
]
export const ALIVE_OPTIONS: Opt[] = [
  { id: 'work', label: 'Work' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'health', label: 'Health' },
  { id: 'growth', label: 'Growth' },
  { id: 'play', label: 'Play' },
]

// 0..10 (one decimal) from the three 1..5 items. Returns null until all answered.
export function lifeSatScore(a: Record<string, number>): number | null {
  const answered = LIFESAT_ITEMS.every((i) => typeof a[i.id] === 'number')
  if (!answered) return null
  const mean = LIFESAT_ITEMS.reduce((s, i) => s + a[i.id], 0) / LIFESAT_ITEMS.length // 1..5
  return Math.round(((mean - 1) / 4) * 100) / 10 // 0..10
}
