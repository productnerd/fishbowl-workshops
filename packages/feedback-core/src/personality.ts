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
  reverse: boolean // reverse-keyed: scored 8 - raw
}

// 40 items, 1–7 agree/disagree, 8 per trait. Reverse-key pattern per trait is
// [F,F,R,R,F,R,F,R], so any prefix (the first 4 / 6 / 8) stays balanced — the
// depth slider takes the first N per trait via selectBigFiveItems().
export const BIG_FIVE_ITEMS: BigFiveItem[] = [
  { id: 'ocean_O1', trait: 'openness', reverse: false, text: 'I get a kick out of new ideas, even half-baked ones.' },
  { id: 'ocean_O2', trait: 'openness', reverse: false, text: 'A beautiful song or a clever bit of design can give me actual goosebumps.' },
  { id: 'ocean_O3', trait: 'openness', reverse: true, text: 'I prefer the tried-and-true over the experimental.' },
  { id: 'ocean_O4', trait: 'openness', reverse: true, text: "I'm a little suspicious of ideas that sound too clever." },
  { id: 'ocean_O5', trait: 'openness', reverse: false, text: 'I collect random interests the way some people collect browser tabs.' },
  { id: 'ocean_O6', trait: 'openness', reverse: true, text: 'Give me a clear recipe over a blank canvas any day.' },
  { id: 'ocean_O7', trait: 'openness', reverse: false, text: "I'll happily fall down a rabbit hole just to see where it ends." },
  { id: 'ocean_O8', trait: 'openness', reverse: true, text: 'Abstract, theoretical stuff makes my eyes glaze over.' },
  { id: 'ocean_C1', trait: 'conscientiousness', reverse: false, text: 'I finish what I start, even the boring parts.' },
  { id: 'ocean_C2', trait: 'conscientiousness', reverse: false, text: 'I like a plan and I like to stick to it.' },
  { id: 'ocean_C3', trait: 'conscientiousness', reverse: true, text: 'My desk (and my week) tends toward chaos.' },
  { id: 'ocean_C4', trait: 'conscientiousness', reverse: true, text: 'Deadlines are more of a gentle suggestion to me.' },
  { id: 'ocean_C5', trait: 'conscientiousness', reverse: false, text: "I make a list, and yes, I'll add things I've already done just to tick them." },
  { id: 'ocean_C6', trait: 'conscientiousness', reverse: true, text: "I'd rather wing it than over-prepare." },
  { id: 'ocean_C7', trait: 'conscientiousness', reverse: false, text: 'Future me always thanks past me for tidying up first.' },
  { id: 'ocean_C8', trait: 'conscientiousness', reverse: true, text: 'I lose track of the little details when things get busy.' },
  { id: 'ocean_E1', trait: 'extraversion', reverse: false, text: 'A room full of people leaves me energized, not drained.' },
  { id: 'ocean_E2', trait: 'extraversion', reverse: false, text: 'I think out loud and talk things through.' },
  { id: 'ocean_E3', trait: 'extraversion', reverse: true, text: 'After a big social day, I need to hide and recharge.' },
  { id: 'ocean_E4', trait: 'extraversion', reverse: true, text: "I'm happy to let other people kick off the conversation." },
  { id: 'ocean_E5', trait: 'extraversion', reverse: false, text: "I'm usually the one rounding people up for plans." },
  { id: 'ocean_E6', trait: 'extraversion', reverse: true, text: 'Too much socialising and I start eyeing the exit.' },
  { id: 'ocean_E7', trait: 'extraversion', reverse: false, text: "I'll strike up a chat with pretty much anyone." },
  { id: 'ocean_E8', trait: 'extraversion', reverse: true, text: 'I do my best thinking alone, in the quiet.' },
  { id: 'ocean_A1', trait: 'agreeableness', reverse: false, text: "I'd rather find the win-win than win the argument." },
  { id: 'ocean_A2', trait: 'agreeableness', reverse: false, text: 'I give people the benefit of the doubt by default.' },
  { id: 'ocean_A3', trait: 'agreeableness', reverse: true, text: "I'll bluntly say no when something's not worth it." },
  { id: 'ocean_A4', trait: 'agreeableness', reverse: true, text: "I'll tell you the hard truth even if it stings a bit." },
  { id: 'ocean_A5', trait: 'agreeableness', reverse: false, text: 'I go out of my way to smooth things over.' },
  { id: 'ocean_A6', trait: 'agreeableness', reverse: true, text: 'I can be pretty blunt when I think I am right.' },
  { id: 'ocean_A7', trait: 'agreeableness', reverse: false, text: 'I assume most people are doing their best.' },
  { id: 'ocean_A8', trait: 'agreeableness', reverse: true, text: 'Winning the point matters more to me than keeping the peace.' },
  { id: 'ocean_N1', trait: 'neuroticism', reverse: false, text: 'Small things can throw off my whole mood.' },
  { id: 'ocean_N2', trait: 'neuroticism', reverse: false, text: 'I replay stressful moments long after they pass.' },
  { id: 'ocean_N3', trait: 'neuroticism', reverse: true, text: 'I stay pretty unbothered when plans go sideways.' },
  { id: 'ocean_N4', trait: 'neuroticism', reverse: true, text: 'Pressure tends to sharpen me, not rattle me.' },
  { id: 'ocean_N5', trait: 'neuroticism', reverse: false, text: "I worry about things that probably won't even happen." },
  { id: 'ocean_N6', trait: 'neuroticism', reverse: true, text: 'Criticism rolls off me pretty easily.' },
  { id: 'ocean_N7', trait: 'neuroticism', reverse: false, text: 'My mood can swing on a single offhand comment.' },
  { id: 'ocean_N8', trait: 'neuroticism', reverse: true, text: 'I bounce back fast when things go wrong.' },
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

// The depth slider picks how many items per trait to ask (4 / 6 / 8). We take the
// first N of each trait (the reverse-key pattern keeps every prefix balanced) and
// interleave them round-robin so the quiz alternates traits instead of clustering.
export function selectBigFiveItems(perTrait: number): BigFiveItem[] {
  const n = Math.max(1, Math.min(Math.round(perTrait), 8))
  const cols = TRAIT_ORDER.map((t) => BIG_FIVE_ITEMS.filter((i) => i.trait === t).slice(0, n))
  const out: BigFiveItem[] = []
  for (let k = 0; k < n; k++) for (const col of cols) if (col[k]) out.push(col[k])
  return out
}

// Mean each trait's answered items (reverse → 8 − raw), map 1–7 → 0–100.
export function scoreBigFive(answers: Record<string, number>): BigFiveScores {
  const out = {} as Record<BigFiveTrait, number>
  for (const trait of TRAIT_ORDER) {
    const items = BIG_FIVE_ITEMS.filter((i) => i.trait === trait)
    const vals = items
      .map((i) => {
        const raw = answers[i.id]
        if (typeof raw !== 'number') return null
        return i.reverse ? 8 - raw : raw
      })
      .filter((v): v is number => v != null)
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 4
    out[trait] = Math.round(((mean - 1) / 6) * 100)
  }
  return { ...out, emotionalStability: 100 - out.neuroticism }
}

export interface MbtiType {
  type: string // 4-letter base, e.g. 'ENFP' (used to look up the archetype)
  fullCode: string // 5-part, e.g. 'ENFP-A' (Identity axis appended)
  identity: 'A' | 'T' // Assertive (calm) / Turbulent (sensitive), from emotional stability
  nickname: string // the archetype title, e.g. 'The Spark'
  flavour: string
  character: string // the fictional protagonist the archetype is matched to
  film: string
  alignment: 'hero' | 'villain' | 'anti-hero' | 'mentor'
  matchWhy: string // one line on how you and this character are alike
  signature: string[]
  axes: { EI: 'E' | 'I'; SN: 'S' | 'N'; TF: 'T' | 'F'; JP: 'J' | 'P'; AT: 'A' | 'T' }
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

// Per 4-letter code: an archetype (nickname + flavour) matched to a famous fictional
// protagonist from literature, film and animation, with a mostly-heroic mix. Signature is
// derived from letters. The character has a cut-out image at public/characters/<TYPE>.png.
type TypeMeta = {
  nickname: string
  flavour: string
  character: string
  film: string
  alignment: 'hero' | 'villain' | 'anti-hero' | 'mentor'
  matchWhy: string
}
const TYPE_META: Record<string, TypeMeta> = {
  ISTJ: { nickname: 'The Keeper of the Code', character: 'Carl Fredricksen', film: 'Up', alignment: 'hero', flavour: 'Keeps every promise to the letter, guards the routine like a treaty, and has already labelled the box before you thought to pack it.', matchWhy: 'Like Carl, you run on loyalty and kept promises: steady, dependable, and unmovable once you commit.' },
  ISFJ: { nickname: 'The Quiet Hearth', character: 'Samwise Gamgee', film: 'The Lord of the Rings', alignment: 'hero', flavour: 'Carries more than their share without a word, remembers what everyone else forgot, and absolutely will not leave you behind.', matchWhy: 'Like Sam, you quietly carry more than your share and never leave your people behind.' },
  INFJ: { nickname: 'The Quiet Storm', character: 'Jean Valjean', film: 'Les Misérables', alignment: 'hero', flavour: 'Runs on a private moral compass, does the quiet right thing when no one is watching, and would rather carry the weight than explain it.', matchWhy: 'You share his private moral compass: doing the quiet right thing without needing anyone to notice.' },
  INTJ: { nickname: 'The Grand Schemer', character: 'Lisbeth Salander', film: 'The Girl with the Dragon Tattoo', alignment: 'anti-hero', flavour: 'Maps the whole board in silence, trusts the data over the room, and has three moves planned while everyone else is still saying hello.', matchWhy: 'Like Lisbeth, you read the whole board in silence and trust the evidence over the room.' },
  ISTP: { nickname: 'The Improviser', character: 'Max Rockatansky', film: 'Mad Max: Fury Road', alignment: 'anti-hero', flavour: 'Says almost nothing, fixes it with whatever is lying around, and is halfway to a solution before the problem has finished being explained.', matchWhy: 'Like Max, you say little and fix it with whatever is on hand: all action, no speeches.' },
  ISFP: { nickname: 'The Free Spirit', character: 'Ponyo', film: 'Ponyo', alignment: 'hero', flavour: 'Follows the heart wherever it points, feels everything at full volume, and leaps first because the moment simply felt right.', matchWhy: 'Like Ponyo, you feel everything at full volume and leap when your heart says the moment is right.' },
  INFP: { nickname: 'The Daydream Believer', character: 'Amélie Poulain', film: 'Amélie', alignment: 'hero', flavour: 'Lives half in a daydream, engineers small anonymous kindnesses, and holds a private standard the ordinary world never quite meets.', matchWhy: 'You share her rich inner world and quiet, deliberate kindness done for its own sake.' },
  INTP: { nickname: 'The Daydreaming Brainiac', character: 'Ellie Sattler', film: 'Jurassic Park', alignment: 'hero', flavour: 'Reasons straight from the evidence, pokes every assumption to see what breaks, and is genuinely delighted when the model turns out wrong.', matchWhy: 'Like Ellie, you reason straight from evidence and are delighted, not defensive, when a better answer wins.' },
  ESTP: { nickname: 'The Charmer with a Catch', character: 'Long John Silver', film: 'Treasure Island', alignment: 'anti-hero', flavour: 'Charms the whole room, reads which way the wind is blowing, and adjusts allegiances the instant the situation rewards it.', matchWhy: 'You share his charm and quick read of the room, adapting fast the moment the situation shifts.' },
  ESFP: { nickname: 'The Showstopper', character: 'Kuzco', film: "The Emperor's New Groove", alignment: 'hero', flavour: 'Narrates their own life like a highlight reel, improvises through every setback, and turns even a full disaster into a bit.', matchWhy: 'Like Kuzco, you improvise through every setback and turn even a disaster into a good story.' },
  ENFP: { nickname: 'The Spark', character: 'Jack Sparrow', film: 'Pirates of the Caribbean', alignment: 'anti-hero', flavour: 'Talks their way out of anything, changes the plan mid-sentence, and lands on their feet through pure momentum and charm.', matchWhy: 'Like Jack, you change the plan mid-sentence and land on your feet through sheer momentum and charm.' },
  ENTP: { nickname: 'The Fast-Talking Wildcard', character: 'Tyrion Lannister', film: 'A Song of Ice and Fire', alignment: 'anti-hero', flavour: 'Has nine angles on everything and will happily argue all nine, wins the room with one line, and thinks best with an audience.', matchWhy: 'Like Tyrion, you see every angle, win the room with a line, and think best out loud.' },
  ESTJ: { nickname: 'The Captain of Order', character: 'Hank Schrader', film: 'Breaking Bad', alignment: 'hero', flavour: 'Takes command by default, says the blunt thing everyone was thinking, and refuses to accept that the rules are merely guidelines.', matchWhy: 'You share his instinct to take command and say the blunt, needed thing out loud.' },
  ESFJ: { nickname: 'The Heart That Holds It Together', character: 'Molly Weasley', film: 'Harry Potter', alignment: 'hero', flavour: 'Feeds everyone, remembers every birthday, holds the whole family together, and turns ferocious the moment you threaten one of them.', matchWhy: 'Like Molly, you hold everyone together and turn fierce the moment your people are threatened.' },
  ENFJ: { nickname: 'The Charming Operator', character: 'John Keating', film: 'Dead Poets Society', alignment: 'mentor', flavour: 'Sees the potential you keep hidden, rallies the room with a word, and makes you believe you were capable of it all along.', matchWhy: 'You share his gift for seeing hidden potential and making people believe they were capable all along.' },
  ENTJ: { nickname: 'The Throne-Taker', character: 'Miranda Priestly', film: 'The Devil Wears Prada', alignment: 'villain', flavour: 'Sets an impossible bar with one raised eyebrow, runs the whole operation three steps ahead, and is never impressed on the first try.', matchWhy: 'Like Miranda, you set an impossibly high bar and run the whole operation three steps ahead.' },
}

// ≥50 → high pole letter (exactly 50 rounds to the high pole: E, N, F, J, A).
// The 5th axis (Identity) maps from emotional stability: Assertive = calm/steady,
// Turbulent = sensitive/self-questioning.
export function deriveType(s: BigFiveScores): MbtiType {
  const EI = s.extraversion >= 50 ? 'E' : 'I'
  const SN = s.openness >= 50 ? 'N' : 'S'
  const TF = s.agreeableness >= 50 ? 'F' : 'T'
  const JP = s.conscientiousness >= 50 ? 'J' : 'P'
  const AT = s.emotionalStability >= 50 ? 'A' : 'T'
  const type = `${EI}${SN}${TF}${JP}`
  const meta: TypeMeta =
    TYPE_META[type] ?? { nickname: 'The Original', flavour: 'A blend all your own.', character: 'an original', film: '', alignment: 'hero', matchWhy: '' }
  return {
    type,
    fullCode: `${type}-${AT}`,
    identity: AT,
    nickname: meta.nickname,
    flavour: meta.flavour,
    character: meta.character,
    film: meta.film,
    alignment: meta.alignment,
    matchWhy: meta.matchWhy,
    signature: [POLE_WORD[EI], POLE_WORD[SN], POLE_WORD[TF]],
    axes: { EI, SN, TF, JP, AT },
  }
}

// The five 16Personalities-style dimensions, in display order. Each is a bipolar
// bar; `leftPct` is the percent toward the LEFT pole (the right pole = 100 − that).
export interface PersonalityAxis {
  key: 'mind' | 'energy' | 'nature' | 'tactics' | 'identity'
  title: string
  description: string
  left: string
  right: string
  leftInfo: string // what the left pole means
  rightInfo: string // what the right pole means
  leftPct: (s: BigFiveScores) => number
}

export const PERSONALITY_AXES: PersonalityAxis[] = [
  {
    key: 'mind',
    title: 'Mind',
    description: 'How you engage with the world around you.',
    left: 'Extraverted',
    right: 'Introverted',
    leftInfo: 'Energized by people and the buzz of the outside world. You think out loud and recharge in company.',
    rightInfo: 'Recharged by quiet, solo time. You go deep over wide and tend to think before you speak.',
    leftPct: (s) => s.extraversion,
  },
  {
    key: 'energy',
    title: 'Energy',
    description: 'Where you point your attention and mental energy.',
    left: 'Intuitive',
    right: 'Observant',
    leftInfo: 'Tuned to ideas, patterns and what could be. You read between the lines and chase possibilities.',
    rightInfo: 'Grounded in what is real and concrete. You trust facts, experience and what works right now.',
    leftPct: (s) => s.openness,
  },
  {
    key: 'nature',
    title: 'Nature',
    description: 'How you weigh decisions and handle feelings.',
    left: 'Thinking',
    right: 'Feeling',
    leftInfo: 'You lead with logic and fairness, keeping decisions consistent even when it stings.',
    rightInfo: 'You lead with empathy and values, weighing how a choice lands on the people involved.',
    leftPct: (s) => 100 - s.agreeableness,
  },
  {
    key: 'tactics',
    title: 'Tactics',
    description: 'How you approach work, planning and structure.',
    left: 'Judging',
    right: 'Prospecting',
    leftInfo: 'You like plans, structure and closure. You decide early and stick to the schedule.',
    rightInfo: 'You stay flexible and spontaneous, keeping options open and improvising as you go.',
    leftPct: (s) => s.conscientiousness,
  },
  {
    key: 'identity',
    title: 'Identity',
    description: 'How sure you feel about yourself and your choices.',
    left: 'Assertive',
    right: 'Turbulent',
    leftInfo: 'Calm, steady and self-assured. You shrug off stress and rarely sweat the small stuff.',
    rightInfo: 'Sensitive and self-aware, always pushing to improve. You feel stress more and care how things go.',
    leftPct: (s) => s.emotionalStability,
  },
]
