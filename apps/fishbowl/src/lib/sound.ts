// A subtle, asset-free "tick" played when the user makes a selection. Generated
// with the Web Audio API (a short triangle blip with a quick pitch rise + fast
// decay). The AudioContext is created lazily on the first click (a user gesture),
// so autoplay policies don't block it. Silently no-ops if audio is unavailable.
let ctx: AudioContext | null = null

export function playTick() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(620, t)
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.035)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.12)
  } catch {
    /* no audio available */
  }
}
