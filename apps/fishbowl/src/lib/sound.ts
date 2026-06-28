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

// A soft bell blip at `freq` Hz (fundamental + a quieter octave shimmer).
function blip(freq: number, peak: number, dur: number) {
  const c = audio()
  if (!c) return
  const t = c.currentTime
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

// Back-compat: existing imports of playTick are non-quiz UI interactions.
export const playTick = playClick
