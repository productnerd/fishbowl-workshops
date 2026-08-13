// Config-driven survey composition.
//
// A topic is a SAVED CONFIGURATION over a bank of modules we own and validate. It never
// introduces new code. Trainers compose, reword, reorder and extend within a module; they
// cannot invent a scored construct, because nothing would aggregate it and no slide could
// draw it. See docs/workshops-architecture.md.
import type { Question } from './types'

/** A framework unit we own and validate. Topics select these; they never define one. */
export interface ModuleSpec {
  key: string
  name: string
  /** The ids this module owns in the question bank. */
  questionIds: number[]
  /**
   * Whether a trainer may add new items. True when the module scores generically over a
   * list, so one more item just joins the mean (another virtue, another energy statement).
   * False when the instrument is fixed: the six thinking hats are six.
   */
  extensible: boolean
  /** Slide types this module can feed. A report slide is only valid if it is listed here. */
  slides: string[]
}

/** Trainer rewording. Anything absent falls back to the question bank. */
export interface QuestionOverride {
  text?: string
  section?: string
  sectionDescription?: string
}

/** A module as one topic uses it: which of its questions are in, and how they are worded. */
export interface ModuleUse {
  key: string
  exclude?: number[]
  overrides?: Record<number, QuestionOverride>
}

/**
 * Who is answering, relative to the subject. Replaces v1's two fixed lenses.
 * `minN` is the anonymity guard: below it, this persona's answers still count toward the
 * pooled read but never render as their own column.
 */
export interface PersonaSpec {
  key: string
  label: string
  minN: number
  exclude?: number[]
  overrides?: Record<number, QuestionOverride>
}

/** How long the survey runs. The modules listed are the ones asked at that length. */
export interface LengthSpec {
  key: string
  label: string
  modules: string[]
}

export interface TopicConfig {
  key: string
  name: string
  modules: ModuleUse[]
  personas: PersonaSpec[]
  lengths: LengthSpec[]
  /** Presentation order by question id. Anything missing falls to the end, in module order. */
  order: number[]
  thresholds: { minResponses: number; minPerPersona: number }
}

const applyOverride = (q: Question, o: QuestionOverride, name: string): Question => ({
  ...q,
  text: (o.text ?? q.text).replace(/\{name\}/g, name),
  section: o.section ?? q.section,
  sectionDescription: (o.sectionDescription ?? q.sectionDescription).replace(/\{name\}/g, name),
})

/**
 * Build one respondent's survey from a topic config. This is the config-driven replacement
 * for v1's hardcoded `getSurvey`: module inclusion replaces the pool sets, persona excludes
 * replace WORK_ONLY, and persona overrides replace the personal-lens wording tables.
 */
export function resolveSurvey(opts: {
  topic: TopicConfig
  modules: ModuleSpec[]
  bank: Question[]
  persona: string
  length: string
  name: string
  hasResponsibilities: boolean
}): Question[] {
  const { topic, modules, bank, name, hasResponsibilities } = opts

  const persona = topic.personas.find((p) => p.key === opts.persona)
  if (!persona) throw new Error(`unknown persona: ${opts.persona}`)
  const length = topic.lengths.find((l) => l.key === opts.length)
  if (!length) throw new Error(`unknown length: ${opts.length}`)

  const specs = new Map(modules.map((m) => [m.key, m]))
  const included = new Set(length.modules)
  const droppedByPersona = new Set(persona.exclude ?? [])
  const byId = new Map(bank.map((q) => [q.id, q]))

  const out: Question[] = []
  for (const use of topic.modules) {
    if (!included.has(use.key)) continue
    const spec = specs.get(use.key)
    if (!spec) throw new Error(`unknown module: ${use.key}`)

    const droppedByTopic = new Set(use.exclude ?? [])
    for (const id of spec.questionIds) {
      if (droppedByTopic.has(id) || droppedByPersona.has(id)) continue
      const q = byId.get(id)
      if (!q) continue
      // The subject writes their own responsibilities; with none listed there is nothing to rate.
      if (q.type === 'responsibilities' && !hasResponsibilities) continue
      // Persona wording wins over topic wording.
      out.push(applyOverride(q, { ...use.overrides?.[id], ...persona.overrides?.[id] }, name))
    }
  }

  const rank = (id: number) => {
    const i = topic.order.indexOf(id)
    return i === -1 ? topic.order.length : i
  }
  return out.sort((a, b) => rank(a.id) - rank(b.id))
}
