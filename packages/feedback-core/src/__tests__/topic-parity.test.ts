// The P0 gate.
//
// v1's survey is hardcoded in `data/questions.ts` (skip lists, lens wording tables, pool
// sets, a fixed order). TOPIC_WORK claims to express all of that purely as configuration.
// This proves it: for every persona and every length, the config-driven resolver must return
// exactly what v1's getSurvey returns, question for question, word for word.
//
// If this test cannot be made to pass, the module boundaries are wrong and we want to know
// that before a builder UI is built on top of them.
// v1-survey.json was emitted from the hardcoded getSurvey BEFORE it was rewritten over the
// resolver, so it is a genuine record of v1 behaviour rather than a restatement of the new
// code. Do not regenerate it: if a change makes it fail, that change alters the v1 survey.
import { describe, it, expect } from 'vitest'
import { questions } from '../../../../apps/fishbowl/src/data/questions'
import { resolveSurvey } from '../topic'
import { MODULES, TOPICS, TOPIC_WORK } from '../topics'
import v1 from './fixtures/v1-survey.json'

const NAME = 'Alex'
const DEPTHS = ['quick', 'standard', 'full']
const PERSONAS = ['work', 'personal']

const fromConfig = (persona: string, length: string, hasResponsibilities: boolean) =>
  resolveSurvey({
    topic: TOPIC_WORK,
    modules: MODULES,
    bank: questions,
    persona,
    length,
    name: NAME,
    hasResponsibilities,
  })

describe('TOPIC_WORK reproduces the v1 survey from config', () => {
  for (const persona of PERSONAS) {
    for (const depth of DEPTHS) {
      for (const hasResponsibilities of [true, false]) {
        it(`matches v1 exactly: ${persona} / ${depth} / responsibilities=${hasResponsibilities}`, () => {
          const expected = (v1 as Record<string, unknown[]>)[`${persona}|${depth}|${hasResponsibilities}`]
          expect(expected, 'fixture case is missing').toBeDefined()
          const actual = fromConfig(persona, depth, hasResponsibilities).map((q) => ({
            id: q.id,
            text: q.text,
            section: q.section,
            sectionDescription: q.sectionDescription,
          }))
          expect(actual).toEqual(expected)
        })
      }
    }
  }
})

describe.each(TOPICS)('topic integrity: $key', (topic) => {
  it('uses only modules that exist in the registry', () => {
    const known = new Set(MODULES.map((m) => m.key))
    for (const use of topic.modules) expect(known).toContain(use.key)
  })

  it('includes at each length only modules the topic uses', () => {
    const used = new Set(topic.modules.map((m) => m.key))
    for (const len of topic.lengths) for (const key of len.modules) expect(used).toContain(key)
  })

  it('excludes only ids the module it names actually owns', () => {
    const owned = new Map(MODULES.map((m) => [m.key, new Set(m.questionIds)]))
    for (const use of topic.modules) for (const id of use.exclude ?? []) expect(owned.get(use.key)).toContain(id)
  })

  it('resolves to a non-empty survey for every persona and length', () => {
    for (const persona of topic.personas) {
      for (const len of topic.lengths) {
        const qs = resolveSurvey({
          topic,
          modules: MODULES,
          bank: questions,
          persona: persona.key,
          length: len.key,
          name: NAME,
          hasResponsibilities: true,
        })
        expect(qs.length, `${persona.key}/${len.key} resolved to nothing`).toBeGreaterThan(0)
        // Nothing may reach a respondent with the placeholder still in it.
        for (const q of qs) expect(q.text).not.toContain('{name}')
      }
    }
  })

  it('stays within the 40 question pricing ceiling', () => {
    for (const persona of topic.personas) {
      for (const len of topic.lengths) {
        const n = resolveSurvey({
          topic,
          modules: MODULES,
          bank: questions,
          persona: persona.key,
          length: len.key,
          name: NAME,
          hasResponsibilities: true,
        }).length
        expect(n, `${persona.key}/${len.key} has ${n} questions`).toBeLessThanOrEqual(40)
      }
    }
  })

  it('ships a safe default minN on every persona', () => {
    for (const p of topic.personas) expect(p.minN).toBe(2)
  })
})

describe('registry integrity', () => {
  it('claims no question id that is not in the bank', () => {
    const bank = new Set(questions.map((q) => q.id))
    for (const m of MODULES) for (const id of m.questionIds) expect(bank).toContain(id)
  })

  it('assigns every question in the bank to exactly one module', () => {
    const owners = new Map<number, string[]>()
    for (const m of MODULES) for (const id of m.questionIds) owners.set(id, [...(owners.get(id) ?? []), m.key])
    for (const q of questions) expect(owners.get(q.id) ?? []).toHaveLength(1)
  })

  // minN is configurable rather than a hard floor: a trainer may deliberately expose a
  // single-manager column. What we guarantee is that the shipped default is the safe one,
  // so a trainer who never touches it gets per-persona anonymity for free.
  it('ships a safe default minN on every persona', () => {
    for (const p of TOPIC_WORK.personas) expect(p.minN).toBe(2)
  })
})
