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

// 40 items, 1–5 agree/disagree, 8 per trait. Reverse-key pattern per trait is
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

// Mean each trait's answered items (reverse → 6 − raw), map 1–5 → 0–100.
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
  type: string // 4-letter base, e.g. 'ENFP' (used to look up the archetype)
  fullCode: string // 5-part, e.g. 'ENFP-A' (Identity axis appended)
  identity: 'A' | 'T' // Assertive (calm) / Turbulent (sensitive), from emotional stability
  nickname: string // the archetype title, e.g. 'The Spark'
  flavour: string
  character: string // the Disney muse the archetype is inspired by
  film: string
  alignment: 'hero' | 'villain' | 'anti-hero' | 'mentor'
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

// Per 4-letter code: an archetype (nickname + flavour) inspired by an iconic Disney
// character, with a healthy mix of heroes and villains. Signature is derived from
// letters. The Disney character is the muse; no image is rendered.
type TypeMeta = {
  nickname: string
  flavour: string
  character: string
  film: string
  alignment: 'hero' | 'villain' | 'anti-hero' | 'mentor'
}
const TYPE_META: Record<string, TypeMeta> = {
  ISTJ: { nickname: 'The Keeper of the Code', character: 'Mufasa', film: 'The Lion King', alignment: 'mentor', flavour: 'Knows the rules, wrote half of them, and will calmly remind you the Circle of Life has a deadline.' },
  ISFJ: { nickname: 'The Quiet Hearth', character: 'Mrs. Potts', film: 'Beauty and the Beast', alignment: 'hero', flavour: 'Has already noticed you skipped lunch, fixed the thing nobody else saw, and asked for zero credit.' },
  INFJ: { nickname: 'The Quiet Storm', character: 'Elsa', film: 'Frozen', alignment: 'hero', flavour: 'Says very little, feels absolutely everything, and is somehow already three steps into the right decision.' },
  INTJ: { nickname: 'The Grand Schemer', character: 'Jafar', film: 'Aladdin', alignment: 'villain', flavour: 'Will out-plan you in silence, then act shocked that everyone else only brought one move.' },
  ISTP: { nickname: 'The Improviser', character: 'Tarzan', film: 'Tarzan', alignment: 'hero', flavour: 'Says almost nothing, then solves the problem with his hands while everyone else is still reading the manual.' },
  ISFP: { nickname: 'The Free Spirit', character: 'Pocahontas', film: 'Pocahontas', alignment: 'hero', flavour: 'Quietly fearless, allergic to fences, and following an inner compass that points wherever the river goes.' },
  INFP: { nickname: 'The Daydream Believer', character: 'Belle', film: 'Beauty and the Beast', alignment: 'hero', flavour: 'Would rather lose herself in a book than win an argument, yet quietly refuses to settle for the provincial option.' },
  INTP: { nickname: 'The Daydreaming Brainiac', character: 'Milo Thatch', film: 'Atlantis: The Lost Empire', alignment: 'hero', flavour: 'Has a wild theory, twelve footnotes, and zero interest in whether the meeting could have been an email.' },
  ESTP: { nickname: 'The Charmer with a Catch', character: 'Gaston', film: 'Beauty and the Beast', alignment: 'villain', flavour: 'Confident, loud, weirdly good at the room, and operating entirely in his own interest with a wink.' },
  ESFP: { nickname: 'The Showstopper', character: 'Aladdin', film: 'Aladdin', alignment: 'hero', flavour: 'Lives entirely in the moment, charms his way out of every scrape, and somehow makes the chaos look choreographed.' },
  ENFP: { nickname: 'The Spark', character: 'Rapunzel', film: 'Tangled', alignment: 'hero', flavour: 'Bursts in with seventeen new ideas, adopts everyone within five minutes, and ditches the plan the second something shinier floats by.' },
  ENTP: { nickname: 'The Fast-Talking Wildcard', character: 'Hades', film: 'Hercules', alignment: 'villain', flavour: 'Has nine angles on everything and will gladly argue all nine, sometimes against himself, for fun.' },
  ESTJ: { nickname: 'The Captain of Order', character: 'Captain Hook', film: 'Peter Pan', alignment: 'villain', flavour: 'Loves a chain of command, a tidy plan, and absolutely will not be told the schedule is merely a suggestion.' },
  ESFJ: { nickname: 'The Heart That Holds It Together', character: 'Cinderella', film: 'Cinderella', alignment: 'hero', flavour: 'Keeps the whole household running on grace and goodwill, charming mice and royalty with equal ease.' },
  ENFJ: { nickname: 'The Charming Operator', character: 'Hans', film: 'Frozen', alignment: 'villain', flavour: 'Reads the room flawlessly, remembers your birthday, and is absolutely up to something behind that smile.' },
  ENTJ: { nickname: 'The Throne-Taker', character: 'Scar', film: 'The Lion King', alignment: 'villain', flavour: 'Already drafted the reorg, the new org chart, and the speech where everyone pretends to be surprised.' },
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
    TYPE_META[type] ?? { nickname: 'The Original', flavour: 'A blend all your own.', character: 'an original', film: '', alignment: 'hero' }
  return {
    type,
    fullCode: `${type}-${AT}`,
    identity: AT,
    nickname: meta.nickname,
    flavour: meta.flavour,
    character: meta.character,
    film: meta.film,
    alignment: meta.alignment,
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
  leftPct: (s: BigFiveScores) => number
}

export const PERSONALITY_AXES: PersonalityAxis[] = [
  { key: 'mind', title: 'Mind', description: 'How you engage with the world around you.', left: 'Extraverted', right: 'Introverted', leftPct: (s) => s.extraversion },
  { key: 'energy', title: 'Energy', description: 'Where you point your attention and mental energy.', left: 'Intuitive', right: 'Observant', leftPct: (s) => s.openness },
  { key: 'nature', title: 'Nature', description: 'How you weigh decisions and handle feelings.', left: 'Thinking', right: 'Feeling', leftPct: (s) => 100 - s.agreeableness },
  { key: 'tactics', title: 'Tactics', description: 'How you approach work, planning and structure.', left: 'Judging', right: 'Prospecting', leftPct: (s) => s.conscientiousness },
  { key: 'identity', title: 'Identity', description: 'How sure you feel about yourself and your choices.', left: 'Assertive', right: 'Turbulent', leftPct: (s) => s.emotionalStability },
]
