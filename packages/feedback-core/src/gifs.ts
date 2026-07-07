// Reaction GIFs: an optional layer of delight the report AI can sprinkle onto
// text-heavy, emotional slides. The AI appends a token {{gif:NAME}} to an eligible
// field; the client validates the name against this vocabulary, strips the token from
// the prose, and renders public/gifs/NAME.gif. One per slide, capped per report.
//
// This file is mirrored verbatim into each edge function that builds a prompt
// (supabase/functions/*/gifs.ts); a parity test keeps the copies in sync.

export type GifCategory = 'warm' | 'playful' | 'growth' | 'hype'
export type GifReaction = { name: string; when: string; category: GifCategory }

export const GIF_REACTIONS: GifReaction[] = [
  // hype
  { name: 'excitement', when: 'Opening the report or hitting the first big positive beat, setting an energized celebratory tone.', category: 'hype' },
  { name: 'drumroll', when: 'The suspense beat right before the archetype reveal or headline lands.', category: 'hype' },
  { name: 'ta_da', when: "The archetype reveal or 'this is you' headline pays off with a sparkle of arrival.", category: 'hype' },
  { name: 'confetti', when: "A milestone or the closing 'look how far you have come' moment worth a joyful burst.", category: 'hype' },
  // warm
  { name: 'high_five', when: "A concrete win or teammate shout-out; a peer-to-peer 'we did this together' celebration.", category: 'warm' },
  { name: 'blow_kiss', when: 'Closing the heartfelt team letter on an affectionate, grateful note.', category: 'warm' },
  { name: 'standing_ovation', when: "The team letter's closing line lands; full-hearted applause for the whole person.", category: 'warm' },
  { name: 'warm_hug', when: 'A tender, comforting moment where the team wraps the reader in belonging and support.', category: 'warm' },
  { name: 'heart_hands', when: "A pure love-and-gratitude beat that says 'the team adores you.'", category: 'warm' },
  { name: 'happy_tears', when: 'A deeply moving line in the team letter that makes the reader feel genuinely seen.', category: 'warm' },
  // playful
  { name: 'mock_angry', when: "A gentle growth watch-out framed with love; a comedic 'okay, we need to talk' that stays teasing and kind.", category: 'playful' },
  { name: 'wink', when: 'A cheeky, knowing aside; pairs with a self-aware tip or an inside-joke observation from the team.', category: 'playful' },
  { name: 'chefs_kiss', when: "Punctuating a standout strength or perfectly-put praise; 'that, right there, is great.'", category: 'playful' },
  { name: 'facepalm', when: "Comedic self-recognition on a relatable watch-out; the kindly-framed 'oh no, that IS me' moment.", category: 'playful' },
  { name: 'mind_blown', when: 'A surprising insight or reveal that genuinely reframes how the team sees them.', category: 'playful' },
  // playful, extra helping (cheeky + witty)
  { name: 'mic_drop', when: 'A bold, perfectly-landed truth or standout point; the confident "boom, done" flourish.', category: 'playful' },
  { name: 'slow_clap', when: 'A well-played moment; a building, tongue-in-cheek round of applause for a clever move.', category: 'playful' },
  { name: 'eye_roll', when: 'An affectionate, playful eye-roll at an endearing and very predictable habit.', category: 'playful' },
  { name: 'smirk', when: 'A knowing, self-satisfied little smirk; a cheeky "you know exactly what you did".', category: 'playful' },
  { name: 'finger_guns', when: 'A cheeky finger-guns "hey, you"; smooth, self-assured charm on a strength.', category: 'playful' },
  { name: 'sunglasses', when: 'An effortlessly-cool shades drop; a witty "deal with it" flex on something they pull off easily.', category: 'playful' },
  { name: 'popcorn', when: 'Grabbing the popcorn to watch it all unfold; a witty "ooh, this is getting good".', category: 'playful' },
  { name: 'sip_tea', when: 'A cheeky observational aside sipped over tea; a playful "just saying" about a pattern.', category: 'playful' },
  { name: 'plot_twist', when: 'A witty reframe or unexpected-trait reveal; the dramatic "plot twist!" beat.', category: 'playful' },
  { name: 'shrug', when: 'A wry, playful "what can you do" shrug; light acceptance of a lovable quirk.', category: 'playful' },
  // growth
  { name: 'you_got_this', when: 'Kicking off the action plan or a growth goal; a confident nod that says the reader is ready.', category: 'growth' },
  { name: 'deep_breath', when: 'Right before a heavier watch-out; signals pause, reset, and read this with calm.', category: 'growth' },
  { name: 'note_to_self', when: 'A concrete action tip worth remembering; miming writing it down so the takeaway sticks.', category: 'growth' },
  { name: 'chin_up', when: 'After a tough watch-out, reassuring that one habit does not define them.', category: 'growth' },
  { name: 'playful_side_eye', when: 'A tiny teasing callout of a recurring habit; a knowing side-glance that stays warm, never judgmental.', category: 'growth' },
]

export const GIF_NAMES: string[] = GIF_REACTIONS.map((g) => g.name)
export const MAX_GIFS_PER_REPORT = 10

// A well-formed, valid token (closed braces, non-empty name). Case-insensitive so a model
// that types {{GIF:...}} still resolves.
const GIF_TOKEN = /\{\{\s*gif\s*:\s*([a-zA-Z0-9_]+)\s*\}\}/i
// A token wrapped in *italic* or **bold** delimiters: strip the delimiters WITH the token
// so a rule-breaking model can never leave orphaned asterisks behind. \1 keeps them matched.
const GIF_WRAPPED = /(\*{1,2})\s*\{\{\s*gif\s*:\s*[a-zA-Z0-9_]*\s*\}{0,2}\s*\1/gi
// Any remaining token, deliberately lenient: case-insensitive, empty name, or even a missing
// closing brace, so a malformed token can never leak as literal text (the name stays [\w] so
// it never eats trailing prose).
const GIF_TOKEN_G = /\{\{\s*gif\s*:\s*[a-zA-Z0-9_]*\s*\}{0,2}/gi

// The first VALID gif token in a text (its name must be in the vocabulary), else null.
export function firstGifToken(text: string | null | undefined): string | null {
  if (!text) return null
  const m = text.match(GIF_TOKEN)
  if (!m) return null
  const name = m[1].toLowerCase()
  return GIF_NAMES.includes(name) ? name : null
}

// Remove every gif token (valid, unknown, or malformed, wrapped in emphasis or not) from
// display text and tidy the leftover spacing, so a token never leaks as literal characters
// even on fields we do not render a gif for. Fast path: token-free prose (every field today)
// is returned untouched, so this can never alter normal text.
export function stripGifTokens(text: string | null | undefined): string {
  if (!text) return ''
  if (!text.includes('{{')) return text
  return text
    .replace(GIF_WRAPPED, '')
    .replace(GIF_TOKEN_G, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,!?;:])/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

// Two visual variants per emotion live on disk as <name>_1.gif and <name>_2.gif, so the
// same feeling can appear at most twice in a report but NEVER as the identical file.
export const VARIANTS_PER_GIF = 2

// Given [key, rawText] slots in deck order, pick the first valid gif token per slot and hand
// back the concrete file to render (<emotion>_<variant>). Rules, all deterministic regardless
// of render/navigation order: one gif per slot, the same emotion at most VARIANTS_PER_GIF
// times (each time a different variant, so no file ever repeats), and at most `max` gifs in
// the whole report. Only slots that earned a gif appear in the result.
export function allocateGifs(
  slots: Array<[string, string | null | undefined]>,
  max: number = MAX_GIFS_PER_REPORT
): Record<string, string> {
  const out: Record<string, string> = {}
  const usedPerEmotion: Record<string, number> = {}
  let total = 0
  for (const [key, text] of slots) {
    if (total >= max) break
    const emotion = firstGifToken(text)
    if (!emotion) continue
    const used = usedPerEmotion[emotion] ?? 0
    if (used >= VARIANTS_PER_GIF) continue // both variants of this emotion already spent
    const variant = used + 1
    out[key] = `${emotion}_${variant}`
    usedPerEmotion[emotion] = variant
    total++
  }
  return out
}

// The instruction block appended to a report AI prompt. `eligibleFields` names the
// specific output fields that may carry a gif token in that function.
export function gifPromptBlock(eligibleFields: string): string {
  const list = GIF_REACTIONS.map((g) => `  - ${g.name}: ${g.when}`).join('\n')
  return `
=== REACTION GIFS (optional delight, used SPARINGLY) ===
You MAY punctuate a TEXT-HEAVY, emotional moment with ONE reaction GIF by appending the token {{gif:NAME}} to the END of an eligible field's text. Eligible fields: ${eligibleFields}.
Choose NAME ONLY from this exact list (never invent, rename, or approximate a name):
${list}
NO APPROPRIATE GIF? THEN ADD NONE. This is the default. Only reach for a gif when one on the list lands EXACTLY on the feeling of the moment. A forced, generic, or loosely-related gif is far worse than no gif, so if you are unsure, add nothing. Most fields should carry no gif at all; a whole report should feel special because gifs are rare, not sprinkled everywhere.
Other rules: at most ONE gif per field. Prefer the warm and hype gifs; use the playful and growth ones sparingly and gently so a watch-out never reads as mockery. Keep it kind and human. Never place a gif inside **bold** or *italic*; put it at the very end of the field, or right after a paragraph break.
`
}
