// Asset-free UI sounds via the Web Audio API. The AudioContext is created lazily on
// the first user gesture (autoplay policies), and everything silently no-ops if audio
// is unavailable.
//
// Two voices:
//   playQuizTick() — the main quiz flow (one tap per question). Picks a random note
//     from a pentatonic set so rapid answers feel varied yet always harmonize, like a
//     game. A soft bell with an octave shimmer.
//   playClick()    — every other UI interaction (taggers, sliders, tier/chip picks).
//     One distinct, lower, muted tock so it reads as clearly separate from the quiz.
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

// A soft bell blip at `freq` Hz (fundamental + a quieter octave shimmer). `at` delays
// the onset (seconds from now) so callers can stagger notes into a little melody.
function blip(freq: number, peak: number, dur: number, at = 0) {
  const c = audio()
  if (!c) return
  const t = c.currentTime + at
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  g.connect(c.destination)
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq * 0.94, t)
  o.frequency.exponentialRampToValueAtTime(freq, t + 0.05)
  o.connect(g)
  o.start(t)
  o.stop(t + dur + 0.02)
  // octave shimmer
  const o2 = c.createOscillator()
  const g2 = c.createGain()
  o2.type = 'sine'
  o2.frequency.setValueAtTime(freq * 2, t)
  g2.gain.setValueAtTime(0.0001, t)
  g2.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.006)
  g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.6)
  o2.connect(g2).connect(c.destination)
  o2.start(t)
  o2.stop(t + dur)
}

// C major pentatonic (C5 D5 E5 G5 A5) — any random pick sounds consonant.
const QUIZ_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0]

export function playQuizTick() {
  blip(QUIZ_NOTES[Math.floor(Math.random() * QUIZ_NOTES.length)], 0.05, 0.14)
}

// Ascending A scale (A4, B4, C5, D5, E5, F5, G5, A5, B5) — one note per scale
// position, climbing left to right. Far-left buttons sound the low A; each step right
// is the next note up. Covers scales up to 9 wide (VirtueSlider); a 5-wide Likert uses
// A..E.
const SCALE_NOTES = [440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77]

// Play the note for a 1-based scale position (1 = far left = low A, rising rightward).
export function playScaleNote(position: number) {
  const i = Math.max(0, Math.min(SCALE_NOTES.length - 1, Math.round(position) - 1))
  blip(SCALE_NOTES[i], 0.05, 0.14)
}

export function playClick() {
  const c = audio()
  if (!c) return
  const t = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(360, t)
  osc.frequency.exponentialRampToValueAtTime(240, t + 0.05)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.045, t + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.09)
}

// A short ascending three-note flourish (D5 -> G5 -> C6) for launching the
// self-assessment from the Start button: a confident "here we go" cue.
export function playStart() {
  blip(587.33, 0.055, 0.18)
  blip(783.99, 0.055, 0.2, 0.085)
  blip(1046.5, 0.06, 0.28, 0.17)
}

// A short noise burst through a bandpass filter — reads as a soft paper slip. Shared by
// playPaper (alone) and playTurn (layered under a low sweep).
function paperNoise(peak: number, decay: number, at = 0) {
  const c = audio()
  if (!c) return
  const t = c.currentTime + at
  const len = Math.ceil(c.sampleRate * 0.12)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.setValueAtTime(1800, t)
  bp.Q.setValueAtTime(0.8, t)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  src.connect(bp).connect(g).connect(c.destination)
  src.start(t)
  src.stop(t + 0.13)
}

// ── Report-deck entry sounds (see lib/motion.ts). All quiet, warm, one per slide max. ──

// The payoff chime: G5 rising to D6, same bell voice as the quiz ticks. Fired at a
// drumroll reveal moment; used on at most a couple of slides in the whole deck.
export function playChime() {
  blip(783.99, 0.05, 0.22)
  blip(1174.66, 0.04, 0.3, 0.09)
}

// A soft paper slip, for skeuomorphic objects settling (the letter, the sticky note).
export function playPaper() {
  paperNoise(0.035, 0.12)
}

// A soft major-third dyad (G4 + B4) that blooms rather than strikes: the warm act's
// single emotional cue.
export function playWarm() {
  const c = audio()
  if (!c) return
  const t = c.currentTime
  for (const [freq, peak] of [[392, 0.04], [493.88, 0.03]] as const) {
    const at = freq === 392 ? 0 : 0.02
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t + at)
    g.gain.exponentialRampToValueAtTime(peak, t + at + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.35)
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(freq, t + at)
    o.connect(g).connect(c.destination)
    o.start(t + at)
    o.stop(t + at + 0.37)
  }
}

// A muted page turn for the chapter covers: playClick's shape moved down and stretched,
// with a whisper of paper noise on top.
export function playTurn() {
  const c = audio()
  if (!c) return
  const t = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(240, t)
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.16)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.04, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.17)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.18)
  paperNoise(0.025, 0.06)
}

// Back-compat: existing imports of playTick are non-quiz UI interactions.
export const playTick = playClick
