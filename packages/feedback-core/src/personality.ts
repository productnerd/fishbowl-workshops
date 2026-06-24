// Big Five (OCEAN) self-assessment + a derived MBTI-style type card.
// The Big Five is the empirically validated backbone; the 4-letter type is a
// playful Big-Five→MBTI approximation (omits Neuroticism) — fun, not science.
// Shared by the client (self-assessment flow) and any edge fn that needs the type.

export type BigFiveTrait =
  | 'openness'
  | 'conscientiousness'
  | 'extraversion'
  | 'agreeableness'
  | 'neuroticism'

export interface BigFiveItem {
  id: string // e.g. 'ocean_O1'
  trait: BigFiveTrait
  text: string
  reverse: boolean // reverse-keyed: scored 6 - raw
}

// 15 items, 1–5 agree/disagree, 3 per trait, one reverse-keyed (R) per trait.
export const BIG_FIVE_ITEMS: BigFiveItem[] = [
  { id: 'ocean_O1', trait: 'openness', reverse: false, text: 'I get a kick out of new ideas, even half-baked ones.' },
  { id: 'ocean_O2', trait: 'openness', reverse: false, text: "I'd rather invent a new way than use the proven one." },
  { id: 'ocean_O3', trait: 'openness', reverse: true, text: 'I prefer the tried-and-true over the experimental.' },
  { id: 'ocean_C1', trait: 'conscientiousness', reverse: false, text: 'I finish what I start, even the boring parts.' },
  { id: 'ocean_C2', trait: 'conscientiousness', reverse: false, text: 'I like a plan and I like to stick to it.' },
  { id: 'ocean_C3', trait: 'conscientiousness', reverse: true, text: 'My desk (and my week) tends toward chaos.' },
  { id: 'ocean_E1', trait: 'extraversion', reverse: false, text: 'A room full of people leaves me energized, not drained.' },
  { id: 'ocean_E2', trait: 'extraversion', reverse: false, text: 'I think out loud and talk things through.' },
  { id: 'ocean_E3', trait: 'extraversion', reverse: true, text: 'After a big social day, I need to hide and recharge.' },
  { id: 'ocean_A1', trait: 'agreeableness', reverse: false, text: "I'd rather find the win-win than win the argument." },
  { id: 'ocean_A2', trait: 'agreeableness', reverse: false, text: 'I give people the benefit of the doubt by default.' },
  { id: 'ocean_A3', trait: 'agreeableness', reverse: true, text: "I'll bluntly say no when something's not worth it." },
  { id: 'ocean_N1', trait: 'neuroticism', reverse: false, text: 'Small things can throw off my whole mood.' },
  { id: 'ocean_N2', trait: 'neuroticism', reverse: false, text: 'I replay stressful moments long after they pass.' },
  { id: 'ocean_N3', trait: 'neuroticism', reverse: true, text: 'I stay pretty unbothered when plans go sideways.' },
]

// 0–100 per trait. emotionalStability = 100 − neuroticism (the friendly framing).
export interface BigFiveScores {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
  emotionalStability: number
}

// Both pole labels per trait, for the dials.
export const TRAIT_POLES: Record<BigFiveTrait, { low: string; high: string }> = {
  openness: { low: 'Grounded', high: 'Curious' },
  conscientiousness: { low: 'Easygoing', high: 'Organized' },
  extraversion: { low: 'Reserved', high: 'Outgoing' },
  agreeableness: { low: 'Frank', high: 'Warm' },
  neuroticism: { low: 'Sensitive', high: 'Calm' }, // displayed as Emotional Stability (high = calm)
}

const TRAIT_ORDER: BigFiveTrait[] = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'neuroticism',
]

// Mean each trait's 3 items (reverse → 6 − raw), map 1–5 → 0–100.
export function scoreBigFive(answers: Record<string, number>): BigFiveScores {
  const out = {} as Record<BigFiveTrait, number>
  for (const trait of TRAIT_ORDER) {
    const items = BIG_FIVE_ITEMS.filter((i) => i.trait === trait)
    const vals = items
      .map((i) => {
        const raw = answers[i.id]
        if (typeof raw !== 'number') return null
        return i.reverse ? 6 - raw : raw
      })
      .filter((v): v is number => v != null)
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 3
    out[trait] = Math.round(((mean - 1) / 4) * 100)
  }
  return { ...out, emotionalStability: 100 - out.neuroticism }
}

export interface MbtiType {
  type: string // e.g. 'ENFP'
  nickname: string
  flavour: string
  signature: string[]
  axes: { EI: 'E' | 'I'; SN: 'S' | 'N'; TF: 'T' | 'F'; JP: 'J' | 'P' }
}

// Pole words used for the signature chips.
const POLE_WORD: Record<string, string> = {
  E: 'Outgoing',
  I: 'Reserved',
  N: 'Curious',
  S: 'Grounded',
  F: 'Warm',
  T: 'Frank',
  J: 'Organized',
  P: 'Easygoing',
}

// nickname + one-line flavour per 4-letter code (signature is derived from letters).
const TYPE_META: Record<string, { nickname: string; flavour: string }> = {
  ISTJ: { nickname: 'The Bedrock', flavour: "Quietly dependable — says what they'll do, then does it." },
  ISFJ: { nickname: 'The Guardian', flavour: 'Looks after the details and the people, without being asked.' },
  INFJ: { nickname: 'The Compass', flavour: 'Reads the room and points it somewhere that matters.' },
  INTJ: { nickname: 'The Architect', flavour: 'Plays the long game — builds the plan three moves ahead.' },
  ISTP: { nickname: 'The Fixer', flavour: 'Calm under the hood; solves it while others are still debating.' },
  ISFP: { nickname: 'The Maker', flavour: 'Quietly creative — shows care through craft, not noise.' },
  INFP: { nickname: 'The Idealist', flavour: 'Guided by values; quietly set on a better way.' },
  INTP: { nickname: 'The Theorist', flavour: 'Lives in ideas — pokes holes until the logic holds.' },
  ESTP: { nickname: 'The Dynamo', flavour: "Acts first, adapts fast — thrives when it's live." },
  ESFP: { nickname: 'The Entertainer', flavour: 'Brings the energy and makes the work feel lighter.' },
  ENFP: { nickname: 'The Spark', flavour: 'Ideas and enthusiasm on tap — lifts the whole room.' },
  ENTP: { nickname: 'The Provocateur', flavour: 'Loves the debate; finds the angle no one else saw.' },
  ESTJ: { nickname: 'The Operator', flavour: 'Takes charge, sets the plan, drives it home.' },
  ESFJ: { nickname: 'The Host', flavour: 'Keeps people connected and things on track.' },
  ENFJ: { nickname: 'The Mentor', flavour: 'Brings people with them toward something bigger.' },
  ENTJ: { nickname: 'The Commander', flavour: 'Sees the goal, rallies the team, and goes.' },
}

// ≥50 → high pole letter (exactly 50 rounds to the high pole: E, N, F, J).
// Mapping omits Neuroticism by design (it has no MBTI axis).
export function deriveType(s: BigFiveScores): MbtiType {
  const EI = s.extraversion >= 50 ? 'E' : 'I'
  const SN = s.openness >= 50 ? 'N' : 'S'
  const TF = s.agreeableness >= 50 ? 'F' : 'T'
  const JP = s.conscientiousness >= 50 ? 'J' : 'P'
  const type = `${EI}${SN}${TF}${JP}`
  const meta = TYPE_META[type] ?? { nickname: 'The Original', flavour: 'A blend all your own.' }
  return {
    type,
    nickname: meta.nickname,
    flavour: meta.flavour,
    signature: [POLE_WORD[EI], POLE_WORD[SN], POLE_WORD[TF]],
    axes: { EI, SN, TF, JP },
  }
}
