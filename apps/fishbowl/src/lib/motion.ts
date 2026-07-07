// The report deck's shared motion language. Every slide picks one preset (Slide.motion in
// Results.tsx, default 'rise'); the single AnimatePresence wrapper applies it as variants,
// and framer propagates the hidden/show labels to any descendant motion element that
// declares `variants` without its own `animate` (how staggered rows, gauge sweeps and ink
// draws opt in per component). The exit is ONE global recipe, much subtler than any entry:
// wrapper-only, 160ms, accelerating away, no spring, no scale, no sound.
import type { Variants, Transition } from 'framer-motion'

export type MotionPreset = 'rise' | 'pop' | 'stagger' | 'ink' | 'drumroll' | 'tilt' | 'gauge' | 'wash' | 'veil'

const EXIT = { opacity: 0, y: -10, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } as Transition }

const riseEase: Transition['ease'] = [0.22, 0.9, 0.3, 1]

export const PRESETS: Record<MotionPreset, Variants> = {
  // A classy decelerating rise; the deck default for text-forward slides.
  rise: {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: riseEase } },
    exit: EXIT,
  },
  // Playful spring with ~2% overshoot for hero-object slides (one thing IS the slide).
  pop: {
    hidden: { opacity: 0, scale: 0.92, y: 14 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 22, mass: 0.9 } },
    exit: EXIT,
  },
  // Rise, then cascade the rowItem children (ranked/listed content). Cap ~6 animated
  // children per slide; group the rest into one final child.
  stagger: {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: riseEase, staggerChildren: 0.06, delayChildren: 0.12 } },
    exit: EXIT,
  },
  // Rise, while SVG children draw themselves on (drawPath / chartShape / chartDot below).
  ink: {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: riseEase } },
    exit: EXIT,
  },
  // Rise, while the heroReveal child holds 300ms then springs in (the payoff number).
  drumroll: {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: riseEase, staggerChildren: 0.06, delayChildren: 0.15 } },
    exit: EXIT,
  },
  // Paper laid down on a desk: settles from a slight tilt. A component's own baked-in CSS
  // rotation (the letter's -1.2deg) remains the resting pose because this lives on the
  // wrapper.
  tilt: {
    hidden: { opacity: 0, y: 22, rotate: 2.5 },
    show: { opacity: 1, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
    exit: EXIT,
  },
  // Rise + row cascade; dial/bar indicators additionally sweep via dialSweep/barSweep.
  gauge: {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: riseEase, staggerChildren: 0.06, delayChildren: 0.12 } },
    exit: EXIT,
  },
  // Chapter covers: a full-bleed colour wash that settles (children rise via coverChild).
  wash: {
    hidden: { opacity: 0, scale: 1.04 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: EXIT,
  },
  // Pure fade, zero transform: the reduced-motion stand-in for everything, and the natural
  // preset for tall scroll containers (the full read), where transforms read as wobble.
  veil: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.25, ease: 'linear' } },
    exit: { opacity: 0, transition: { duration: 0.12 } },
  },
}

// ── Shared child variants (components import these; no local orchestration) ──

// One row in a staggered list: timing comes from the parent's staggerChildren.
export const rowItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
}

// The payoff element on a drumroll slide: holds 300ms, then springs in with overshoot.
export const heroReveal: Variants = {
  hidden: { opacity: 0, scale: 0.7 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 18, delay: 0.3 } },
}

// An SVG stroke drawing itself on (ink coming down on paper).
export const drawPath: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: { pathLength: 1, opacity: 1, transition: { duration: 0.55, ease: [0.65, 0, 0.35, 1], delay: 0.15 } },
}

// A filled chart shape (radar polygon) growing from the chart centre.
export const chartShape: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: [0.65, 0, 0.35, 1], delay: 0.15 } },
}

// A data dot popping in after its shape has landed. Pass an index via `custom` to ripple.
export const chartDot: Variants = {
  hidden: { opacity: 0, scale: 0 },
  show: (i: number = 0) => ({ opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut', delay: 0.45 + i * 0.04 } }),
}

// A donut dial sweeping to its value: pass the target strokeDashoffset via `custom`
// (the hidden state is the full circumference, i.e. empty).
export const dialSweep = (circumference: number): Variants => ({
  hidden: { strokeDashoffset: circumference },
  show: (off: number) => ({ strokeDashoffset: off, transition: { type: 'spring', stiffness: 60, damping: 14 } }),
})

// A slow analog glide for a needle/marker sliding to its value: pass target x via custom.
export const needleSlide: Variants = {
  hidden: { opacity: 0 },
  show: (x: number) => ({ opacity: 1, x: 0, cx: x, transition: { type: 'spring', stiffness: 80, damping: 16, delay: 0.15 } }),
}

// Chapter-cover children: kicker, then title, then line (pass 0 / 1 / 2 via custom).
export const coverChild: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.42, ease: riseEase, delay: 0.12 + i * 0.1 } }),
}
