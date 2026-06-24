// Jungian / brand archetypes (Mark & Pearson, 12). DERIVED, never asked: we read
// the archetype from how you and your team already answered (Big Five + the virtue
// means), so the label is earned, not self-claimed. A fun narrative lens, not a test.
import type { BigFiveScores } from './personality'

export interface Archetype {
  key: string
  name: string
  essence: string
  cardTemplate: string // {name} interpolated at render
}

export const ARCHETYPES: Record<string, Archetype> = {
  sage: { key: 'sage', name: 'The Sage', essence: 'Seeks the truth before the verdict.', cardTemplate: '{name} wants the truth before the verdict — reads the docs, asks the sharp question, and is usually right.' },
  creator: { key: 'creator', name: 'The Creator', essence: 'Builds and invents what did not exist.', cardTemplate: "{name} can't help but build — the originator of the idea, happiest making something new and real." },
  explorer: { key: 'explorer', name: 'The Explorer', essence: 'Finds the new path.', cardTemplate: '{name} is happiest scouting the new path — curious, independent, always a step ahead of the map.' },
  magician: { key: 'magician', name: 'The Magician', essence: 'Turns the vague into the real.', cardTemplate: '{name} turns the vague into the real — makes things happen that others had quietly written off.' },
  hero: { key: 'hero', name: 'The Hero', essence: 'Runs at the hard problem.', cardTemplate: '{name} runs at the hard problem and drags the win back — courage you can count on under pressure.' },
  outlaw: { key: 'outlaw', name: 'The Outlaw', essence: 'Questions the rules everyone accepts.', cardTemplate: '{name} questions the rules everyone else accepts — disruptive, and sometimes exactly what was needed.' },
  ruler: { key: 'ruler', name: 'The Ruler', essence: 'Brings order and direction.', cardTemplate: '{name} brings order and direction — takes the wheel, sets the plan, and steadies the ship.' },
  caregiver: { key: 'caregiver', name: 'The Caregiver', essence: 'Looks out for the team.', cardTemplate: '{name} looks out for the team — quick to help, quicker to notice who needs it.' },
  lover: { key: 'lover', name: 'The Lover', essence: 'Builds real connection.', cardTemplate: '{name} builds real bonds — work feels warmer and more human with them in the room.' },
  everyman: { key: 'everyman', name: 'The Everyman', essence: 'The steady, no-airs presence.', cardTemplate: '{name} is the steady, no-airs presence who makes everyone feel they belong.' },
  jester: { key: 'jester', name: 'The Jester', essence: 'Keeps it light when it counts.', cardTemplate: '{name} keeps it light when it counts — the levity that makes the hard stretches bearable.' },
  innocent: { key: 'innocent', name: 'The Innocent', essence: 'Keeps it simple and hopeful.', cardTemplate: '{name} keeps it simple and hopeful — believes it can work, and makes you believe it too.' },
}

// Transparent weight map: archetype -> { signal: weight }. Signals are normalized
// to roughly −1..1 (Big Five around 50; virtue means around the mean of 5).
const SIGNALS: Record<string, Record<string, number>> = {
  sage: { O: 1.0, rigor: 0.8, candor: 0.6 },
  creator: { O: 1.2, drive: 0.5, E: -0.2 },
  explorer: { O: 0.9, courage: 0.7, A: -0.5 },
  magician: { O: 0.8, confidence: 0.7, drive: 0.6 },
  hero: { courage: 1.0, drive: 0.8, confidence: 0.6 },
  outlaw: { courage: 0.7, candor: 0.8, receptiveness: -0.6 },
  ruler: { C: 1.0, decisiveness: 0.7, confidence: 0.6, drive: 0.5 },
  caregiver: { A: 1.0, generosity: 0.9, receptiveness: 0.6 },
  lover: { A: 0.8, E: 0.7, generosity: 0.6 },
  everyman: { A: 0.8, collaboration: 0.8, confidence: -0.5 },
  jester: { E: 1.0, O: 0.5, rigor: -0.6 },
  innocent: { A: 0.7, ES: 0.8, composure: 0.6 },
}

export interface ArchetypeResult extends Archetype {
  runnerUp: string
  fromSelf: boolean
}

// Blend: self Big Five (when present) + team virtue means. Either alone still works.
export function deriveArchetype(
  bigFive: BigFiveScores | null,
  virtueMeans: Record<string, number> | null
): ArchetypeResult | null {
  if (!bigFive && !virtueMeans) return null
  const sig: Record<string, number> = {}
  if (bigFive) {
    sig.O = (bigFive.openness - 50) / 50
    sig.C = (bigFive.conscientiousness - 50) / 50
    sig.E = (bigFive.extraversion - 50) / 50
    sig.A = (bigFive.agreeableness - 50) / 50
    sig.ES = (bigFive.emotionalStability - 50) / 50
  }
  if (virtueMeans) for (const [k, v] of Object.entries(virtueMeans)) sig[k] = (v - 5) / 4

  const scores = Object.entries(SIGNALS)
    .map(([key, weights]) => {
      let s = 0
      for (const [sk, w] of Object.entries(weights)) s += (sig[sk] ?? 0) * w
      return { key, s }
    })
    .sort((a, b) => b.s - a.s)

  return { ...ARCHETYPES[scores[0].key], runnerUp: ARCHETYPES[scores[1].key].name, fromSelf: Boolean(bigFive) }
}
